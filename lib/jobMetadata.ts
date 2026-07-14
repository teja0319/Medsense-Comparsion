import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

export type JobStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface IJobMetadata {
  _id?: ObjectId;
  sessionId: string;       // Local batch tracking ID
  externalJobId?: string;  // job_id from external API response
  reportId?: string;       // report_id from external API response
  statename: string;       // From ZIP folder
  cityname: string;        // From ZIP folder
  filename: string;
  status: JobStatus;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Store local tracking record in JobsMetadata
export async function createJobMetadata(data: Omit<IJobMetadata, '_id' | 'createdAt' | 'updatedAt'>) {
  const { db } = await connectToDatabase();
  const collection = db.collection<IJobMetadata>('JobsMetadata');
  
  const record: IJobMetadata = {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await collection.insertOne(record);
  return { ...record, _id: result.insertedId };
}

// Update local tracking record status
export async function updateJobMetadataStatus(
  sessionId: string, 
  filename: string, 
  status: JobStatus, 
  error?: string,
  externalJobId?: string,
  reportId?: string
) {
  const { db } = await connectToDatabase();
  const collection = db.collection<IJobMetadata>('JobsMetadata');
  
  const updateDoc: any = {
    $set: {
      status,
      updatedAt: new Date()
    }
  };

  if (error) updateDoc.$set.error = error;
  if (externalJobId) updateDoc.$set.externalJobId = externalJobId;
  if (reportId) updateDoc.$set.reportId = reportId;

  await collection.updateOne(
    { sessionId, filename },
    updateDoc
  );
}

// After external API returns job_id, update the EXISTING record in parsing_jobs
// The external API creates a record with _id = job_id, so we find by _id
export async function updateParsingJobWithLocation(externalJobId: string, statename: string, cityname: string) {
  const { db } = await connectToDatabase();
  const collection = db.collection('parsing_jobs');

  console.log(`[DB] Updating parsing_jobs._id=${externalJobId} with state=${statename}, city=${cityname}`);

  const result = await collection.updateOne(
    { _id: new ObjectId(externalJobId) },
    { 
      $set: {
        state: statename,
        city: cityname,
      }
    }
  );

  console.log(`[DB] Update result: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
  return result;
}
