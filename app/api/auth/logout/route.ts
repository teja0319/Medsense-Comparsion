import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('medsense_session')?.value;

    if (sessionToken) {
      const client = await getMongoClient();
      const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
      await db.collection('sessions').deleteOne({ token: sessionToken });
    }

    const response = NextResponse.json({ message: 'Logged out' });
    response.cookies.delete('medsense_session');
    return response;
  } catch (error) {
    console.error('Error logging out:', error);
    const response = NextResponse.json({ message: 'Logged out' });
    response.cookies.delete('medsense_session');
    return response;
  }
}
