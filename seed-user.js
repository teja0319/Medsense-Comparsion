// Seed script: create a test user
// Run: node seed-user.js

const crypto = require('crypto');
const { MongoClient } = require('mongodb');
require('dotenv').config();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'MedSenseDev';

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection('users');

  const email = 'admin@medsense.com';
  const password = 'admin123';

  // Remove existing if any
  await users.deleteMany({ email });

  const hashed = hashPassword(password);
  await users.insertOne({
    email,
    password: hashed,
    created_at: new Date(),
  });

  console.log('✅ Test user created!');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);

  await client.close();
}

main().catch(console.error);
