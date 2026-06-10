/**
 * Delete superadmin user to recreate with correct password hash
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function deleteOldSuperadmin() {
  let client;
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Please define the MONGODB_URI environment variable');
    }

    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const users = db.collection('users');

    const result = await users.deleteOne({ email: 'admin@gmail.com' });
    
    if (result.deletedCount > 0) {
      console.log('✅ Old superadmin deleted. Now run: node create-superadmin.js');
    } else {
      console.log('ℹ️  No admin@gmail.com found to delete');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

deleteOldSuperadmin();
