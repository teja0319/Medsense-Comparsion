require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    
    // Find all jobs where procedures array is empty or missing
    const jobs = await db.collection('parsing_jobs').find({
      $or: [
        { 'parsed_data.procedures': { $exists: false } },
        { 'parsed_data.procedures': { $size: 0 } },
        { 'parsed_data.procedures': null },
        { 'parsed_data': null },
        { 'parsed_data': { $exists: false } }
      ]
    }, {
      projection: {
        state: 1,
        city: 1,
        'files.filename': 1,
        'parsed_data.Hospname': 1,
        'parsed_data.Hospid': 1
      }
    }).toArray();

    console.log(`Total hospitals with 0 procedures: ${jobs.length}\n`);
    
    jobs.forEach((j, i) => {
      const filename = j.files?.[0]?.filename || 'N/A';
      const hospName = j.parsed_data?.Hospname || '(empty)';
      const hospId = j.parsed_data?.Hospid || '(empty)';
      console.log(`${i + 1}. ${filename}`);
      console.log(`   State: ${j.state || '?'}, City: ${j.city || '?'}`);
      console.log(`   HospName: ${hospName}, HospId: ${hospId}`);
      console.log('');
    });

  } finally {
    await client.close();
  }
}
run();
