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

    const tab = request.nextUrl.searchParams.get('tab') || 'queue';

    let query: any = { project_id: projectId };

    if (tab === 'queue') {
      query.manually_verified_no_procedures = { $ne: true };
      query.needs_different_pdf = { $ne: true };
      query.needs_reprocessing = { $ne: true };
      query.$or = [
        { 'parsed_data.procedures': { $exists: false } },
        { 'parsed_data.procedures': { $size: 0 } },
        { 'parsed_data.procedures': null },
        { parsed_data: null },
        { parsed_data: { $exists: false } },
      ];
    } else if (tab === 'verified_empty') {
      query.manually_verified_no_procedures = true;
    } else if (tab === 'needs_reprocessing') {
      query.needs_reprocessing = true;
    } else if (tab === 'different_pdf') {
      query.needs_different_pdf = true;
    }

    // Get counts for tabs
    const [queueCount, verifiedCount, reprocessingCount, diffPdfCount] = await Promise.all([
      jobsCollection.countDocuments({
        project_id: projectId,
        manually_verified_no_procedures: { $ne: true },
        needs_different_pdf: { $ne: true },
        needs_reprocessing: { $ne: true },
        $or: [
          { 'parsed_data.procedures': { $exists: false } },
          { 'parsed_data.procedures': { $size: 0 } },
          { 'parsed_data.procedures': null },
          { parsed_data: null },
          { parsed_data: { $exists: false } },
        ]
      }),
      jobsCollection.countDocuments({ project_id: projectId, manually_verified_no_procedures: true }),
      jobsCollection.countDocuments({ project_id: projectId, needs_reprocessing: true }),
      jobsCollection.countDocuments({ project_id: projectId, needs_different_pdf: true })
    ]);

    const tabCounts = {
      queue: queueCount,
      verified_empty: verifiedCount,
      needs_reprocessing: reprocessingCount,
      different_pdf: diffPdfCount
    };

    const jobs = await jobsCollection
      .find(query, {
        projection: {
          state: 1,
          city: 1,
          status: 1,
          'files.filename': 1,
          'files.blob_url': 1,
          parsed_data: 1,
          created_at: 1,
        },
      })
      .sort({ state: 1, city: 1, created_at: -1 })
      .toArray();

    const statusCounts = {
      total: jobs.length,
      completed: 0,
      failed: 0,
      processing: 0,
      pending: 0,
    };

    // Build clean response
    const hospitals = jobs.map((job) => {
      let hospName = '';
      let hospCode = '';

      if (job.status === 'completed') statusCounts.completed++;
      else if (job.status === 'failed') statusCounts.failed++;
      else if (job.status === 'processing') statusCounts.processing++;
      else if (job.status === 'pending') statusCounts.pending++;

      if (job.files && job.files.length > 0) {
        const match = job.files[0].filename.match(/^(.+?)[-+_\s]*(\d+)\.pdf$/i);
        if (match) {
          try {
            hospName = decodeURIComponent(match[1]).replace(/_/g, ' ').trim();
          } catch {
            hospName = match[1].replace(/_/g, ' ').trim();
          }
          hospCode = match[2];
        }
      }

      // Fallback to parsed_data if filename didn't give us info
      // if (!hospName) hospName = job.parsed_data?.Hospname || 'Unknown Hospital';
      // if (!hospCode) hospCode = job.parsed_data?.Hospid || '';

      return {
        _id: String(job._id),
        hospName,
        hospCode,
        state: job.state || 'Unknown',
        city: job.city || 'Unknown',
        status: job.status || 'unknown',
        filename: job.files?.[0]?.filename || 'N/A',
        blobUrl: job.files?.[0]?.blob_url || '',
        parsedData: job.parsed_data || null,
      };
    });

    return NextResponse.json({
      hospitals,
      total: hospitals.length,
      statusCounts,
      tabCounts,
    });
  } catch (error) {
    console.error('Error fetching zero-procedure hospitals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zero-procedure hospitals' },
      { status: 500 }
    );
  }
}
