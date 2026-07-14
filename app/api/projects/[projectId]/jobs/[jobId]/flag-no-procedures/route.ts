import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; jobId: string }> }
) {
  try {
    const { projectId, jobId } = await params;
    const { is_no_procedures } = await request.json();

    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobsCollection = db.collection('parsing_jobs');

    const updateFields = {
      manually_verified_no_procedures: is_no_procedures === true,
      updated_at: new Date(),
    };

    let filter: any = { project_id: projectId };
    try {
      filter._id = new ObjectId(jobId);
    } catch {
      filter._id = jobId;
    }

    const result = await jobsCollection.updateOne(filter, { $set: updateFields });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, is_no_procedures });
  } catch (error) {
    console.error('Error updating no-procedures flag:', error);
    return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 });
  }
}
