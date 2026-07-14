require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');

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

    // Optionally map it down to see the data cleanly
    const simplified = jobs.map(j => ({
      _id: j._id,
      filename: j.files?.[0]?.filename,
      hospName: j.parsed_data?.Hospname,
      hospId: j.parsed_data?.Hospid,
      proceduresCount: j.parsed_data?.procedures?.length || 0
    }));

    fs.writeFileSync('ahmednagar_query_results.json', JSON.stringify(simplified, null, 2));
    console.log(`Successfully fetched ${jobs.length} documents. Check ahmednagar_query_results.json`);
    
  } finally {
    await client.close();
  }
}
run();
