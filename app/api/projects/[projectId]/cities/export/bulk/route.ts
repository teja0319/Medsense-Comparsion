'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import {
  buildProceduresRows,
  buildTermsRows,
  buildRoomChargeRows,
  convertToExcelHtml,
} from '../utils';

// CRC-32 table for ZIP calculation
const CRC32_TABLE: number[] = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c >>> 0;
}

function calculateCrc32(data: Buffer): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

// Simple ZIP creation with proper CRC-32
function createZipBuffer(files: Array<{ name: string; data: string }>): Buffer {
  const fileBuffers: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;

  files.forEach((file) => {
    const buffer = Buffer.from(file.data, 'utf-8');
    const filename = file.name;
    const filenameBytes = Buffer.from(filename, 'utf-8');
    const crc32 = calculateCrc32(buffer);

    // Local file header
    const localFileHeader = Buffer.alloc(30 + filenameBytes.length);
    localFileHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localFileHeader.writeUInt16LE(20, 4); // Version needed
    localFileHeader.writeUInt16LE(0, 6); // Flags
    localFileHeader.writeUInt16LE(0, 8); // Compression method (0 = no compression)
    localFileHeader.writeUInt32LE(0, 10); // File modification time & date
    localFileHeader.writeUInt32LE(crc32, 14); // CRC-32
    localFileHeader.writeUInt32LE(buffer.length, 18); // Compressed size
    localFileHeader.writeUInt32LE(buffer.length, 22); // Uncompressed size
    localFileHeader.writeUInt16LE(filenameBytes.length, 26); // Filename length
    localFileHeader.writeUInt16LE(0, 28); // Extra field length
    filenameBytes.copy(localFileHeader, 30);

    const combinedFile = Buffer.concat([localFileHeader, buffer]);
    fileBuffers.push(combinedFile);

    // Central directory entry
    const centralDirEntry = Buffer.alloc(46 + filenameBytes.length);
    centralDirEntry.writeUInt32LE(0x02014b50, 0); // Signature
    centralDirEntry.writeUInt16LE(20, 4); // Version made by
    centralDirEntry.writeUInt16LE(20, 6); // Version needed
    centralDirEntry.writeUInt16LE(0, 8); // Flags
    centralDirEntry.writeUInt16LE(0, 10); // Compression method
    centralDirEntry.writeUInt32LE(0, 12); // File mod time & date
    centralDirEntry.writeUInt32LE(crc32, 16); // CRC-32
    centralDirEntry.writeUInt32LE(buffer.length, 20); // Compressed size
    centralDirEntry.writeUInt32LE(buffer.length, 24); // Uncompressed size
    centralDirEntry.writeUInt16LE(filenameBytes.length, 28); // Filename length
    centralDirEntry.writeUInt16LE(0, 30); // Extra field length
    centralDirEntry.writeUInt16LE(0, 32); // File comment length
    centralDirEntry.writeUInt16LE(0, 34); // Disk number
    centralDirEntry.writeUInt16LE(0, 36); // Internal file attributes
    centralDirEntry.writeUInt32LE(0, 38); // External file attributes
    centralDirEntry.writeUInt32LE(offset, 42); // Local header offset
    filenameBytes.copy(centralDirEntry, 46);

    centralDirectory.push(centralDirEntry);
    offset += combinedFile.length;
  });

  // End of central directory
  const centralDirData = Buffer.concat(centralDirectory);
  const endOfCentralDir = Buffer.alloc(22);
  endOfCentralDir.writeUInt32LE(0x06054b50, 0); // Signature
  endOfCentralDir.writeUInt16LE(0, 4); // Disk number
  endOfCentralDir.writeUInt16LE(0, 6); // Disk with central dir
  endOfCentralDir.writeUInt16LE(files.length, 8); // Entries on this disk
  endOfCentralDir.writeUInt16LE(files.length, 10); // Total entries
  endOfCentralDir.writeUInt32LE(centralDirData.length, 12); // Size of central dir
  endOfCentralDir.writeUInt32LE(offset, 16); // Offset of central dir
  endOfCentralDir.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...fileBuffers, centralDirData, endOfCentralDir]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const stateParam = request.nextUrl.searchParams.get('state');
    const cityParam = request.nextUrl.searchParams.get('city');

    if (!stateParam) {
      return NextResponse.json(
        { error: 'State parameter is required' },
        { status: 400 }
      );
    }

    console.log(`Processing ZIP export - State: ${stateParam}, City: ${cityParam}`);

    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobsCollection = db.collection('parsing_jobs');

    // Build query with state and optional city filter
    const stateRegex = new RegExp(stateParam, 'i');
    const query: any = {
      project_id: projectId,
      'parsed_data.State': stateRegex,
    };

    if (cityParam) {
      const cityRegex = new RegExp(cityParam, 'i');
      query['parsed_data.City'] = cityRegex;
    }

    // Fetch jobs
    const jobs = await jobsCollection.find(query).toArray();
    console.log(`Found ${jobs.length} jobs for export`);

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: 'No data found for the specified state/city' },
        { status: 404 }
      );
    }

    // Build export data
    const proceduresRows = buildProceduresRows(jobs);
    const termsRows = buildTermsRows(jobs);
    const roomChargeRows = buildRoomChargeRows(jobs);

    console.log(`Data rows - Procedures: ${proceduresRows.length}, Terms: ${termsRows.length}, Room: ${roomChargeRows.length}`);

    // Convert to HTML (Excel format)
    const proceduresHtml = convertToExcelHtml(proceduresRows);
    const termsHtml = convertToExcelHtml(termsRows);
    const roomChargeHtml = convertToExcelHtml(roomChargeRows);

    // Get state and city folder names
    const folderState = stateParam.replace(/\s+/g, '_');
    const folderCity = cityParam ? cityParam.replace(/\s+/g, '_') : 'All_Cities';
    const folderPath = `Extraction Of Hospital Data/${folderState}/${folderCity}`;

    // Create ZIP
    const zipBuffer = createZipBuffer([
      { name: `${folderPath}/procedures.xls`, data: proceduresHtml },
      { name: `${folderPath}/terms_and_notes.xls`, data: termsHtml },
      { name: `${folderPath}/room_charges.xls`, data: roomChargeHtml },
    ]);

    const filename = `Hospital_Data_${folderState}_${cityParam ? folderCity : 'All_Cities'}.zip`;

    console.log(`Created ZIP file: ${filename}, size: ${zipBuffer.length} bytes`);

    // Return ZIP as response
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(zipBuffer.length),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error creating bulk export:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create bulk export';
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
