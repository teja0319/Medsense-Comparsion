'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  RefreshCw,
  Clock,
  CheckCircle2,
  Activity,
} from 'lucide-react';

interface ActiveAssignment {
  claimId: string;
  projectId: string;
  claimNumber: string;
  insuredName: string;
  assignedTo: string;
  assignedAt: string;
}

interface ReviewedClaim {
  claimId: string;
  projectId: string;
  claimNumber: string;
  insuredName: string;
  reviewedBy: string;
  completedAt: string;
}

interface QueuedClaim {
  claimId: string;
  projectId: string;
  claimNumber: string;
  insuredName: string;
  createdAt: string;
}

interface DashboardData {
  activeAssignments?: ActiveAssignment[];
  reviewHistory?: ReviewedClaim[];
  queueList?: QueuedClaim[];
}

export function ProcessMonitoring() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/claims/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load monitoring data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboard();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading) {
    return <ProcessMonitoringSkeleton />;
  }

  if (!dashboard) {
    return (
      <div className="text-center text-slate-400 py-12">
        Failed to load monitoring data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-3 gap-4 select-none">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{dashboard.activeAssignments?.length || 0}</p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Reviews</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{dashboard.queueList?.length || 0}</p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">In Queue</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{dashboard.reviewHistory?.length || 0}</p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Reviewed</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Process Overview</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchDashboard}
            className="h-7 text-xs gap-1.5"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
        <div className="p-5 space-y-6">
          {/* Active Assignments */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2 select-none">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Active Assignments ({dashboard.activeAssignments?.length || 0})
            </h4>
            {(!dashboard.activeAssignments || dashboard.activeAssignments.length === 0) ? (
              <p className="text-xs text-slate-400 italic pl-4 py-2 border border-dashed border-slate-200 rounded-lg">No active assignments.</p>
            ) : (
              <div className="border border-slate-200/60 rounded-lg overflow-hidden bg-white">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50 select-none">
                    <tr>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Claim No</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Insured Name</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assigned To</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assigned At</th>
                      <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboard.activeAssignments.map(a => (
                      <tr key={a.claimId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2 text-xs font-semibold text-slate-900">{a.claimNumber}</td>
                        <td className="px-4 py-2 text-xs text-slate-700">{a.insuredName}</td>
                        <td className="px-4 py-2 text-xs text-slate-600 font-semibold">{a.assignedTo}</td>
                        <td className="px-4 py-2 text-xs text-slate-400">{new Date(a.assignedAt).toLocaleString()}</td>
                        <td className="px-4 py-2 text-xs text-right">
                          <button
                            onClick={() => window.open(`/projects/${a.projectId}/jobs/${a.claimId}`, '_blank')}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Queue List */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2 select-none">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Pending Queue ({dashboard.queueList?.length || 0})
            </h4>
            {(!dashboard.queueList || dashboard.queueList.length === 0) ? (
              <p className="text-xs text-slate-400 italic pl-4 py-2 border border-dashed border-slate-200 rounded-lg">Queue is empty.</p>
            ) : (
              <div className="border border-slate-200/60 rounded-lg overflow-hidden bg-white">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50 select-none">
                    <tr>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Claim No</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Insured Name</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Queued At</th>
                      <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboard.queueList.map(q => (
                      <tr key={q.claimId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2 text-xs font-semibold text-slate-900">{q.claimNumber}</td>
                        <td className="px-4 py-2 text-xs text-slate-700">{q.insuredName}</td>
                        <td className="px-4 py-2 text-xs text-slate-400">{new Date(q.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-2 text-xs text-right">
                          <button
                            onClick={() => window.open(`/projects/${q.projectId}/jobs/${q.claimId}`, '_blank')}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Review History */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Recently Reviewed ({dashboard.reviewHistory?.length || 0})
            </h4>
            {(!dashboard.reviewHistory || dashboard.reviewHistory.length === 0) ? (
              <p className="text-xs text-slate-400 italic pl-4 py-2 border border-dashed border-slate-200 rounded-lg">No recently completed reviews.</p>
            ) : (
              <div className="border border-slate-200/60 rounded-lg overflow-hidden bg-white">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50 select-none">
                    <tr>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Claim No</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Insured Name</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reviewed By</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed At</th>
                      <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboard.reviewHistory.map(h => (
                      <tr key={h.claimId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2 text-xs font-semibold text-slate-900">{h.claimNumber}</td>
                        <td className="px-4 py-2 text-xs text-slate-700">{h.insuredName}</td>
                        <td className="px-4 py-2 text-xs text-slate-600 font-semibold">{h.reviewedBy}</td>
                        <td className="px-4 py-2 text-xs text-slate-400">{new Date(h.completedAt).toLocaleString()}</td>
                        <td className="px-4 py-2 text-xs text-right">
                          <button
                            onClick={() => window.open(`/projects/${h.projectId}/jobs/${h.claimId}`, '_blank')}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessMonitoringSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Stats Cards Skeletons */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-xl bg-slate-100" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-6 w-12 bg-slate-150" />
              <Skeleton className="h-3 w-24 bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Section Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <Skeleton className="h-4 w-32 bg-slate-150" />
          <Skeleton className="h-7 w-20 bg-slate-100" />
        </div>
        <div className="p-5 space-y-6">
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <Skeleton className="h-4 w-48 bg-slate-150" />
              </div>
              <div className="border border-slate-200/60 rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                  <div className="grid grid-cols-5 gap-4">
                    <Skeleton className="h-3.5 w-16 bg-slate-250" />
                    <Skeleton className="h-3.5 w-24 bg-slate-250" />
                    <Skeleton className="h-3.5 w-20 bg-slate-250" />
                    <Skeleton className="h-3.5 w-24 bg-slate-250" />
                    <Skeleton className="h-3.5 w-16 ml-auto bg-slate-250" />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {[1, 2].map((row) => (
                    <div key={row} className="grid grid-cols-5 gap-4 items-center">
                      <Skeleton className="h-4 w-20 bg-slate-100" />
                      <Skeleton className="h-4 w-28 bg-slate-100" />
                      <Skeleton className="h-4 w-24 bg-slate-100" />
                      <Skeleton className="h-4 w-32 bg-slate-100" />
                      <Skeleton className="h-7 w-20 ml-auto bg-slate-100 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
