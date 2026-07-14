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
      let hospName = j.parsed_data?.Hospname || 'Unknown Hospital';
      let hospCode = j.parsed_data?.Hospid || '';
      
      if (!hospCode && j.files && j.files.length > 0) {
          const match = j.files[0].filename.match(/^(.+?)-(\d+)\.pdf$/);
          if (match) hospCode = match[2];
      }

      const key = `${hospCode}-${hospName}`.toLowerCase().trim();
      
      if (!uniqueHospitals.has(key)) {
        uniqueHospitals.set(key, []);
      }
      uniqueHospitals.get(key).push(j.files[0].filename);
    });

    console.log(`Total jobs: ${jobs.length}`);
    console.log(`Unique keys count (using UI logic): ${uniqueHospitals.size}`);
    
    // Find the duplicates
    console.log("\nDuplicates found:");
    for (const [key, files] of uniqueHospitals.entries()) {
      if (files.length > 1) {
        console.log(`- Key: "${key}" (Count: ${files.length})`);
        files.forEach(f => {
          console.log(`    -> File: "${f}"`);
        });
      }
    }
  } finally {
    await client.close();
  }
}
run();
