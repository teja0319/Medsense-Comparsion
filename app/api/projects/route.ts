import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { serializeDocuments } from '@/lib/serialize';

export async function GET(request: NextRequest) {
  try {
    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const projectsCollection = db.collection('projects');

    // Fetch all projects
    const projects = await projectsCollection
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json(serializeDocuments(projects));
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
