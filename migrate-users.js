/**
 * Migration script to add roles and active status to existing users
 * Run this script once to migrate existing users to the new schema
 * 
 * Usage: node migrate-users.js
 */

require('dotenv').config();

const { MongoClient } = require('mongodb');

async function migrateUsers() {
  let client;
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Please define the MONGODB_URI environment variable');
    }

    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const usersCollection = db.collection('users');

    console.log('Starting user migration...');

    // Find users without role or isActive fields
    const usersWithoutRole = await usersCollection
      .find({
        $or: [
          { role: { $exists: false } },
          { isActive: { $exists: false } }
        ]
      })
      .toArray();

    console.log(`Found ${usersWithoutRole.length} users to migrate`);

    if (usersWithoutRole.length > 0) {
      // Add default values
      const result = await usersCollection.updateMany(
        {
          $or: [
            { role: { $exists: false } },
            { isActive: { $exists: false } }
          ]
        },
        {
          $set: {
            role: 'user',
            isActive: true,
            updated_at: new Date()
          }
        }
      );

      console.log(`Updated ${result.modifiedCount} users`);
    }

    // List all users after migration
    const allUsers = await usersCollection.find().toArray();
    console.log('\nUsers after migration:');
    allUsers.forEach((user) => {
      console.log(`- ${user.email}: role=${user.role}, isActive=${user.isActive}`);
    });

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

migrateUsers();
