import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';
import {
  getGlobalClaimLimit,
  setGlobalClaimLimit,
  applyGlobalLimitToAllUsers,
  processClaimQueue,
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

    // Only superadmin can view settings
    if (currentUser?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const globalLimit = await getGlobalClaimLimit(db);
    return NextResponse.json({ globalLimit });
  } catch (err) {
    console.error('Error fetching claim settings:', err);
    return NextResponse.json(
      { error: 'Failed to fetch claim settings' },
      { status: 500 }
    );
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

    // Only superadmin can update settings
    if (currentUser?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { globalLimit } = body;

    if (typeof globalLimit !== 'number' || globalLimit < 0) {
      return NextResponse.json(
        { error: 'Invalid globalLimit. Must be a non-negative number.' },
        { status: 400 }
      );
    }

    await setGlobalClaimLimit(db, globalLimit);
    await applyGlobalLimitToAllUsers(db, globalLimit);
    await processClaimQueue(db);

    return NextResponse.json({
      ok: true,
      message: 'Global claim limit updated and applied to all active users',
      globalLimit,
    });
  } catch (err) {
    console.error('Error updating claim settings:', err);
    return NextResponse.json(
      { error: 'Failed to update claim settings' },
      { status: 500 }
    );
  }
}
