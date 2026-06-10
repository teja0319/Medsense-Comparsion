import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';
import { processClaimQueue, getQueuedClaims } from '@/lib/claimsService';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const currentUser = await usersCollection.findOne({ email: user.email });

    // Only superadmin can view queue
    if (currentUser?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const queued = await getQueuedClaims(db);
    return NextResponse.json({ queued, count: queued.length });
  } catch (err) {
    console.error('Error fetching queue:', err);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const currentUser = await usersCollection.findOne({ email: user.email });

    // Only superadmin can process queue
    if (currentUser?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await processClaimQueue(db, true);
    const remaining = await getQueuedClaims(db);

    return NextResponse.json({
      ok: true,
      message: 'Queue processed',
      remainingInQueue: remaining.length,
    });
  } catch (err) {
    console.error('Error processing queue:', err);
    return NextResponse.json(
      { error: 'Failed to process queue' },
      { status: 500 }
    );
  }
}
