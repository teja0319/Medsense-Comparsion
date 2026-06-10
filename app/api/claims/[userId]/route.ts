import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';
import {
  setUserClaimLimit,
  getUserClaimsLoad,
  assignClaimsToUser,
  releaseClaimFromUser,
  getUserAssignedClaims,
  getQueuedClaims,
  processClaimQueue,
  completeClaimAssignment,
  reopenClaimAssignment,
} from '@/lib/claimsService';

// GET user's claims load and limits
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId?: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const currentUser = await usersCollection.findOne({ email: user.email });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const { userId: routeUserId } = await params;
    const userId = routeUserId || searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'UserId required' }, { status: 400 });
    }

    // Users can only see their own data, admins can see all
    if (currentUser?.role !== 'superadmin' && user.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'load') {
      const load = await getUserClaimsLoad(db, userId);
      return NextResponse.json(load);
    }

    if (action === 'assigned') {
      const claims = await getUserAssignedClaims(db, userId);
      return NextResponse.json({ claims });
    }

    if (action === 'queue') {
      if (currentUser?.role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const queued = await getQueuedClaims(db);
      return NextResponse.json({ queued });
    }

    // Default: get user's load
    const load = await getUserClaimsLoad(db, userId);
    return NextResponse.json(load);
  } catch (err) {
    console.error('Error fetching claims data:', err);
    return NextResponse.json({ error: 'Failed to fetch claims data' }, { status: 500 });
  }
}

// POST assign/update claims for user
export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId?: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const currentUser = await usersCollection.findOne({ email: user.email });

    const { userId: routeUserId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = routeUserId || searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'UserId required' }, { status: 400 });
    }

    const body = await req.json();
    const { claimIds, action, limit } = body;

    // Authorization checks based on action:
    if (action === 'complete' || action === 'reopen') {
      // User can complete/reopen their own claims, superadmin can do any
      if (currentUser?.role !== 'superadmin' && user.userId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // Other actions (setLimit, assign, processQueue) require superadmin role
      if (currentUser?.role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Set claim limit
    if (action === 'setLimit' && limit !== undefined) {
      await setUserClaimLimit(db, userId, limit);
      return NextResponse.json({ ok: true, limit });
    }

    // Assign claims
    if (action === 'assign' && claimIds && Array.isArray(claimIds)) {
      const result = await assignClaimsToUser(db, userId, claimIds);
      return NextResponse.json(result);
    }

    // Process queue
    if (action === 'processQueue') {
      await processClaimQueue(db, true);
      const queued = await getQueuedClaims(db);
      return NextResponse.json({ ok: true, remainingInQueue: queued.length });
    }

    // Complete claim
    if (action === 'complete' && body.claimId) {
      await completeClaimAssignment(db, body.claimId);
      return NextResponse.json({ ok: true });
    }

    // Reopen claim
    if (action === 'reopen' && body.claimId) {
      await reopenClaimAssignment(db, body.claimId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Error assigning claims:', err);
    return NextResponse.json({ error: 'Failed to assign claims' }, { status: 500 });
  }
}

// DELETE release claim from user
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId?: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const currentUser = await usersCollection.findOne({ email: user.email });

    // Only superadmin can release claims
    if (currentUser?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get('claimId');

    if (!claimId) {
      return NextResponse.json({ error: 'ClaimId required' }, { status: 400 });
    }

    await releaseClaimFromUser(db, claimId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error releasing claim:', err);
    return NextResponse.json({ error: 'Failed to release claim' }, { status: 500 });
  }
}
