import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const currentUser = await usersCollection.findOne({ email: user.email });

    if (currentUser?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';

    // Fetch all active users with role 'user'
    const activeUsers = await usersCollection
      .find({ isActive: true, role: 'user' })
      .toArray();

    const assignmentsCollection = db.collection('claim_assignments');

    // Build date filter query for completedAt
    const dateQuery: any = {};
    if (startDate || endDate) {
      dateQuery.completedAt = {};
      if (startDate) {
        const d = new Date(`${startDate}T00:00:00.000Z`);
        if (!isNaN(d.getTime())) {
          dateQuery.completedAt.$gte = d;
        }
      }
      if (endDate) {
        const d = new Date(`${endDate}T23:59:59.999Z`);
        if (!isNaN(d.getTime())) {
          dateQuery.completedAt.$lte = d;
        }
      }
    }

    const userMetrics = [];

    for (const usr of activeUsers) {
      const userIdStr = usr._id.toString();

      // Total Completed in date range
      const completedQuery = {
        userId: userIdStr,
        status: 'completed',
        ...dateQuery
      };

      const completedAssignments = await assignmentsCollection
        .find(completedQuery)
        .toArray();
      const completedCount = completedAssignments.length;

      // Pending count (currently active)
      const pendingCount = await assignmentsCollection.countDocuments({
        userId: userIdStr,
        status: 'assigned'
      });

      // Total Assigned in range (based on assignedAt)
      const assignedQuery: any = { userId: userIdStr };
      if (startDate || endDate) {
        assignedQuery.assignedAt = {};
        if (startDate) {
          assignedQuery.assignedAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
        }
        if (endDate) {
          assignedQuery.assignedAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
        }
      }
      const assignedCount = await assignmentsCollection.countDocuments(assignedQuery);

      // Average Review Time (for completed claims in range)
      let totalDurationMs = 0;
      let reviewTimeCount = 0;

      for (const assign of completedAssignments) {
        if (assign.assignedAt && assign.completedAt) {
          const duration = new Date(assign.completedAt).getTime() - new Date(assign.assignedAt).getTime();
          if (duration > 0) {
            totalDurationMs += duration;
            reviewTimeCount++;
          }
        }
      }

      const avgDurationMs = reviewTimeCount > 0 ? totalDurationMs / reviewTimeCount : 0;

      userMetrics.push({
        userId: userIdStr,
        email: usr.email,
        completedCount,
        pendingCount,
        assignedCount,
        avgDurationMs,
      });
    }

    return NextResponse.json({
      metrics: userMetrics,
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
