import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const dbUser = await usersCollection.findOne({ email: user.email });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      userId: dbUser._id.toString(),
      email: dbUser.email,
      role: dbUser.role,
      isActive: dbUser.isActive,
    });
  } catch (err) {
    console.error('Error fetching current user:', err);
    return NextResponse.json({ error: 'Failed to fetch current user' }, { status: 500 });
  }
}
