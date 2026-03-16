'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PdfViewer } from '@/components/dashboard/pdf-viewer';
import { JsonViewer } from '@/components/dashboard/json-viewer';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home, Package, Maximize2, Minimize2 } from 'lucide-react';

interface File {
  filename: string;
  blob_url: string;
}

interface Job {
  _id: string;
  project_id: string;
  status: string;
  files?: File[];
  parsed_data?: unknown;
  created_at?: string;
}

export default function JobComparisonPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullViewPdf, setFullViewPdf] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch job details
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        if (!jobRes.ok) throw new Error('Failed to fetch job');

        const jobData = await jobRes.json();
        setJob(jobData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId]);

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'secondary',
      pending: 'outline',
      failed: 'destructive',
      processing: 'default',
    };
    return statusMap[status.toLowerCase()] || 'outline';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-linear-to-br from-background via-background to-background/95 overflow-hidden">
      {/* Full-Screen Header */}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Spinner />
              <p className="text-muted-foreground">Loading job details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-destructive/15">
                <span className="text-2xl text-destructive">⚠️</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-destructive">Failed to Load Job</p>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
              <button
                onClick={() => router.back()}
                className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : job ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Job Information Panel */}
            <div className="shrink-0 border-b border-border/50 bg-muted/40 px-6 py-2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Job Status</p>
                  <Badge variant={getStatusColor(job.status)} className="text-xs py-0.5 px-2">
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Badge>
                </div>

                <div className="flex items-center gap-6">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source Files</p>
                    <p className="text-xs font-semibold text-foreground">{job.files?.length || 0} File{job.files?.length !== 1 ? 's' : ''}</p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</p>
                    <p className="text-xs font-semibold text-foreground">{formatDate(job.created_at)}</p>
                  </div>

                  {job.files && job.files.length > 0 && (
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">File Name</p>
                      <p className="text-xs font-semibold text-foreground truncate max-w-xs">{job.files[0].filename}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFullViewPdf(!fullViewPdf)}
                    className="h-8 text-xs"
                  >
                    {fullViewPdf ? (
                      <>
                        <Minimize2 className="w-3 h-3 mr-1" />
                        Split View
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3 h-3 mr-1" />
                        Full PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Split View Container - Perfect 50/50 or Full PDF */}
            <div className="flex-1 flex overflow-hidden">
              {/* PDF Viewer - 50% or 100% */}
              <div className={`flex flex-col bg-background ${fullViewPdf ? 'w-full' : 'w-1/2 border-r border-border/50'} overflow-hidden`}>
                <div className="flex-1 overflow-hidden">
                  {job.files && job.files.length > 0 ? (
                    <PdfViewer
                      pdfUrl={job.files[0].blob_url}
                      fileName={job.files[0].filename}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="text-3xl">📭</div>
                        <p className="text-sm text-muted-foreground font-medium">No files available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* JSON Viewer - 50% (hidden in full PDF view) */}
              {!fullViewPdf && (
                <div className="w-1/2 flex flex-col bg-background overflow-hidden">
                  <div className="flex-1 overflow-hidden">
                    {job.parsed_data ? (
                      <JsonViewer data={job.parsed_data} expanded={true} />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <div className="text-3xl">📋</div>
                          <p className="text-sm text-muted-foreground font-medium">No parsed data</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-4xl">❓</div>
              <p className="text-muted-foreground">No job data found</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
