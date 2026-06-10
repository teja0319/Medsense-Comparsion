import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';
import { getUserAssignedClaims, getUserCompletedClaims } from '@/lib/claimsService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get user role
    const usersCollection = db.collection('users');
    const currentUser = await usersCollection.findOne({ email: user.email });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { projectId } = await params;
    const jobsCollection = db.collection('parsing_jobs');

    // Get pagination & search params
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const search = request.nextUrl.searchParams.get('search') || '';

    const isHistory = request.nextUrl.searchParams.get('history') === 'true';

    // Build query
    let query: Record<string, any> = { project_id: projectId };

    // If user is not superadmin, only show their assigned/completed jobs
    if (currentUser.role !== 'superadmin') {
      const claimsList = isHistory
        ? await getUserCompletedClaims(db, user.userId)
        : await getUserAssignedClaims(db, user.userId);
        
      query._id = { $in: claimsList.map(id => {
        try {
          const { ObjectId } = require('mongodb');
          return new ObjectId(id);
        } catch {
          return id;
        }
      }) };
    }

    if (search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query['$or'] = [
        { 'parsed_data.claim_details.claim_number': searchRegex },
        { 'parsed_data.claim_details.policy_number': searchRegex },
        { 'parsed_data.insured_person_details.name': searchRegex },
        { 'parsed_data.final_decision': searchRegex },
        { status: searchRegex }
      ];

      try {
        if (search.trim().length === 24) {
          const { ObjectId } = require('mongodb');
          query['$or'].push({ _id: new ObjectId(search.trim()) });
        }
      } catch {}
      query['$or'].push({ _id: search.trim() });
    }

    // Fetch jobs with pagination and search filter
    const jobs = await jobsCollection
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count
    const total = await jobsCollection.countDocuments(query);

    // Get status counts based on review and parsing state
    const assignedIds = await getUserAssignedClaims(db, user.userId);
    const completedIds = await getUserCompletedClaims(db, user.userId);

    const allUserClaims = [...assignedIds, ...completedIds];

    const failedCount = allUserClaims.length > 0
      ? await jobsCollection.countDocuments({
          project_id: projectId,
          status: 'failed',
          _id: { $in: allUserClaims.map(id => {
            try {
              const { ObjectId } = require('mongodb');
              return new ObjectId(id);
            } catch {
              return id;
            }
          }) }
        })
      : 0;

    const queueCount = await db.collection('claim_queue').countDocuments({ processed: false });

    const counts = {
      total: assignedIds.length + completedIds.length,
      queue: queueCount,
      underReview: assignedIds.length,
      reviewed: completedIds.length,
      failed: failedCount,
    };

    // Serialize documents
    // Serialize documents and attach review status
    const serializedJobIds = jobs.map((job: any) => job._id.toString());
    const assignments = await db.collection('claim_assignments')
      .find({ claimId: { $in: serializedJobIds } })
      .toArray();

    const serialized = jobs.map((job: any) => {
      const jobIdStr = job._id.toString();
      const assignment = assignments.find((a: any) => a.claimId === jobIdStr);
      return {
        ...job,
        _id: jobIdStr,
        reviewStatus: assignment ? assignment.status : 'unassigned',
        assignedUserId: assignment ? assignment.userId : null,
      };
    });

    return NextResponse.json({
      jobs: serialized,
      counts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching assigned jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
