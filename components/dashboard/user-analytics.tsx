'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  Award,
  Zap,
  Calendar,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface UserMetric {
  userId: string;
  email: string;
  completedCount: number;
  pendingCount: number;
  assignedCount: number;
  avgDurationMs: number;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

export function UserAnalytics() {
  const [metrics, setMetrics] = useState<UserMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let url = '/api/claims/analytics';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const paramStr = params.toString();
      if (paramStr) url += `?${paramStr}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      setMetrics(data.metrics || []);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load user performance analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Aggregate Metrics
  const totalCompleted = metrics.reduce((sum, m) => sum + m.completedCount, 0);
  const totalPending = metrics.reduce((sum, m) => sum + m.pendingCount, 0);
  
  // Overall Avg duration for all completed claims
  const completedWithDuration = metrics.filter(m => m.avgDurationMs > 0);
  const overallAvgDurationMs = completedWithDuration.length > 0
    ? completedWithDuration.reduce((sum, m) => sum + m.avgDurationMs, 0) / completedWithDuration.length
    : 0;

  // Find Top Performer (highest completed count)
  let topPerformer = null;
  if (metrics.length > 0) {
    topPerformer = [...metrics].sort((a, b) => b.completedCount - a.completedCount)[0];
    if (topPerformer && topPerformer.completedCount === 0) {
      topPerformer = null;
    }
  }

  // Find Fastest Reviewer (lowest average duration > 0)
  let fastestReviewer = null;
  const eligibleFastest = metrics.filter(m => m.avgDurationMs > 0);
  if (eligibleFastest.length > 0) {
    fastestReviewer = [...eligibleFastest].sort((a, b) => a.avgDurationMs - b.avgDurationMs)[0];
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Filters Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-800">Filter Performance Period</h3>
          </div>
          <div className="flex items-center gap-2">
            {(startDate || endDate) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                Clear Filters
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchAnalytics(true)}
              className="h-8 text-xs gap-1.5"
              disabled={refreshing}
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <UserAnalyticsSkeleton />
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Completed',
                value: totalCompleted,
                desc: 'Claims cleared in range',
                icon: Award,
                gradient: 'from-blue-500 to-indigo-650',
                bg: 'bg-blue-50',
                text: 'text-blue-600',
              },
              {
                label: 'Average Review Speed',
                value: formatDuration(overallAvgDurationMs),
                desc: 'Average claim review time',
                icon: Clock,
                gradient: 'from-amber-500 to-orange-600',
                bg: 'bg-amber-50',
                text: 'text-amber-600',
              },
              {
                label: 'Top Performer',
                value: topPerformer ? topPerformer.email.split('@')[0] : '—',
                desc: topPerformer ? `${topPerformer.completedCount} claims cleared` : 'No reviews completed',
                icon: TrendingUp,
                gradient: 'from-emerald-500 to-teal-600',
                bg: 'bg-emerald-50',
                text: 'text-emerald-600',
              },
              {
                label: 'Fastest Reviewer',
                value: fastestReviewer ? fastestReviewer.email.split('@')[0] : '—',
                desc: fastestReviewer ? `Speed: ${formatDuration(fastestReviewer.avgDurationMs)}` : 'No speed records',
                icon: Zap,
                gradient: 'from-violet-500 to-purple-600',
                bg: 'bg-violet-50',
                text: 'text-violet-600',
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm overflow-hidden group hover:shadow-md transition-shadow duration-300"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className={`h-5 w-5 ${kpi.text}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-900 truncate max-w-[170px]">{kpi.value}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        {kpi.label}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2.5 font-medium">{kpi.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Performance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-800">User Performance Summary</h3>
              </div>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 text-[10px] font-semibold">
                {metrics.length} Active Reviewers
              </Badge>
            </div>

            {metrics.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <AlertCircle className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-150">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Reviewer
                      </th>
                      <th className="px-5 py-3.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Claims Cleared
                      </th>
                      <th className="px-5 py-3.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Active Queue
                      </th>
                      <th className="px-5 py-3.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Total Assigned
                      </th>
                      <th className="px-5 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Avg. Review Speed
                      </th>
                      <th className="px-5 py-3.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider w-36">
                        Efficiency
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.map((row) => {
                      let badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
                      let badgeText = '—';
                      if (row.completedCount > 0 && row.avgDurationMs > 0) {
                        const mins = row.avgDurationMs / 60000;
                        if (mins <= 5) {
                          badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          badgeText = 'Excellent';
                        } else if (mins <= 15) {
                          badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                          badgeText = 'Efficient';
                        } else {
                          badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                          badgeText = 'Average';
                        }
                      }

                      return (
                        <tr
                          key={row.userId}
                          className="hover:bg-slate-50/40 transition-colors duration-150"
                        >
                          <td className="px-5 py-3.5 text-xs font-semibold text-slate-900 truncate max-w-[200px]">
                            {row.email}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-center font-bold text-slate-800">
                            {row.completedCount}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                row.pendingCount > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {row.pendingCount} active
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-center text-slate-600">
                            {row.assignedCount}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-right font-mono font-semibold text-slate-700">
                            {formatDuration(row.avgDurationMs)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge className={`text-[10px] font-bold ${badgeColor}`}>
                              {badgeText}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UserAnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <Skeleton className="w-10 h-10 rounded-xl bg-slate-100" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-24 bg-slate-150" />
              <Skeleton className="h-3.5 w-16 bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <Skeleton className="h-5 w-40 bg-slate-150" />
          <Skeleton className="h-5 w-24 bg-slate-100" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50">
              <Skeleton className="h-4 w-32 bg-slate-100" />
              <Skeleton className="h-4 w-12 bg-slate-100" />
              <Skeleton className="h-4 w-16 bg-slate-100" />
              <Skeleton className="h-4 w-20 bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
