import { MongoClient } from 'mongodb';

let cachedClient: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const uri = process.env.MONGODB_URI || 'mongodb+srv://tejach_db_user:YxmyYdJXycVMZsi5@cluster0.dteet0.mongodb.net/?retryWrites=true&w=majority';
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  try {
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;
    return client;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

export async function connectToDatabase() {
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB_NAME || 'MedSenseDev');
  return { client, db };
}
