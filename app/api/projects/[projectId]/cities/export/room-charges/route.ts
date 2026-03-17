import { NextRequest, NextResponse } from 'next/server';
import { buildRoomChargeRows, createExportResponse, fetchJobs } from '../utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const stateParam = request.nextUrl.searchParams.get('state') || undefined;
    const cityParam = request.nextUrl.searchParams.get('city') || undefined;
    const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'excel';

    const jobs = await fetchJobs(projectId, stateParam, cityParam);
    const rows = buildRoomChargeRows(jobs);

    const stateStr = stateParam ? `_${stateParam}` : '';
    const cityStr = cityParam ? `_${cityParam}` : '';
    const base = `Hospital_RoomCharges${stateStr}${cityStr}` || 'Hospital_RoomCharges';
    const filenameBase = `${base}_${new Date().toISOString().split('T')[0]}`;

    return createExportResponse(rows, filenameBase, format);
  } catch (error) {
    console.error('Error generating room charges export:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(
      JSON.stringify({ error: 'Failed to generate room charges export', message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
