import { Db } from 'mongodb';

export type UserRole = 'superadmin' | 'user';

export interface User {
  _id?: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface UserWithoutPassword extends Omit<User, 'password'> {
  _id: string;
}

export async function createUser(
  db: Db,
  email: string,
  hashedPassword: string,
  role: UserRole = 'user'
): Promise<UserWithoutPassword> {
  const users = db.collection('users');
  const now = new Date();
  
  const result = await users.insertOne({
    email,
    password: hashedPassword,
    role,
    isActive: true,
    created_at: now,
    updated_at: now,
  });

  const user = await users.findOne({ _id: result.insertedId });
  const { password, ...userWithoutPassword } = (user as any) as User;
  return { ...userWithoutPassword, _id: result.insertedId.toString() };
}

export async function getUserById(db: Db, userId: string): Promise<UserWithoutPassword | null> {
  const users = db.collection('users');
  const { ObjectId } = require('mongodb');
  
  const user = await users.findOne({ _id: new ObjectId(userId) });
  if (!user) return null;
  
  const { password, ...userWithoutPassword } = (user as any) as User;
  return { ...userWithoutPassword, _id: user._id.toString() };
}

export async function updateUserRole(
  db: Db,
  userId: string,
  role: UserRole
): Promise<UserWithoutPassword | null> {
  const users = db.collection('users');
  const { ObjectId } = require('mongodb');
  
  const result = await users.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: { role, updated_at: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result) return null;
  const doc = (result.value !== undefined ? result.value : result) as any;
  if (!doc) return null;
  
  const { password, ...userWithoutPassword } = doc;
  return { ...userWithoutPassword, _id: doc._id.toString() };
}

export async function toggleUserActive(
  db: Db,
  userId: string,
  isActive: boolean
): Promise<UserWithoutPassword | null> {
  const users = db.collection('users');
  const { ObjectId } = require('mongodb');
  
  const result = await users.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: { isActive, updated_at: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result) return null;
  const doc = (result.value !== undefined ? result.value : result) as any;
  if (!doc) return null;
  
  const { password, ...userWithoutPassword } = doc;
  return { ...userWithoutPassword, _id: doc._id.toString() };
}

export async function getAllUsers(db: Db): Promise<UserWithoutPassword[]> {
  const users = db.collection('users');
  const allUsers = await users.find().toArray();
  
  return allUsers.map((user: any) => {
    const { password, ...userWithoutPassword } = user as User;
    return { ...userWithoutPassword, _id: user._id.toString() };
  });
}
