import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('[v0] Collections:', collections);

    const collectionInfo: any = {};

    for (const collectionMeta of collections) {
      const collection = db.collection(collectionMeta.name);
      const count = await collection.countDocuments();
      const sample = await collection.findOne();

      collectionInfo[collectionMeta.name] = {
        documentCount: count,
        sample: sample,
      };
    }

    return NextResponse.json({
      status: 'connected',
      collections: collectionInfo,
    });
  } catch (error) {
    console.error('[v0] Debug error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
