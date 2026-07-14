import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("JobsMetadata");

    const stats = await collection.aggregate([
      { $match: { sessionId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          items: { 
            $push: { 
              filename: "$filename", 
              city: "$cityname", 
              state: "$statename", 
              error: "$error",
              externalJobId: "$externalJobId"
            } 
          }
        }
      }
    ]).toArray();

    const formattedStats: any = {
      total: 0,
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
      details: {}
    };

    stats.forEach(group => {
      formattedStats[group._id] = group.count;
      formattedStats.total += group.count;
      formattedStats.details[group._id] = group.items;
    });

    return NextResponse.json(formattedStats);

  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch job status", details: error.message },
      { status: 500 }
    );
  }
}
