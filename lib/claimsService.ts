import { Db } from 'mongodb';

export interface ClaimAssignment {
  _id?: string;
  claimId: string;
  userId: string;
  assignedAt: Date;
  status: 'assigned' | 'in_queue';
  claimLimit?: number;
}

export interface UserClaimsLoad {
  userId: string;
  assignedClaimsCount: number;
  claimLimit: number;
}

export async function initializeClaimsSystem(db: Db): Promise<void> {
  // Create collections if they don't exist
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  if (!collectionNames.includes('claim_assignments')) {
    await db.createCollection('claim_assignments');
    await db.collection('claim_assignments').createIndex({ claimId: 1 }, { unique: true });
    await db.collection('claim_assignments').createIndex({ userId: 1 });
    await db.collection('claim_assignments').createIndex({ status: 1 });
  }

  if (!collectionNames.includes('user_claim_limits')) {
    await db.createCollection('user_claim_limits');
    await db.collection('user_claim_limits').createIndex({ userId: 1 }, { unique: true });
  }

  if (!collectionNames.includes('claim_queue')) {
    await db.createCollection('claim_queue');
    await db.collection('claim_queue').createIndex({ claimId: 1 }, { unique: true });
    await db.collection('claim_queue').createIndex({ createdAt: 1 });
  }
}

export async function setUserClaimLimit(
  db: Db,
  userId: string,
  limit: number
): Promise<void> {
  await initializeClaimsSystem(db);
  
  const limitsCollection = db.collection('user_claim_limits');
  await limitsCollection.updateOne(
    { userId },
    {
      $set: {
        userId,
        claimLimit: limit,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function getUserClaimLimit(db: Db, userId: string): Promise<number> {
  await initializeClaimsSystem(db);
  
  const limitsCollection = db.collection('user_claim_limits');
  const record = await limitsCollection.findOne({ userId });
  if (record !== null && record.claimLimit !== undefined) {
    return record.claimLimit;
  }
  return getGlobalClaimLimit(db);
}

export async function getAssignedClaimsCount(db: Db, userId: string): Promise<number> {
  await initializeClaimsSystem(db);
  
  const assignmentsCollection = db.collection('claim_assignments');
  return assignmentsCollection.countDocuments({
    userId,
    status: 'assigned',
  });
}

export async function getUserClaimsLoad(db: Db, userId: string): Promise<UserClaimsLoad> {
  await initializeClaimsSystem(db);
  
  const assignedCount = await getAssignedClaimsCount(db, userId);
  const limit = await getUserClaimLimit(db, userId);

  return {
    userId,
    assignedClaimsCount: assignedCount,
    claimLimit: limit,
  };
}

export async function assignClaimToUser(
  db: Db,
  claimId: string,
  userId: string
): Promise<boolean> {
  await initializeClaimsSystem(db);
  
  const assignmentsCollection = db.collection('claim_assignments');
  const limitsCollection = db.collection('user_claim_limits');

  // Get user's current load and limit
  const userLoad = await getUserClaimsLoad(db, userId);
  const userLimit = await getUserClaimLimit(db, userId);

  // Check if user has capacity and has cleared all existing claims (0 active)
  if (userLoad.assignedClaimsCount === 0 && userLoad.assignedClaimsCount < userLimit) {
    // Assign directly to user
    await assignmentsCollection.insertOne({
      claimId,
      userId,
      assignedAt: new Date(),
      status: 'assigned',
    });
    return true;
  } else {
    // Add to queue
    await addClaimToQueue(db, claimId);
    return false;
  }
}

export async function addClaimToQueue(db: Db, claimId: string): Promise<void> {
  await initializeClaimsSystem(db);
  
  const queueCollection = db.collection('claim_queue');
  await queueCollection.insertOne({
    claimId,
    createdAt: new Date(),
    processed: false,
  });
}

export async function assignClaimsToUser(
  db: Db,
  userId: string,
  claimIds: string[]
): Promise<{ assigned: string[]; queued: string[] }> {
  await initializeClaimsSystem(db);
  
  const assigned: string[] = [];
  const queued: string[] = [];

  const userLoad = await getUserClaimsLoad(db, userId);
  const userLimit = await getUserClaimLimit(db, userId);
  let currentLoad = userLoad.assignedClaimsCount;

  // Rule: Only assign new claims if the user has 0 active claims
  if (currentLoad > 0) {
    // Queue all claimIds
    for (const claimId of claimIds) {
      const assignmentsCollection = db.collection('claim_assignments');
      const existing = await assignmentsCollection.findOne({ claimId });
      if (existing) continue;

      await addClaimToQueue(db, claimId);
      queued.push(claimId);
    }
    return { assigned, queued };
  }

  const assignmentsCollection = db.collection('claim_assignments');

  for (const claimId of claimIds) {
    // Check if already assigned
    const existing = await assignmentsCollection.findOne({ claimId });
    if (existing) continue;

    if (currentLoad < userLimit) {
      await assignmentsCollection.insertOne({
        claimId,
        userId,
        assignedAt: new Date(),
        status: 'assigned',
      });
      assigned.push(claimId);
      currentLoad++;
    } else {
      await addClaimToQueue(db, claimId);
      queued.push(claimId);
    }
  }

  return { assigned, queued };
}

export async function releaseClaimFromUser(
  db: Db,
  claimId: string
): Promise<void> {
  await initializeClaimsSystem(db);
  
  const assignmentsCollection = db.collection('claim_assignments');
  const queueCollection = db.collection('claim_queue');

  // Remove from assignments
  await assignmentsCollection.deleteOne({ claimId });

  // Try to assign from queue
  await processClaimQueue(db);
}

export async function syncUnassignedClaims(db: Db): Promise<void> {
  await initializeClaimsSystem(db);

  const jobsCollection = db.collection('parsing_jobs');
  const assignmentsCollection = db.collection('claim_assignments');
  const queueCollection = db.collection('claim_queue');
  const targetProjectId = '857d529e-75cf-4210-bea3-ca023a15ed1d';

  // 1. Get only successful/valid jobs (exclude status: 'failed') from the target project
  const jobs = await jobsCollection
    .find({ project_id: targetProjectId, status: { $ne: 'failed' } }, { projection: { _id: 1 } })
    .toArray();
  const jobIds = jobs.map(j => j._id.toString());

  // 2. Get all assigned job IDs
  const assignments = await assignmentsCollection.find({}, { projection: { claimId: 1 } }).toArray();
  const assignedSet = new Set(assignments.map(a => a.claimId));

  // 3. Get all queued job IDs
  const queuedRecords = await queueCollection.find({}, { projection: { claimId: 1 } }).toArray();
  const queuedSet = new Set(queuedRecords.map(q => q.claimId));

  // 4. Find claims that are neither assigned nor queued
  const claimsToQueue = [];
  for (const jobIdStr of jobIds) {
    if (!assignedSet.has(jobIdStr) && !queuedSet.has(jobIdStr)) {
      claimsToQueue.push({
        claimId: jobIdStr,
        createdAt: new Date(),
        processed: false,
      });
    }
  }

  // 5. Bulk insert if there are any
  if (claimsToQueue.length > 0) {
    await queueCollection.insertMany(claimsToQueue);
  }

  // 6. Purge logic: remove unprocessed queued claims that do not belong to target project or are failed
  const queuedUnprocessed = await queueCollection.find({ processed: false }).toArray();
  const queuedUnprocessedIds = queuedUnprocessed.map(q => q.claimId);
  
  if (queuedUnprocessedIds.length > 0) {
    const { ObjectId } = require('mongodb');
    const validJobs = await jobsCollection.find({
      _id: { $in: queuedUnprocessedIds.map(id => {
        try {
          return new ObjectId(id);
        } catch {
          return id;
        }
      }) },
      project_id: targetProjectId,
      status: { $ne: 'failed' }
    }, { projection: { _id: 1 } }).toArray();
    
    const validJobIds = new Set(validJobs.map(j => j._id.toString()));
    const invalidIdsToDelete = queuedUnprocessedIds.filter(id => !validJobIds.has(id));
    
    if (invalidIdsToDelete.length > 0) {
      await queueCollection.deleteMany({ claimId: { $in: invalidIdsToDelete }, processed: false });
    }
  }
}

export async function processClaimQueue(db: Db, forceFill = false): Promise<void> {
  await initializeClaimsSystem(db);
  await syncUnassignedClaims(db);
  
  const queueCollection = db.collection('claim_queue');
  const assignmentsCollection = db.collection('claim_assignments');
  const usersCollection = db.collection('users');

  // Get all active users with role 'user'
  const activeUsers = await usersCollection
    .find({ isActive: true, role: 'user' })
    .toArray();

  // Fetch initial loads and limits once to avoid heavy loop database queries
  const userLoads = new Map<string, { initialCount: number; currentCount: number; limit: number }>();
  for (const user of activeUsers) {
    const userId = user._id.toString();
    const assignedCount = await getAssignedClaimsCount(db, userId);
    const claimLimit = await getUserClaimLimit(db, userId);
    userLoads.set(userId, {
      initialCount: assignedCount,
      currentCount: assignedCount,
      limit: claimLimit,
    });
  }

  // Sort by oldest in queue
  const queuedClaims = await queueCollection
    .find({ processed: false })
    .sort({ createdAt: 1 })
    .toArray();

  for (const queuedClaim of queuedClaims) {
    // Find user with lowest current claims count who has capacity (and matches eligibility rule)
    let assignedUserId = null;
    let minCurrentCount = Infinity;

    for (const [userId, load] of userLoads.entries()) {
      const isEligible = forceFill || load.initialCount === 0;
      if (isEligible && load.currentCount < load.limit && load.currentCount < minCurrentCount) {
        assignedUserId = userId;
        minCurrentCount = load.currentCount;
      }
    }

    if (assignedUserId) {
      // Assign to user
      await assignmentsCollection.insertOne({
        claimId: queuedClaim.claimId,
        userId: assignedUserId,
        assignedAt: new Date(),
        status: 'assigned',
      });

      // Mark as processed
      await queueCollection.updateOne(
        { _id: queuedClaim._id },
        { $set: { processed: true } }
      );

      // Update in-memory count
      const load = userLoads.get(assignedUserId)!;
      load.currentCount++;
    } else {
      // No users with initialCount === 0 have remaining capacity, break
      break;
    }
  }
}

export async function getClaimAssignment(
  db: Db,
  claimId: string
): Promise<ClaimAssignment | null> {
  await initializeClaimsSystem(db);
  
  const assignmentsCollection = db.collection('claim_assignments');
  const assignment = await assignmentsCollection.findOne({ claimId });

  if (!assignment) return null;

  return {
    _id: assignment._id.toString(),
    claimId: assignment.claimId,
    userId: assignment.userId,
    assignedAt: assignment.assignedAt,
    status: assignment.status,
  };
}

export async function getUserAssignedClaims(
  db: Db,
  userId: string
): Promise<string[]> {
  await initializeClaimsSystem(db);
  
  const assignmentsCollection = db.collection('claim_assignments');
  const assignments = await assignmentsCollection
    .find({ userId, status: 'assigned' })
    .toArray();

  return assignments.map(a => a.claimId);
}

export async function getUserCompletedClaims(
  db: Db,
  userId: string
): Promise<string[]> {
  await initializeClaimsSystem(db);
  
  const assignmentsCollection = db.collection('claim_assignments');
  const assignments = await assignmentsCollection
    .find({ userId, status: 'completed' })
    .toArray();

  return assignments.map(a => a.claimId);
}

export async function getQueuedClaims(db: Db): Promise<string[]> {
  await initializeClaimsSystem(db);
  await syncUnassignedClaims(db);
  
  const queueCollection = db.collection('claim_queue');
  const queued = await queueCollection
    .find({ processed: false })
    .sort({ createdAt: 1 })
    .toArray();

  return queued.map(q => q.claimId);
}

export async function getGlobalClaimLimit(db: Db): Promise<number> {
  await initializeClaimsSystem(db);

  const settingsCollection = db.collection('claim_settings');
  const record = await settingsCollection.findOne({ key: 'globalClaimLimit' });
  return record?.value ?? 10;
}

export async function setGlobalClaimLimit(
  db: Db,
  limit: number
): Promise<void> {
  await initializeClaimsSystem(db);

  const settingsCollection = db.collection('claim_settings');
  await settingsCollection.updateOne(
    { key: 'globalClaimLimit' },
    {
      $set: {
        key: 'globalClaimLimit',
        value: limit,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function applyGlobalLimitToAllUsers(
  db: Db,
  limit: number
): Promise<void> {
  await initializeClaimsSystem(db);

  const usersCollection = db.collection('users');
  const activeUsers = await usersCollection
    .find({ isActive: true })
    .toArray();

  for (const user of activeUsers) {
    const userId = user._id.toString();
    await setUserClaimLimit(db, userId, limit);
  }
}

export async function getAllUsersClaimsLoad(
  db: Db
): Promise<
  {
    userId: string;
    email: string;
    assignedCount: number;
    claimLimit: number;
    loadPercentage: number;
    status: string;
  }[]
> {
  await initializeClaimsSystem(db);

  const usersCollection = db.collection('users');
  const activeUsers = await usersCollection
    .find({ isActive: true, role: 'user' })
    .toArray();

  const results = await Promise.all(
    activeUsers.map(async (user) => {
      const userId = user._id.toString();
      const load = await getUserClaimsLoad(db, userId);
      const loadPercentage =
        load.claimLimit > 0
          ? Math.round((load.assignedClaimsCount / load.claimLimit) * 100)
          : 0;

      let status = 'available';
      if (load.claimLimit === 0) {
        status = 'no_limit_set';
      } else if (load.assignedClaimsCount >= load.claimLimit) {
        status = 'at_capacity';
      }

      return {
        userId,
        email: user.email,
        assignedCount: load.assignedClaimsCount,
        claimLimit: load.claimLimit,
        loadPercentage,
        status,
      };
    })
  );

  return results;
}

export async function completeClaimAssignment(
  db: Db,
  claimId: string
): Promise<void> {
  await initializeClaimsSystem(db);
  const assignmentsCollection = db.collection('claim_assignments');
  
  await assignmentsCollection.updateOne(
    { claimId },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
      },
    }
  );

  // Freeing a slot triggers queue processing
  await processClaimQueue(db);
}

export async function reopenClaimAssignment(
  db: Db,
  claimId: string
): Promise<void> {
  await initializeClaimsSystem(db);
  const assignmentsCollection = db.collection('claim_assignments');
  
  await assignmentsCollection.updateOne(
    { claimId },
    {
      $set: {
        status: 'assigned',
        reopenedAt: new Date(),
      },
      $unset: {
        completedAt: "",
      }
    }
  );
}

let schedulerIntervalId: any = null;

export function startScheduler(db: Db): void {
  if (schedulerIntervalId !== null) {
    return;
  }
  
  console.log('Initializing claims auto-assignment background scheduler...');
  
  // Run once immediately on startup
  processClaimQueue(db).catch(err => {
    console.error('Error in claim queue background processing:', err);
  });
  
  // Set interval for 5 minutes (300,000 ms)
  schedulerIntervalId = setInterval(() => {
    console.log('Running scheduled claim queue auto-assignment...');
    processClaimQueue(db).catch(err => {
      console.error('Error in claim queue background processing:', err);
    });
  }, 5 * 60 * 1000);
  
  // Allow Node process to exit cleanly if needed
  if (schedulerIntervalId && typeof schedulerIntervalId.unref === 'function') {
    schedulerIntervalId.unref();
  }
}
