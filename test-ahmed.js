require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobs = await db.collection('parsing_jobs').find({ 
      state: /MAHARASHTRA/i, 
      city: /AHMEDNAGAR/i 
    }).toArray();

    console.log(`Total jobs: ${jobs.length}`);
    
    const uniqueHospitals = new Map();
    const originalNames = [];

    jobs.forEach(job => {
      let hospName = job.parsed_data?.Hospname || 'Unknown Hospital';
      let hospCode = job.parsed_data?.Hospid || '';
      
      if (!hospCode && job.files && job.files.length > 0) {
          const match = job.files[0].filename.match(/^(.+?)-(\d+)\.pdf$/);
          if (match) hospCode = match[2];
      }
      
      hospName = hospName.trim();
      hospCode = hospCode.trim();

      const key = `${hospCode}-${hospName}`.toLowerCase().trim();
      
      originalNames.push({ hospName, hospCode, key });
      
      if (!uniqueHospitals.has(key)) {
        uniqueHospitals.set(key, 1);
      } else {
        uniqueHospitals.set(key, uniqueHospitals.get(key) + 1);
      }
    });

    console.log(`Unique keys count: ${uniqueHospitals.size}`);
    
    // Find the duplicates
    console.log("\nDuplicates found:");
    for (const [key, count] of uniqueHospitals.entries()) {
      if (count > 1) {
        console.log(`- ${key} (Count: ${count})`);
        const matchingFiles = originalNames.filter(n => n.key === key);
        matchingFiles.forEach(f => {
          console.log(`    -> "${f.hospName}" ("${f.hospCode}")`);
        });
      }
    }
  } finally {
    await client.close();
  }
}
run();
