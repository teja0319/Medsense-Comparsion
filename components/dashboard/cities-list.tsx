'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Download, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface CityData {
  city: string;
  jobs: Array<{
    _id?: string;
    parsed_data?: {
      Hospname?: string;
      Hospid?: string;
      procedures?: any[];
    };
    files?: Array<{ filename: string }>;
  }>;
}

interface StateData {
  state: string;
  cities: CityData[];
}

interface StatesListProps {
  projectId: string;
}

export function CitiesList({ projectId }: StatesListProps) {
  const [states, setStates] = useState<StateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchStates();
  }, [projectId]);

  const fetchStates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/projects/${projectId}/cities`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch states');
      }

      const data = await response.json();
      setStates(data.states || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast.error(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const makeDownloadKey = (
    type: 'procedures' | 'terms' | 'room',
    state?: string,
    city?: string
  ) => `${type}:${state ?? 'all'}:${city ?? 'all'}`;

  const isDownloading = (
    type: 'procedures' | 'terms' | 'room',
    state?: string,
    city?: string
  ) => downloading === makeDownloadKey(type, state, city);

  const downloadExport = async (
    type: 'procedures' | 'terms' | 'room',
    state?: string,
    city?: string
  ) => {
    try {
      setDownloading(makeDownloadKey(type, state, city));

      const endpoint =
        type === 'procedures'
          ? 'procedures'
          : type === 'terms'
          ? 'terms'
          : 'room-charges';

      const params = new URLSearchParams({ format: 'excel' });
      if (state) params.set('state', state);
      if (city) params.set('city', city);

      const url = `/api/projects/${projectId}/cities/export/${endpoint}?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(
          `Failed to download export (${response.status} ${response.statusText})${
            errText ? `: ${errText.slice(0, 200)}` : ''
          }`
        );
      }

      const contentDisposition = response.headers.get('content-disposition');
      const defaultFilename = `hospital_${
        type === 'procedures'
          ? 'procedures'
          : type === 'terms'
          ? 'terms_and_notes'
          : 'room_charges'
      }_${state ? state.replace(/\s+/g, '_') : 'all'}_${city ? city.replace(/\s+/g, '_') : 'all'}.xls`;
      let filename = defaultFilename;
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="?([^\"]+)"?/);
        if (matches) {
          filename = matches[1];
        }
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);

      toast.success(
        `Downloaded ${
          type === 'procedures'
            ? 'procedures'
            : type === 'terms'
            ? 'terms & notes'
            : 'room charges'
        } for ${state ?? 'all states'}${city ? ` / ${city}` : ''}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Error: ${message}`);
    } finally {
      setDownloading(null);
    }
  };

  const downloadBulkZip = async (state: string, city?: string) => {
    try {
      const downloadKey = `bulk:${state}:${city ?? 'all'}`;
      setDownloading(downloadKey);

      const params = new URLSearchParams();
      params.set('state', state);
      if (city) params.set('city', city);

      const url = `/api/projects/${projectId}/cities/export/bulk?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(
          `Failed to download bulk export (${response.status} ${response.statusText})${
            errText ? `: ${errText.slice(0, 200)}` : ''
          }`
        );
      }

      const contentDisposition = response.headers.get('content-disposition');
      const defaultFilename = `Hospital_Data_${state.replace(/\s+/g, '_')}_${city ? city.replace(/\s+/g, '_') : 'All_Cities'}.zip`;
      let filename = defaultFilename;
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="?([^\"]+)"?/);
        if (matches) {
          filename = matches[1];
        }
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);

      toast.success(
        `Downloaded complete hospital data for ${state}${city ? ` / ${city}` : ''}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Error: ${message}`);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-6 text-center">
        <p className="text-destructive font-medium">{error}</p>
        <Button
          onClick={fetchStates}
          variant="outline"
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (states.length === 0) {
    return (
      <div className="rounded-lg bg-muted p-12 text-center">
        <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No states found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hospital Data by State</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {states.length} states with hospital procedures data
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => downloadExport('procedures')}
            disabled={isDownloading('procedures')}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isDownloading('procedures') ? 'Downloading...' : 'Download All'}
          </Button>
          <Button
            onClick={() => downloadExport('terms')}
            disabled={isDownloading('terms')}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isDownloading('terms') ? 'Downloading...' : 'Export Terms & Notes'}
          </Button>
          <Button
            onClick={() => downloadExport('room')}
            disabled={isDownloading('room')}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isDownloading('room') ? 'Downloading...' : 'Export Room Charges'}
          </Button>
        </div>
      </div>

      {states.map((stateData) => {
        const totalCities = stateData.cities.length;
        const totalHospitals = new Set(
          stateData.cities.flatMap((c) =>
            c.jobs.map((j) => j.parsed_data?.Hospname)
          )
        ).size;
        const totalProcedures = stateData.cities.reduce(
          (sum, city) =>
            sum +
            city.jobs.reduce(
              (citySum, job) => citySum + (job.parsed_data?.procedures?.length || 0),
              0
            ),
          0
        );

        return (
          <div key={stateData.state} className="space-y-4">
            <div className="rounded-lg border p-4 bg-card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {stateData.state}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{totalCities} city/cities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{totalHospitals} hospital(s)</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {totalProcedures} total procedures
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => downloadBulkZip(stateData.state)}
                  disabled={downloading === `bulk:${stateData.state}:all`}
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-3 w-3" />
                  {downloading === `bulk:${stateData.state}:all`
                    ? 'Creating ZIP...'
                    : 'Download All As ZIP'}
                </Button>
                <Button
                  onClick={() => downloadExport('procedures', stateData.state)}
                  disabled={isDownloading('procedures', stateData.state)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-3 w-3" />
                  {isDownloading('procedures', stateData.state)
                    ? 'Downloading...'
                    : 'Download All'}
                </Button>
                <Button
                  onClick={() => downloadExport('terms', stateData.state)}
                  disabled={isDownloading('terms', stateData.state)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-3 w-3" />
                  {isDownloading('terms', stateData.state)
                    ? 'Downloading...'
                    : 'Terms & Notes'}
                </Button>
                <Button
                  onClick={() => downloadExport('room', stateData.state)}
                  disabled={isDownloading('room', stateData.state)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-3 w-3" />
                  {isDownloading('room', stateData.state)
                    ? 'Downloading...'
                    : 'Room Charges'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-4">
              {stateData.cities.map((cityData) => {
                const totalHospitalsInCity = new Set(
                  cityData.jobs.map((j) => j.parsed_data?.Hospname)
                ).size;
                const totalProceduresInCity = cityData.jobs.reduce(
                  (sum, job) => sum + (job.parsed_data?.procedures?.length || 0),
                  0
                );

                return (
                  <Card
                    key={cityData.city}
                    className="p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {cityData.city}
                        </h4>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3" />
                            <span>{totalHospitalsInCity} hospital(s)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{totalProceduresInCity} procedures</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 py-2 border-t text-xs text-muted-foreground">
                        {cityData.jobs.slice(0, 2).map((job, idx) => (
                          <div key={idx} className="truncate">
                            • {job.parsed_data?.Hospname || 'Unknown Hospital'}
                          </div>
                        ))}
                        {cityData.jobs.length > 2 && (
                          <div className="text-xs italic pt-1">
                            +{cityData.jobs.length - 2} more
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 pt-1">
                        <Button
                          onClick={() =>
                            downloadBulkZip(stateData.state, cityData.city)
                          }
                          disabled={
                            downloading === `bulk:${stateData.state}:${cityData.city}`
                          }
                          size="sm"
                          className="gap-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="h-3 w-3" />
                          {downloading === `bulk:${stateData.state}:${cityData.city}`
                            ? 'Zipping...'
                            : 'ZIP'}
                        </Button>
                        <Button
                          onClick={() =>
                            downloadExport(
                              'procedures',
                              stateData.state,
                              cityData.city
                            )
                          }
                          disabled={isDownloading(
                            'procedures',
                            stateData.state,
                            cityData.city
                          )}
                          size="sm"
                          variant="outline"
                          className="gap-1"
                        >
                          <Download className="h-3 w-3" />
                          {isDownloading(
                            'procedures',
                            stateData.state,
                            cityData.city
                          )
                            ? 'DL...'
                            : 'Download'}
                        </Button>
                        <Button
                          onClick={() =>
                            downloadExport('terms', stateData.state, cityData.city)
                          }
                          disabled={isDownloading(
                            'terms',
                            stateData.state,
                            cityData.city
                          )}
                          size="sm"
                          variant="outline"
                          className="gap-1"
                        >
                          <Download className="h-3 w-3" />
                          {isDownloading('terms', stateData.state, cityData.city)
                            ? 'DL...'
                            : 'Terms'}
                        </Button>
                        <Button
                          onClick={() =>
                            downloadExport(
                              'room',
                              stateData.state,
                              cityData.city
                            )
                          }
                          disabled={isDownloading(
                            'room',
                            stateData.state,
                            cityData.city
                          )}
                          size="sm"
                          variant="outline"
                          className="gap-1"
                        >
                          <Download className="h-3 w-3" />
                          {isDownloading('room', stateData.state, cityData.city)
                            ? 'DL...'
                            : 'Room'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
