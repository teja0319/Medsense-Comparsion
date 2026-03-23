export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';

interface ParsedProcedure {
  'Procedure Codes'?: string;
  Specialty?: string;
  Procedures?: string;
  Inclusions?: string;
  'General /Economy Ward Ac'?: number;
  'Semi Pvt/ Twin Sharing AC'?: number;
  'Private /Single Room AC'?: number;
  Remarks?: string;
  delux?: number;
}

interface ParsedData {
  Hospid?: string;
  Hospname?: string;
  City?: string;
  State?: string;
  procedures?: ParsedProcedure[];
}

interface Job {
  _id?: any;
  parsed_data?: ParsedData;
  files?: Array<{ filename: string }>;
}

interface CityData {
  city: string;
  normalizedCity?: string;
  jobs: Job[];
}

interface StateData {
  state: string;
  normalizedState?: string;
  cities: CityData[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB_NAME || 'admin');
    const jobsCollection = db.collection('parsing_jobs');
    const stateParam = request.nextUrl.searchParams.get('state');

    const query: any = { project_id: projectId };
    if (stateParam) {
      // Use regex for case-insensitive state matching
      query.state = { $regex: new RegExp(`^${stateParam.trim()}$`, 'i') };
    }

    // Fetch all jobs for this project with a strict projection to avoid hanging the UI
    let jobs = await jobsCollection
      .find(
        query,
        {
          projection: {
            state: 1,
            city: 1,
            status: 1,
            'parsed_data.Hospname': 1,
            'parsed_data.Hospid': 1,
            'parsed_data.procedures': 1,
            'files.filename': 1,
            created_at: 1
          }
        }
      )
      .sort({ created_at: -1 })
      .toArray();

    // Deduplicate jobs by filename ONLY for UTTAR PARDESH
    // Preference is given to 'completed' status
    const uniqueJobsMap = new Map<string, any>();
    jobs.forEach((job) => {
      const isUP = job.state && job.state.trim().toLowerCase() === 'uttar pardesh';
      let key = job._id.toString();
      
      if (isUP && job.files && job.files.length > 0) {
        key = job.files[0].filename;
      }
      
      if (!uniqueJobsMap.has(key)) {
        uniqueJobsMap.set(key, job);
      } else {
        const existing = uniqueJobsMap.get(key);
        if (job.status === 'completed' && existing.status !== 'completed') {
          uniqueJobsMap.set(key, job);
        }
      }
    });
    jobs = Array.from(uniqueJobsMap.values());

    // Group jobs by state, then by city
    const statesMap = new Map<
      string,
      { originalState: string; citiesMap: Map<string, { originalCity: string; jobs: Job[] }> }
    >();

    jobs.forEach((job: any) => {
      const originalState = job.state || 'Unknown';
      const normalizedState = originalState.toLowerCase().trim();
      const originalCity = job.city || 'Unknown';
      const normalizedCity = originalCity.toLowerCase().trim();

      if (!statesMap.has(normalizedState)) {
        statesMap.set(normalizedState, {
          originalState,
          citiesMap: new Map(),
        });
      }

      const stateData = statesMap.get(normalizedState)!;
      if (!stateData.citiesMap.has(normalizedCity)) {
        stateData.citiesMap.set(normalizedCity, {
          originalCity,
          jobs: [],
        });
      }
      stateData.citiesMap.get(normalizedCity)!.jobs.push(job);
    });

    // Convert to nested array structure
    const states: StateData[] = Array.from(statesMap.entries())
      .map(([normalizedState, { originalState, citiesMap }]) => ({
        state: originalState,
        normalizedState,
        cities: Array.from(citiesMap.entries()).map(
          ([normalizedCity, { originalCity, jobs: cityJobs }]) => ({
            city: originalCity,
            normalizedCity,
            jobs: cityJobs,
          })
        ),
      }))
      .sort((a, b) => (a.normalizedState || '').localeCompare(b.normalizedState || ''));

    // Sort cities within each state
    states.forEach((state) => {
      state.cities.sort((a, b) =>
        (a.normalizedCity || '').localeCompare(b.normalizedCity || '')
      );
    });

    return NextResponse.json({
      states,
      total: states.length,
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}
