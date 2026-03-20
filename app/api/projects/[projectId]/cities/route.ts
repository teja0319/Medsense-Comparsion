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

    // Fetch all jobs for this project
    const jobs = await jobsCollection
      .find({ project_id: projectId })
      .sort({ created_at: -1 })
      .toArray();

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
