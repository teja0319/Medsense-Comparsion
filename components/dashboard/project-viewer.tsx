'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

const PROJECT_ID = '857d529e-75cf-4210-bea3-ca023a15ed1d';

interface ProjectJob {
  _id: string;
  status: string;
  city?: string;
  state?: string;
  files?: Array<{ filename: string }>;
  created_at?: string;
}

interface ProjectStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  pending: number;
}

export function ProjectViewer() {
  const [jobs, setJobs] = useState<ProjectJob[]>([]);
  const [stats, setStats] = useState<ProjectStats>({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectData();
  }, []);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all jobs for this project
      const response = await fetch(`/api/projects/${PROJECT_ID}/jobs?page=1&limit=100`);
      if (!response.ok) throw new Error('Failed to fetch project data');
      
      const data = await response.json();
      setJobs(data.jobs || []);
      
      if (data.counts) {
        setStats(data.counts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
    }
    if (statusLower === 'failed') {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
    }
    if (statusLower === 'processing') {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Processing</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return <ProjectViewerSkeleton />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Project Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Project Overview</h2>
        <p className="text-gray-600 mt-1">ID: {PROJECT_ID}</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.processing}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Project Jobs</CardTitle>
          <CardDescription>All jobs in this project</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No jobs found in this project.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Job ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">City</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">State</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Files</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 truncate max-w-xs">
                        {job._id}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(job.status)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{job.city || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{job.state || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {job.files?.length || 0} file(s)
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(job.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectViewerSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Project Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-slate-150" />
        <Skeleton className="h-4 w-64 bg-slate-100" />
      </div>

      {/* Stats Cards Skeletons */}
      <div className="grid grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-20 bg-slate-100" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12 bg-slate-150" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Jobs List Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 bg-slate-150" />
          <Skeleton className="h-4 w-48 bg-slate-100 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="border-b border-gray-200 pb-2">
              <div className="grid grid-cols-6 gap-4">
                <Skeleton className="h-4 w-16 bg-slate-200" />
                <Skeleton className="h-4 w-12 bg-slate-200" />
                <Skeleton className="h-4 w-12 bg-slate-200" />
                <Skeleton className="h-4 w-12 bg-slate-200" />
                <Skeleton className="h-4 w-16 bg-slate-200" />
                <Skeleton className="h-4 w-20 bg-slate-200" />
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-6 gap-4 py-2 border-b border-slate-100 last:border-0">
                <Skeleton className="h-4 w-32 bg-slate-100" />
                <Skeleton className="h-5 w-16 bg-slate-100 rounded-full" />
                <Skeleton className="h-4 w-20 bg-slate-100" />
                <Skeleton className="h-4 w-20 bg-slate-100" />
                <Skeleton className="h-4 w-16 bg-slate-100" />
                <Skeleton className="h-4 w-24 bg-slate-100" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
