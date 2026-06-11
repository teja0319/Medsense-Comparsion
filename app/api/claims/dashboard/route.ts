import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';
import {
  getAllUsersClaimsLoad,
  getGlobalClaimLimit,
  getQueuedClaims,
} from '@/lib/claimsService';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const currentUser = await usersCollection.findOne({ email: user.email });

    // Only superadmin can view dashboard
    if (currentUser?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const tab = url.searchParams.get('tab') || 'overview';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;

    const [globalLimit, users, queued] = await Promise.all([
      getGlobalClaimLimit(db),
      getAllUsersClaimsLoad(db),
      getQueuedClaims(db),
    ]);

    const totalAssigned = users.reduce((sum, u) => sum + u.assignedCount, 0);

    const { ObjectId } = require('mongodb');

    const getClaimNumber = (job: any) => {
      const parsedNo = job?.parsed_data?.claim_details?.claim_number;
      if (parsedNo && parsedNo !== '—' && parsedNo !== 'N/A') {
        return parsedNo;
      }
      const filename = job?.files?.[0]?.filename;
      if (filename) {
        return filename.replace(/\.pdf$/i, '').replace(/\s*\(\d+\)\s*$/, '');
      }
      return '—';
    };

    // Helper to resolve job + user details
    const resolveDetails = async (items: any[], type: 'assignment' | 'queue') => {
      const jobIds = items.map(i => i.claimId);
      const userIds = type === 'assignment' ? items.map(i => i.userId) : [];

      const validJobOids = jobIds.filter((id: string) => ObjectId.isValid(id)).map((id: string) => new ObjectId(id));
      const jobs = validJobOids.length > 0
        ? await db.collection('parsing_jobs').find({
            $or: [{ _id: { $in: validJobOids } }, { _id: { $in: jobIds } }]
          }).toArray()
        : [];
      const jobsMap = new Map(jobs.map(j => [j._id.toString(), j]));

      let usersMap = new Map();
      if (userIds.length > 0) {
        const validUserOids = userIds.filter((id: string) => ObjectId.isValid(id)).map((id: string) => new ObjectId(id));
        const usersList = validUserOids.length > 0
          ? await db.collection('users').find({
              $or: [{ _id: { $in: validUserOids } }, { _id: { $in: userIds } }]
            }).toArray()
          : [];
        usersMap = new Map(usersList.map(u => [u._id.toString(), u]));
      }

      return { jobsMap, usersMap };
    };

    // --- TAB: overview ---
    if (tab === 'overview') {
      const [activeCount, reviewedCount, queueCount] = await Promise.all([
        db.collection('claim_assignments').countDocuments({ status: 'assigned' }),
        db.collection('claim_assignments').countDocuments({ status: 'completed' }),
        db.collection('claim_queue').countDocuments({ processed: false }),
      ]);

      // Get recent activity (last 10 of each) for overview summary
      const recentActive = await db.collection('claim_assignments')
        .find({ status: 'assigned' })
        .sort({ assignedAt: -1 })
        .limit(limit)
        .skip(skip)
        .toArray();

      const { jobsMap, usersMap } = await resolveDetails(recentActive, 'assignment');

      const activeItems = recentActive.map(a => {
        const job = jobsMap.get(a.claimId);
        const usr = usersMap.get(a.userId);
        return {
          claimId: a.claimId,
          projectId: job?.project_id || '—',
          claimNumber: getClaimNumber(job),
          insuredName: job?.parsed_data?.insured_person_details?.name || '—',
          assignedTo: usr?.email || a.userId,
          assignedAt: a.assignedAt,
        };
      });

      return NextResponse.json({
        tab: 'overview',
        globalLimit,
        totalAssigned,
        totalQueued: queued.length,
        totalReviewed: reviewedCount,
        activeCount,
        queueCount,
        reviewedCount,
        usersCount: users.length,
        users,
        activeItems,
        totalActiveItems: activeCount,
        page,
        limit,
      });
    }

    // --- TAB: queue ---
    if (tab === 'queue') {
      const totalCount = await db.collection('claim_queue').countDocuments({ processed: false });
      const queueItems = await db.collection('claim_queue')
        .find({ processed: false })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const { jobsMap } = await resolveDetails(queueItems, 'queue');

      const items = queueItems.map(q => {
        const job = jobsMap.get(q.claimId);
        return {
          claimId: q.claimId,
          projectId: job?.project_id || '—',
          claimNumber: getClaimNumber(job),
          insuredName: job?.parsed_data?.insured_person_details?.name || '—',
          createdAt: q.createdAt,
        };
      });

      return NextResponse.json({
        tab: 'queue',
        items,
        totalCount,
        page,
        limit,
      });
    }

    // --- TAB: reviewed ---
    if (tab === 'reviewed') {
      const startDate = url.searchParams.get('startDate') || '';
      const endDate = url.searchParams.get('endDate') || '';
      const filterUserId = url.searchParams.get('filterUserId') || '';

      const reviewedQuery: any = { status: 'completed' };

      if (startDate || endDate) {
        reviewedQuery.completedAt = {};
        if (startDate) {
          const d = new Date(`${startDate}T00:00:00.000Z`);
          if (!isNaN(d.getTime())) {
            reviewedQuery.completedAt.$gte = d;
          }
        }
        if (endDate) {
          const d = new Date(`${endDate}T23:59:59.999Z`);
          if (!isNaN(d.getTime())) {
            reviewedQuery.completedAt.$lte = d;
          }
        }
      }

      if (filterUserId && filterUserId !== 'all') {
        reviewedQuery.userId = filterUserId;
      }

      const totalCount = await db.collection('claim_assignments').countDocuments(reviewedQuery);
      const reviewItems = await db.collection('claim_assignments')
        .find(reviewedQuery)
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const { jobsMap, usersMap } = await resolveDetails(reviewItems, 'assignment');

      const items = reviewItems.map(a => {
        const job = jobsMap.get(a.claimId);
        const usr = usersMap.get(a.userId);
        return {
          claimId: a.claimId,
          projectId: job?.project_id || '—',
          claimNumber: getClaimNumber(job),
          insuredName: job?.parsed_data?.insured_person_details?.name || '—',
          reviewedBy: usr?.email || a.userId,
          completedAt: a.completedAt,
        };
      });

      return NextResponse.json({
        tab: 'reviewed',
        items,
        totalCount,
        page,
        limit,
        users: users.map(u => ({ userId: u.userId, email: u.email })),
      });
    }

    // Default fallback — return overview stats
    return NextResponse.json({
      globalLimit,
      totalAssigned,
      totalQueued: queued.length,
      users,
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
