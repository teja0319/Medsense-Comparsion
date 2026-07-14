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

    // Default to the boolean is_no_procedures for backwards compatibility,
    // or use the new 'flag' and 'value' format.
    let flagToSet = '';
    let flagValue = true;

    if (body.flag) {
      flagToSet = body.flag;
      flagValue = body.value === true;
    } else if (body.is_no_procedures !== undefined) {
      flagToSet = 'manually_verified_no_procedures';
      flagValue = body.is_no_procedures === true;
    } else {
      return NextResponse.json({ error: 'Missing flag details' }, { status: 400 });
    }

    const allowedFlags = ['manually_verified_no_procedures', 'needs_different_pdf', 'needs_reprocessing'];
    if (!allowedFlags.includes(flagToSet)) {
      return NextResponse.json({ error: 'Invalid flag name' }, { status: 400 });
    }

    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobsCollection = db.collection('parsing_jobs');

    const updateFields: any = {
      updated_at: new Date(),
    };

    if (flagValue === true) {
      // If setting a flag to true, ensure other triage flags are false
      allowedFlags.forEach(f => {
        updateFields[f] = f === flagToSet;
      });
    } else {
      // Just unset this specific flag
      updateFields[flagToSet] = false;
    }

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

    return NextResponse.json({ success: true, flag: flagToSet, value: flagValue });
  } catch (error) {
    console.error('Error updating flag:', error);
    return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 });
  }
}
