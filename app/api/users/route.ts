import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';
import { getAllUsers, updateUserRole, toggleUserActive } from '@/lib/userService';
import { UserRole } from '@/lib/userService';

// GET all users
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Check if user is superadmin
    const usersCollection = db.collection('users');
    const currentUser = await usersCollection.findOne({ email: user.email });
    
    if (currentUser?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await getAllUsers(db);
    return NextResponse.json({ users });
  } catch (err) {
    console.error('Error fetching users:', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PUT update user role
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Check if user is superadmin
    const usersCollection = db.collection('users');
    const currentUser = await usersCollection.findOne({ email: user.email });
    
    if (currentUser?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role, isActive } = body;

    if (!userId || (!role && isActive === undefined)) {
      return NextResponse.json(
        { error: 'UserId and either role or isActive required' },
        { status: 400 }
      );
    }

    if (role && !['superadmin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (role) {
      const updatedUser = await updateUserRole(db, userId, role as UserRole);
      if (!updatedUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ user: updatedUser });
    }

    if (isActive !== undefined) {
      const updatedUser = await toggleUserActive(db, userId, isActive);
      if (!updatedUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ user: updatedUser });
    }
  } catch (err) {
    console.error('Error updating user:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
