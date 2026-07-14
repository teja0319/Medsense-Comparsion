const { MongoClient } = require('mongodb');
require('dotenv').config();

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
  
  const jobId = "69ba6be80811d461af48f775";
  console.log('Searching for _id:', jobId);
  const res4 = await db.collection('parsing_jobs').find({ _id: new ObjectId(jobId) }).toArray();
  console.log(`Results: _id=${res4.length}`);
  if (res4.length > 0) {
    console.log('Sample record keys:', Object.keys(res4[0]));
    console.log('Sample record jobId field value:', res4[0].jobId || res4[0].job_id || res4[0].jobid);
  } else {
    console.log('No record found with that _id. Listing first record _id for reference:');
    const first = await db.collection('parsing_jobs').findOne({});
    if (first) console.log(first._id.toString());
  }

  await client.close();
}

check().catch(console.error);
