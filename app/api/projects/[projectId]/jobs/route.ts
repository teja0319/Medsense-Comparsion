import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { serializeDocuments } from '@/lib/serialize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobsCollection = db.collection('parsing_jobs');

    // Get pagination params
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Fetch jobs for the project with pagination
    const jobs = await jobsCollection
      .find({ project_id: projectId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination
    const total = await jobsCollection.countDocuments({ project_id: projectId });

    // Get status counts
    const statusCounts = await jobsCollection.aggregate([
      { $match: { project_id: projectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray();

    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: total
    };
    statusCounts.forEach((s: any) => {
      counts[s._id] = s.count;
    });

    return NextResponse.json({
      jobs: serializeDocuments(jobs),
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

import { ObjectId } from 'mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { jobIds } = body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: 'No job IDs provided' },
        { status: 400 }
      );
    }

    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobsCollection = db.collection('parsing_jobs');

    const objectIds = jobIds
      .filter((id: string) => ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid job IDs provided' },
        { status: 400 }
      );
    }

    const result = await jobsCollection.deleteMany({
      _id: { $in: objectIds },
      project_id: projectId
    });

    return NextResponse.json({
      message: 'Jobs deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error('Error deleting jobs:', error);
    return NextResponse.json(
      { error: 'Failed to delete jobs', details: error.message },
      { status: 500 }
    );
  }
}

