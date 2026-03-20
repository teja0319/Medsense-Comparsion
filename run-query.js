const { MongoClient } = require('mongodb');

// The credentials are taken right from the .env
const uri = "mongodb+srv://tejach_db_user:YxmyYdJXycVMZsi5@cluster0.dteet0.mongodb.net/?retryWrites=true&w=majority";
const dbName = "MedSenseDev";

async function run() {
  let client;
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    
    // We update 'parsing_jobs' collection
    const collection = db.collection('parsing_jobs');
    
    console.log("Running update query...");
    const result = await collection.updateMany(
      { status: "failed" },
      { $set: { status: "pending" } }
    );
    
    console.log(`Matched ${result.matchedCount} documents, updated ${result.modifiedCount} documents.`);
  } catch (err) {
    console.error("Error running query: ", err);
  } finally {
    if (client) {
      await client.close();
      console.log("Connection closed.");
    }
  }
}

run();
