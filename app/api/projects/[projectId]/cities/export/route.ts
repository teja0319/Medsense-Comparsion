import { NextResponse } from 'next/server';

// This endpoint is retained for backward compatibility, but the preferred exports are:
// - /api/projects/[projectId]/cities/export/procedures
// - /api/projects/[projectId]/cities/export/terms
// - /api/projects/[projectId]/cities/export/room-charges

export async function GET() {
  return NextResponse.json(
    {
      error:
        'Invalid export endpoint. Use /procedures, /terms, or /room-charges instead.',
    },
    { status: 400 }
  );
}
