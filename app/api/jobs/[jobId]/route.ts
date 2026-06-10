import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { serializeDocument } from '@/lib/serialize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    // Validate MongoDB ObjectId
    if (!ObjectId.isValid(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID' },
        { status: 400 }
      );
    }

    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobsCollection = db.collection('parsing_jobs');

    // Fetch the specific job
    const job = await jobsCollection.findOne({
      _id: new ObjectId(jobId),
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const serializedJob = serializeDocument(job);

    // Look up assignment information
    const assignment = await db.collection('claim_assignments').findOne({ claimId: jobId });
    if (assignment) {
      serializedJob.reviewStatus = assignment.status;
      serializedJob.assignedUserId = assignment.userId;
      
      const assignedUser = await db.collection('users').findOne({
        _id: ObjectId.isValid(assignment.userId) ? new ObjectId(assignment.userId) : assignment.userId
      });
      if (assignedUser) {
        serializedJob.assignedUserEmail = assignedUser.email;
      }
    } else {
      serializedJob.reviewStatus = 'unassigned';
    }

    return NextResponse.json(serializedJob);
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    if (!ObjectId.isValid(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID' },
        { status: 400 }
      );
    }

    const { parsed_data } = await request.json();
    if (!parsed_data) {
      return NextResponse.json(
        { error: 'Missing parsed_data in request body' },
        { status: 400 }
      );
    }

    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobsCollection = db.collection('parsing_jobs');

    await jobsCollection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { parsed_data, updated_at: new Date() } }
    );

    const updatedJob = await jobsCollection.findOne({
      _id: new ObjectId(jobId),
    });

    if (!updatedJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeDocument(updatedJob));
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

