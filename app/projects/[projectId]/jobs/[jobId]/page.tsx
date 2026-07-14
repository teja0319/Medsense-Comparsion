'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ParsedDetailsViewer } from '@/components/dashboard/parsed-details-viewer';
import { JsonViewer } from '@/components/dashboard/json-viewer';
import { PdfViewer } from '@/components/dashboard/pdf-viewer';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Code2, LayoutList, Clock, Hash } from 'lucide-react';

interface FileInfo {
  filename: string;
  blob_url: string;
}

interface Job {
  _id: string;
  project_id: string;
  status: string;
  files?: FileInfo[];
  parsed_data?: Record<string, unknown>;
  duplicate_check?: Record<string, unknown>;
  created_at?: string;
}

type ViewMode = 'parsed' | 'json';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('parsed');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
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
    <div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-800 overflow-hidden">
      {/* Floating Header Bar */}
      <div className="shrink-0 my-4 mx-4 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/30 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/projects/${projectId}`)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100/60 border border-slate-200/80 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </button>
            {job && (
              <>
                <div className="h-5 w-px bg-slate-200" />
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusColor(job.status)} className="text-xs py-0.5 px-2.5 capitalize">
                    {job.status}
                  </Badge>
                  {job.files && job.files.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="font-semibold text-slate-700 max-w-xs truncate" title={job.files[0].filename}>
                        {job.files[0].filename}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* View Mode Toggle */}
          {job && (
            <div className="flex items-center gap-1 bg-slate-100/80 rounded-xl p-1 border border-slate-200/60">
              <button
                onClick={() => setViewMode('parsed')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  viewMode === 'parsed'
                    ? 'bg-white text-primary border border-slate-200 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                Parsed Details
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  viewMode === 'json'
                    ? 'bg-white text-primary border border-slate-200 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                JSON View
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Spinner />
              <p className="text-muted-foreground text-sm">Loading comparison view...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-destructive">Failed to Load Job</p>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
              <button
                onClick={() => router.back()}
                className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-semibold shadow-sm"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : job ? (
          <div className="flex-1 flex overflow-hidden border border-white/[0.06] bg-slate-900/10 rounded-2xl backdrop-blur-md shadow-2xl">
            
            {/* Left 50% — PDF Viewer */}
            <div className="w-1/2 border-r border-white/[0.06] flex flex-col overflow-hidden bg-slate-950/20">
              {job.files && job.files.length > 0 ? (
                <PdfViewer
                  pdfUrl={job.files[0].blob_url}
                  fileName={job.files[0].filename}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <FileText className="w-8 h-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-xs text-muted-foreground font-medium">No PDF file associated with this job</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right 50% — Parsed Details / JSON View */}
            <div className="w-1/2 flex flex-col overflow-hidden bg-transparent">
              {(() => {
                let sanitizedData = job.parsed_data;
                if (sanitizedData) {
                  try {
                    sanitizedData = JSON.parse(JSON.stringify(sanitizedData));
                    
                    // Inject duplicate_check object if it exists at root
                    if (job.duplicate_check) {
                      sanitizedData.duplicate_check = JSON.parse(JSON.stringify(job.duplicate_check));
                    }

                    // Find photo_comparison key case-insensitively
                    const photoCompKey = Object.keys(sanitizedData).find(k => 
                      k.toLowerCase().includes('photo_comparison') || 
                      k.toLowerCase().includes('photo comparison')
                    );
                    if (photoCompKey && sanitizedData[photoCompKey] && typeof sanitizedData[photoCompKey] === 'object') {
                      const similarityKey = Object.keys(sanitizedData[photoCompKey]).find(k => 
                        k.toLowerCase().includes('similarity')
                      );
                      if (similarityKey) {
                        delete sanitizedData[photoCompKey][similarityKey];
                      }
                    }
                  } catch (e) {
                    console.error('Failed to sanitize similarity:', e);
                  }
                } else if (job.duplicate_check) {
                  // If parsed_data is empty but duplicate_check exists, initialize it
                  sanitizedData = { duplicate_check: JSON.parse(JSON.stringify(job.duplicate_check)) };
                }

                if (viewMode === 'parsed') {
                  return sanitizedData ? (
                    <ParsedDetailsViewer data={sanitizedData} />
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto border border-border/30">
                          <LayoutList className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">No parsed data available</p>
                      </div>
                    </div>
                  );
                } else {
                  return sanitizedData ? (
                    <JsonViewer data={sanitizedData} expanded={true} />
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto border border-border/30">
                          <Code2 className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">No JSON data available</p>
                      </div>
                    </div>
                  );
                }
              })()}
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
