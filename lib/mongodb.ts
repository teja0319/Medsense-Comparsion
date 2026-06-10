import { MongoClient } from 'mongodb';
import { startScheduler } from './claimsService';

let cachedClient: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  try {
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;

    // Start background auto-assignment scheduler
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    startScheduler(db);

    return client;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

export async function connectToDatabase() {
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
  return { client, db };
}
