import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { serializeDocuments, serializeDocument } from '@/lib/serialize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobsCollection = db.collection('parsing_jobs');

    // Get pagination & search params
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const search = request.nextUrl.searchParams.get('search') || '';

    const query: Record<string, any> = { project_id: projectId };

    if (search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query['$or'] = [
        { 'parsed_data.claim_details.claim_number': searchRegex },
        { 'parsed_data.claim_details.policy_number': searchRegex },
        { 'parsed_data.insured_person_details.name': searchRegex },
        { 'parsed_data.final_decision': searchRegex },
        { status: searchRegex }
      ];

      // Support direct matching on MongoDB string _id, or ObjectId if valid
      const { ObjectId } = require('mongodb');
      if (search.trim().length === 24) {
        try {
          query['$or'].push({ _id: new ObjectId(search.trim()) });
        } catch {}
      } else {
        query['$or'].push({ _id: search.trim() });
      }
    }

    // Fetch jobs for the project with pagination and search filter
    const jobs = await jobsCollection
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination matching the query
    const total = await jobsCollection.countDocuments(query);

    // Get overall status counts for the project (not affected by search) - optimized to avoid fetching all jobs to memory
    const [totalCount, failedCount, underReviewCount, reviewedCount, queueCount] = await Promise.all([
      jobsCollection.countDocuments({ project_id: projectId }),
      jobsCollection.countDocuments({ project_id: projectId, status: 'failed' }),
      db.collection('claim_assignments').countDocuments({ status: 'assigned' }),
      db.collection('claim_assignments').countDocuments({ status: 'completed' }),
      db.collection('claim_queue').countDocuments({ processed: false }),
    ]);

    const counts = {
      total: totalCount,
      queue: queueCount,
      underReview: underReviewCount,
      reviewed: reviewedCount,
      failed: failedCount,
    };

    // Lookup assignment information
    const jobIds = jobs.map((job: any) => job._id.toString());
    const assignments = await db.collection('claim_assignments')
      .find({ claimId: { $in: jobIds } })
      .toArray();

    const users = await db.collection('users').find({}).toArray();

    const serializedJobs = jobs.map((job: any) => {
      const jobIdStr = job._id.toString();
      const assignment = assignments.find((a: any) => a.claimId === jobIdStr);
      const assignedUser = assignment ? users.find((u: any) => u._id.toString() === assignment.userId) : null;
      return {
        ...serializeDocument(job),
        reviewStatus: assignment ? assignment.status : 'unassigned',
        assignedUserEmail: assignedUser ? assignedUser.email : null,
        assignedUserId: assignment ? assignment.userId : null,
      };
    });

    return NextResponse.json({
      jobs: serializedJobs,
      counts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
