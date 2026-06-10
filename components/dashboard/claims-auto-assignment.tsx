'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Save,
  RefreshCw,
  Zap,
  Users,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowDownToLine,
  TrendingUp,
  XCircle,
} from 'lucide-react';

interface UserLoad {
  userId: string;
  email: string;
  assignedCount: number;
  claimLimit: number;
  loadPercentage: number;
  status: string;
}

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
  globalLimit: number;
  totalAssigned: number;
  totalQueued: number;
  users: UserLoad[];
  activeAssignments?: ActiveAssignment[];
  reviewHistory?: ReviewedClaim[];
  queueList?: QueuedClaim[];
}

export function ClaimsAutoAssignment() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/claims/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      const data = await response.json();
      setDashboard(data);
      setLimitInput(data.globalLimit.toString());
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
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

  const handleSaveLimit = async () => {
    const limit = parseInt(limitInput);
    if (isNaN(limit) || limit < 1) {
      toast({
        title: 'Invalid limit',
        description: 'Please enter a number greater than 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/claims/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalLimit: limit }),
      });

      if (!response.ok) throw new Error('Failed to save');

      toast({
        title: 'Saved',
        description: `Global claim limit set to ${limit} for all users`,
      });

      setIsEditing(false);
      await fetchDashboard();
    } catch (error) {
      console.error('Error saving limit:', error);
      toast({
        title: 'Error',
        description: 'Failed to save claim limit',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProcessQueue = async () => {
    try {
      setProcessing(true);
      const response = await fetch('/api/claims/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to process queue');
      const data = await response.json();

      toast({
        title: 'Queue Processed',
        description: `${data.remainingInQueue} claims remaining in queue`,
      });

      await fetchDashboard();
    } catch (error) {
      console.error('Error processing queue:', error);
      toast({
        title: 'Error',
        description: 'Failed to process queue',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getLoadBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  const getLoadBarBgColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-100';
    if (percentage >= 75) return 'bg-amber-100';
    if (percentage >= 50) return 'bg-blue-100';
    return 'bg-emerald-100';
  };

  const getStatusBadge = (status: string, percentage: number) => {
    if (percentage >= 100) {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 text-[10px] font-semibold">
          At Capacity
        </Badge>
      );
    }
    if (percentage >= 75) {
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px] font-semibold">
          High Load
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[10px] font-semibold">
        Available
      </Badge>
    );
  };

  if (loading) {
    return <ClaimsAutoAssignmentSkeleton />;
  }

  if (!dashboard) {
    return (
      <div className="text-center text-slate-400 py-12">
        Failed to load dashboard data
      </div>
    );
  }

  // Sort users by load — lowest first (next to receive claims)
  const sortedUsers = [...dashboard.users].sort(
    (a, b) => a.assignedCount - b.assignedCount
  );

  return (
    <div className="space-y-5">
      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-3">
        {/* Global Limit Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Settings className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{dashboard.globalLimit}</p>
              <p className="text-[11px] text-slate-500">Assign Limit</p>
            </div>
          </div>
        </div>

        {/* Total Assigned */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{dashboard.totalAssigned}</p>
              <p className="text-[11px] text-slate-500">Total Assigned</p>
            </div>
          </div>
        </div>

        {/* Queued */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              dashboard.totalQueued > 0 ? 'bg-amber-50' : 'bg-emerald-50'
            }`}>
              <Clock className={`h-4 w-4 ${
                dashboard.totalQueued > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{dashboard.totalQueued}</p>
              <p className="text-[11px] text-slate-500">In Queue</p>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{dashboard.users.length}</p>
              <p className="text-[11px] text-slate-500">Active Users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Claims Settings</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Global Assign Limit
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Maximum claims per user. New claims auto-assign to the person with fewest claims.
              </p>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    className="h-9 text-sm w-28"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={handleSaveLimit}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9"
                    onClick={() => {
                      setIsEditing(false);
                      setLimitInput(dashboard.globalLimit.toString());
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <span className="text-lg font-bold text-slate-900">{dashboard.globalLimit}</span>
                    <span className="text-xs text-slate-500">claims / user</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Limit
                  </Button>
                </div>
              )}
            </div>

            {/* Process Queue Button */}
            {dashboard.totalQueued > 0 && (
              <div className="ml-auto">
                <Button
                  onClick={handleProcessQueue}
                  disabled={processing}
                  className="h-9 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {processing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                  )}
                  Process Queue ({dashboard.totalQueued})
                </Button>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="mt-4 p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
            <div className="flex items-start gap-2">
              <Zap className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-[11px] text-blue-700 space-y-0.5">
                <p className="font-medium">Auto-Assignment Logic</p>
                <p className="text-blue-600">New claims → assigned to user with <strong>fewest current claims</strong> → if all at capacity → queued (FIFO)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Load Dashboard */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">User Load Distribution</h3>
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

        {sortedUsers.length === 0 ? (
          <div className="text-center text-slate-400 py-12 text-sm">
            No active users found. Add users in the Users Management tab.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedUsers.map((user, index) => {
              const percentage = Math.min(user.loadPercentage, 100);
              const isNextAssignee = index === 0 && percentage < 100;

              return (
                <div
                  key={user.userId}
                  className={`px-5 py-3.5 flex items-center gap-4 transition-colors hover:bg-slate-50/50 ${
                    isNextAssignee ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  {/* User Info */}
                  <div className="min-w-0 w-44">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {user.email}
                      </p>
                      {isNextAssignee && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[9px] px-1.5 py-0 font-semibold whitespace-nowrap">
                          NEXT ↓
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Load Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${getLoadBarBgColor(user.loadPercentage)}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${getLoadBarColor(user.loadPercentage)}`}
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-600 w-10 text-right">
                        {Math.round(user.loadPercentage)}%
                      </span>
                    </div>
                  </div>

                  {/* Count */}
                  <div className="text-right w-20">
                    <span className="text-sm font-bold text-slate-800">
                      {user.assignedCount}
                    </span>
                    <span className="text-xs text-slate-400"> / {user.claimLimit}</span>
                  </div>

                  {/* Status */}
                  <div className="w-24 flex justify-end">
                    {getStatusBadge(user.status, user.loadPercentage)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Queue Warning */}
        {dashboard.totalQueued > 0 && (
          <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              <strong>{dashboard.totalQueued} claim{dashboard.totalQueued > 1 ? 's' : ''}</strong> waiting in queue.
              {' '}Claims will auto-assign when users have capacity, or click "Process Queue" to distribute now.
            </p>
          </div>
        )}

        {dashboard.totalQueued === 0 && sortedUsers.length > 0 && (
          <div className="px-5 py-3 bg-emerald-50/50 border-t border-emerald-100 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-700">
              All clear — no claims in queue. New claims will be assigned to the user with the lowest load.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ClaimsAutoAssignmentSkeleton() {
  return (
    <div className="space-y-5">
      {/* Top Stats Skeletons */}
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-8 h-8 rounded-lg bg-slate-100" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-10 bg-slate-150" />
                <Skeleton className="h-3 w-16 bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Settings Card Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <Skeleton className="h-4 w-32 bg-slate-150" />
        </div>
        <div className="p-5">
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs space-y-2">
              <Skeleton className="h-3.5 w-24 bg-slate-100" />
              <Skeleton className="h-3 w-48 bg-slate-100" />
              <Skeleton className="h-9 w-32 bg-slate-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Users Load Dashboard Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <Skeleton className="h-4 w-40 bg-slate-150" />
          <Skeleton className="h-7 w-20 bg-slate-100" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4">
              <div className="w-44">
                <Skeleton className="h-4 w-36 bg-slate-100" />
              </div>
              <div className="flex-1 flex items-center gap-3">
                <Skeleton className="flex-1 h-2.5 bg-slate-100 rounded-full" />
                <Skeleton className="h-3.5 w-8 bg-slate-100" />
              </div>
              <div className="w-20 text-right">
                <Skeleton className="h-4 w-12 ml-auto bg-slate-100" />
              </div>
              <div className="w-24 flex justify-end">
                <Skeleton className="h-5.5 w-16 bg-slate-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
