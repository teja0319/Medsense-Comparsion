require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobs = await db.collection('parsing_jobs').find({ 
      state: "MAHARASHTRA", 
      city: "AHMEDNAGAR" 
    }).toArray();

    const uniqueHospitals = new Map();

    jobs.forEach(j => {
      let hospName = j.parsed_data?.Hospname || '';
      let hospCode = j.parsed_data?.Hospid || '';
      const key = `${hospCode}-${hospName}`.toLowerCase().trim();
      uniqueHospitals.set(key, 1);
    });

    console.log(`Unique keys count without filename fallback: ${uniqueHospitals.size}`);
  } finally {
    await client.close();
  }
}
run();
