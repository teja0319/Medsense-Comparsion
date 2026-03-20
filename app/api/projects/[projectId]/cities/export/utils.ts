import { getMongoClient } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export interface ParsedProcedure {
  'Procedure Codes'?: string;
  Specialty?: string;
  Procedures?: string;
  Inclusions?: string;
  'General /Economy Ward Ac'?: number;
  'Semi Pvt/ Twin Sharing AC'?: number;
  'Private /Single Room AC'?: number;
  Remarks?: string;
  delux?: number | string;
}

export interface ParsedData {
  Hospid?: string;
  Hospname?: string;
  City?: string;
  procedures?: ParsedProcedure[];
  // allow any additional fields for terms/notes/room charges
  [key: string]: any;
}

export interface Job {
  _id?: any;
  parsed_data?: ParsedData;
  files?: Array<{ filename: string }>;
}

export function extractHospitalInfoFromFilename(filename: string): { name: string; id: string } {
  // Format: "HospitalName-12345.pdf" or "Hospital%20Name-12345.pdf"
  const match = filename.match(/^(.+?)-(\d{5})\.pdf$/);
  if (match) {
    let name = match[1];
    const id = match[2];

    // Decode URL-encoded characters
    try {
      name = decodeURIComponent(name);
      // Replace underscores with spaces
      name = name.replace(/_/g, ' ');
    } catch (e) {
      // If decoding fails, just use as is
    }

    return { name, id };
  }
  return { name: '', id: '' };
}

export function convertToCSV(rows: any[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell ?? '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');
}

export function convertToExcelHtml(rows: any[][]): string {
  const escapeHtml = (value: any) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const tableStyle = 'border-collapse:collapse;width:100%;';
  const headerStyle =
    'background-color:#FFFF00;font-weight:bold;border:1px solid #000;white-space:normal;padding:4px;';
  const cellStyle =
    'border:1px solid #000;white-space:normal;word-break:break-word;word-wrap:break-word;padding:4px;';

  const rowsHtml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell) => {
          const value = escapeHtml(cell);
          if (rowIndex === 0) {
            return `<th style="${headerStyle}">${value}</th>`;
          }
          return `<td style="${cellStyle}">${value}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table style="${tableStyle}">${rowsHtml}</table></body></html>`;
}

export async function fetchJobs(projectId: string, stateParam?: string, cityParam?: string): Promise<Job[]> {
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
  const jobsCollection = db.collection('parsing_jobs');

  const query: any = { project_id: projectId };
  if (stateParam) {
    query['state'] = { $regex: `^${stateParam.trim()}$`, $options: 'i' };
  }
  if (cityParam) {
    query['city'] = { $regex: `^${cityParam.trim()}$`, $options: 'i' };
  }

  return jobsCollection.find(query).sort({ created_at: -1 }).toArray();
}

export function buildHospitalInfo(job: Job) {
  const parsedData = job.parsed_data;
  let hospId = '';
  let hospName = '';

  if (job.files && job.files.length > 0) {
    const filenameInfo = extractHospitalInfoFromFilename(job.files[0].filename);
    hospId = filenameInfo.id || parsedData?.Hospid || '';
    hospName = filenameInfo.name || parsedData?.Hospname || '';
  } else {
    hospId = parsedData?.Hospid || '';
    hospName = parsedData?.Hospname || '';
  }

  const city = (job as any).city || parsedData?.City || '';
  return { hospId, hospName, city };
}

const normalizeKey = (key: string) => key.replace(/\s+/g, '').toLowerCase();

const findField = (data: any, candidates: string[]) => {
  if (!data || typeof data !== 'object') return undefined;
  const normalizedCandidates = candidates.map((c) => normalizeKey(c));
  return Object.keys(data).reduce<any>((found, key) => {
    if (found !== undefined) return found;
    const normalizedKey = normalizeKey(key);
    if (normalizedCandidates.includes(normalizedKey)) {
      return data[key];
    }
    return undefined;
  }, undefined);
};

const getStringValue = (value: any) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

export function extractTermsAndNotes(parsedData: any) {
  const terms = findField(parsedData, [
    'terms',
    'termsandconditions',
    'terms & conditions',
    'termsandconditions',
    'terms_and_notes',
  ]);
  const conditions = findField(parsedData, [
    'conditions',
    'termsandconditions',
    'terms & conditions',
    'terms_and_notes',
  ]);
  const notes = findField(parsedData, ['notes', 'note', 'terms_and_notes']);

  const normalizeText = (value: any) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
  };

  const normalizeNotes = (value: any): string[] => {
    if (Array.isArray(value)) {
      return value.map((v) => normalizeText(v)).filter(Boolean);
    }

    const asString = normalizeText(value);
    if (!asString) return [];

    // If multi-line string, split into lines.
    return asString.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  };

  return {
    terms: normalizeText(terms),
    conditions: normalizeText(conditions),
    notes: normalizeNotes(notes),
  };
}

export function extractRoomCharges(parsedData: any) {
  const raw = findField(parsedData, [
    'roomcharges',
    'room_charges',
    'room charge',
    'room charges',
    'roomcharge',
    'room_tariff_and_charges',
  ]);

  const prettifyKey = (key: string) =>
    key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (match) => match.toUpperCase());

  const normalizeValue = (value: any) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    const num = Number(value);
    return Number.isNaN(num) ? String(value) : num;
  };

  const extractDescription = (item: any) =>
    getStringValue(item?.description ?? item?.desc ?? item?.details) || 'NA';

  const extractRemarks = (item: any) =>
    getStringValue(item?.remarks ?? item?.remark) || 'NA';

  const expandItem = (item: any) => {
    const description = extractDescription(item);
    const remarks = extractRemarks(item);

    if (!item || typeof item !== 'object') {
      return [
        {
          header: 'N/A',
          value: 0,
          description,
          remarks,
        },
      ];
    }

    const keys = Object.keys(item).filter(
      (k) =>
        !['description', 'desc', 'details', 'remarks', 'remark'].includes(
          k.toLowerCase()
        )
    );

    const rows = keys.map((key) => ({
      header: prettifyKey(key),
      value: normalizeValue(item[key]),
      description,
      remarks,
    }));

    // If no numeric keys, fall back to a generic row
    if (rows.length === 0) {
      return [
        {
          header: 'N/A',
          value: 0,
          description,
          remarks: 'NA',
        },
      ];
    }

    return rows;
  };

  if (Array.isArray(raw)) {
    return raw.flatMap((item) => expandItem(item));
  }

  if (raw && typeof raw === 'object') {
    return expandItem(raw);
  }

  return [{ header: 'N/A', value: 0, description: 'NA', remarks: 'NA' }];
}

export function buildProceduresRows(jobs: Job[]) {
  const rows: any[][] = [
    [
      'Hospid',
      'Hospname',
      'Procedure Codes',
      'Specialty',
      'Procedures',
      'General /Economy Ward Ac',
      'Semi Pvt/ Twin Sharing AC',
      'Private /Single Room AC',
      'Remarks',
      'Delux',
    ],
  ];

  jobs.forEach((job) => {
    const parsedData = job.parsed_data;
    if (!parsedData) return;

    const { hospId, hospName } = buildHospitalInfo(job);
    const procedures = parsedData.procedures || [];

    procedures.forEach((proc: ParsedProcedure) => {
      const inclusions = proc.Inclusions?.trim() || '';
      const remarksValue = proc.Remarks?.trim() || '';

      const remarks = [inclusions, remarksValue]
        .filter(Boolean)
        .join(' | ');

      rows.push([
        hospId,
        hospName,
        proc['Procedure Codes'] || 'NA',
        proc.Specialty || '',
        proc.Procedures || '',
        proc['General /Economy Ward Ac'] ?? '',
        proc['Semi Pvt/ Twin Sharing AC'] ?? '',
        proc['Private /Single Room AC'] ?? '',
        remarks || 'NA',
        Number(String(proc.delux ?? '').trim()) || 0,
      ]);
    });
  });

  return rows;
}

export function buildTermsRows(jobs: Job[]) {
  const rows: any[][] = [['Hospid', 'Hospname', 'City', 'Note']];

  jobs.forEach((job) => {
    const parsedData = job.parsed_data;
    if (!parsedData) return;

    const { hospId, hospName, city } = buildHospitalInfo(job);
    const { notes } = extractTermsAndNotes(parsedData);

    if (notes.length === 0) {
      rows.push([hospId, hospName, city, '']);
      return;
    }

    notes.forEach((note) => {
      rows.push([hospId, hospName, city, note]);
    });
  });

  return rows;
}

export function buildRoomChargeRows(jobs: Job[]) {
  const rows: any[][] = [
    ['Hospid', 'Hospname', 'City', 'Header', 'Value', 'Description', 'Remarks'],
  ];

  jobs.forEach((job) => {
    const parsedData = job.parsed_data;
    if (!parsedData) return;

    const { hospId, hospName, city } = buildHospitalInfo(job);
    const items = extractRoomCharges(parsedData);

    items.forEach((item: any) => {
      rows.push([
        hospId,
        hospName,
        city,
        item.header,
        item.value ?? 0,
        item.description ?? 'NA',
        item.remarks ?? 'NA',
      ]);
    });
  });

  return rows;
}

export function createExportResponse(
  rows: any[][],
  filenameBase: string,
  format: 'excel' | 'csv' = 'excel'
) {
  const isCsv = format === 'csv';
  const filename = `${filenameBase}.${isCsv ? 'csv' : 'xls'}`;

  if (isCsv) {
    const csv = convertToCSV(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment;filename="${filename}"`,
      },
    });
  }

  const html = convertToExcelHtml(rows);
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.ms-excel;charset=utf-8',
      'Content-Disposition': `attachment;filename="${filename}"`,
    },
  });
}
