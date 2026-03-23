export const dynamic = 'force-dynamic';

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
      // Sort so 'completed' is preferred when grouping duplicates by filename
      // 'completed' (c) comes before 'failed' (f) or 'pending' (p)
      { $sort: { status: 1, created_at: -1 } },
      // Deduplicate strictly by filename ONLY if state is 'uttar pardesh', otherwise use _id
      {
        $group: {
          _id: {
            $cond: {
              if: {
                $eq: [
                  { $toLower: { $trim: { input: { $ifNull: ["$state", ""] } } } },
                  "uttar pardesh"
                ]
              },
              then: {
                $cond: {
                  if: { $gt: [{ $size: { $ifNull: ["$files", []] } }, 0] },
                  then: { $arrayElemAt: ["$files.filename", 0] },
                  else: "$_id"
                }
              },
              else: "$_id"
            }
          },
          doc: { $first: "$$ROOT" }
        }
      },
      // Restore the root document for further processing
      { $replaceRoot: { newRoot: "$doc" } },
      // Now group by State and City to get precise PDF/Hospital counts
      {
        $group: {
          _id: {
            state: { $toLower: { $trim: { input: { $ifNull: ["$state", "Unknown"] } } } },
            city: { $toLower: { $trim: { input: { $ifNull: ["$city", "Unknown"] } } } }
          },
          originalState: { $first: { $ifNull: ["$state", "Unknown"] } },
          hospitalsInCity: { $sum: 1 }, 
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
      // Finally, group by state for the UI tabular data
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
