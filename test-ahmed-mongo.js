require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    
    const pipeline = [
      { $match: { state: "MAHARASHTRA", city: "AHMEDNAGAR" } },
      {
        $group: {
          _id: {
            hospCode: { $toLower: { $trim: { input: { $ifNull: ["$parsed_data.Hospid", ""] } } } },
            hospName: { $toLower: { $trim: { input: { $ifNull: ["$parsed_data.Hospname", ""] } } } }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalHospitals: { $sum: 1 }
        }
      }
    ];

    const result = await db.collection('parsing_jobs').aggregate(pipeline).toArray();
    console.log(`MongoDB Aggregation Unique Count: ${result[0]?.totalHospitals}`);
    
  } finally {
    await client.close();
  }
}
run();
