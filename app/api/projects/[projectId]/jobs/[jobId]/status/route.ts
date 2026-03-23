export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; jobId: string }> }
) {
  try {
    const { projectId, jobId } = await params;
    const body = await request.json();
    const { status } = body;

    // Only allow setting to specific safe statuses
    const allowedStatuses = ['pending', 'failed', 'completed'];
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobsCollection = db.collection('parsing_jobs');

    // Build the update object
    const updateFields: Record<string, any> = {
      status,
      updated_at: new Date(),
    };

    // If setting to pending for a rerun, reset parsing counters
    if (status === 'pending') {
      updateFields.message = 'Parsing queued - waiting for background worker';
      updateFields.files_processed = 0;
      updateFields.successful_parses = 0;
      updateFields.failed_parses = 0;
      updateFields.retry_count = 0;
    }

    // Try matching by ObjectId first, then by string _id
    let filter: any = { project_id: projectId };
    try {
      filter._id = new ObjectId(jobId);
    } catch {
      filter._id = jobId;
    }

    const result = await jobsCollection.updateOne(filter, { $set: updateFields });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Job status updated to "${status}"`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    return NextResponse.json(
      { error: 'Failed to update job status' },
      { status: 500 }
    );
  }
}
