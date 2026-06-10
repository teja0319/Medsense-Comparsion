/**
 * Quick utility to create a superadmin user
 * Usage: node create-superadmin.js
 * 
 * This script will prompt for email and password,
 * then create a superadmin user in the database
 */

require('dotenv').config();

const readline = require('readline');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Simple password hash using crypto (matches the password.ts implementation)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

async function createSuperadmin() {
  let client;
  try {
    console.log('=== Create Superadmin User ===\n');

    const email = await prompt('Email: ');
    const password = await prompt('Password: ');
    const confirmPassword = await prompt('Confirm Password: ');

    if (password !== confirmPassword) {
      console.error('\n❌ Passwords do not match');
      rl.close();
      return;
    }

    if (!email || !password) {
      console.error('\n❌ Email and password are required');
      rl.close();
      return;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Please define the MONGODB_URI environment variable');
    }

    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const users = db.collection('users');

    // Check if user already exists
    const existing = await users.findOne({ email });
    if (existing) {
      console.error('\n❌ User with this email already exists');
      rl.close();
      return;
    }

    // Create superadmin
    const hashedPassword = hashPassword(password);
    const now = new Date();

    const result = await users.insertOne({
      email,
      password: hashedPassword,
      role: 'superadmin',
      isActive: true,
      created_at: now,
      updated_at: now,
    });

    console.log('\n✅ Superadmin user created successfully!');
    console.log(`ID: ${result.insertedId}`);
    console.log(`Email: ${email}`);
    console.log(`Role: superadmin`);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating superadmin:', error.message);
    rl.close();
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

createSuperadmin();
