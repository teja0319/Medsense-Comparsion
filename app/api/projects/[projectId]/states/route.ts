import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobsCollection = db.collection('parsing_jobs');

    const pipeline = [
      { $match: { project_id: projectId } },
      // Group by state, city, and normalized hospital name/id to count unique hospitals
      {
        $group: {
          _id: {
            state: { $toLower: { $trim: { input: { $ifNull: ["$state", "Unknown"] } } } },
            city: { $toLower: { $trim: { input: { $ifNull: ["$city", "Unknown"] } } } },
            hospCode: { $toLower: { $trim: { input: { $ifNull: ["$parsed_data.Hospid", ""] } } } },
            hospName: { $toLower: { $trim: { input: { $ifNull: ["$parsed_data.Hospname", ""] } } } }
          },
          originalState: { $first: { $ifNull: ["$state", "Unknown"] } },
          procedureCount: {
            $sum: {
              $cond: {
                if: { $isArray: "$parsed_data.procedures" },
                then: { $size: "$parsed_data.procedures" },
                else: 0
              }
            }
          }
        }
      },
      // Group by state and city to count cities and hospitals per city
      {
        $group: {
          _id: {
            state: "$_id.state",
            city: "$_id.city"
          },
          originalState: { $first: "$originalState" },
          hospitalsInCity: { $sum: 1 }, 
          procedureCount: { $sum: "$procedureCount" }
        }
      },
      // Group by state to get final stats
      {
        $group: {
          _id: "$_id.state",
          state: { $first: "$originalState" },
          totalCities: { $sum: 1 },
          totalHospitals: { $sum: "$hospitalsInCity" },
          totalProcedures: { $sum: "$procedureCount" }
        }
      },
      { $sort: { state: 1 } }
    ];

    const states = await jobsCollection.aggregate(pipeline).toArray();

    return NextResponse.json({
      states,
      total: states.length,
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    return NextResponse.json(
      { error: 'Failed to fetch states' },
      { status: 500 }
    );
  }
}
