'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Activity,
  Clock,
  CheckCircle2,
  Upload,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Users,
  FileUp,
  AlertTriangle,
  File,
  X,
  Loader2,
  ExternalLink,
  TrendingUp,
  Zap,
  ArrowDownToLine,
} from 'lucide-react';
import { ZipProcessor } from './zip-processor';

// ─── Interfaces ────────────────────────────────────────────────
interface ActiveItem {
  claimId: string;
  projectId: string;
  claimNumber: string;
  insuredName: string;
  assignedTo: string;
  assignedAt: string;
}

interface QueueItem {
  claimId: string;
  projectId: string;
  claimNumber: string;
  insuredName: string;
  createdAt: string;
}

interface ReviewedItem {
  claimId: string;
  projectId: string;
  claimNumber: string;
  insuredName: string;
  reviewedBy: string;
  completedAt: string;
}

interface UserLoad {
  userId: string;
  email: string;
  assignedCount: number;
  claimLimit: number;
  loadPercentage: number;
  status: string;
}

interface OverviewData {
  globalLimit: number;
  totalAssigned: number;
  totalQueued: number;
  totalReviewed: number;
  activeCount: number;
  queueCount: number;
  reviewedCount: number;
  usersCount: number;
  users: UserLoad[];
  activeItems: ActiveItem[];
  totalActiveItems: number;
  page: number;
  limit: number;
}

// ─── Tab Definitions ───────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Process Overview', icon: BarChart3, color: 'blue' },
  { id: 'queue', label: 'Pending Queue', icon: Clock, color: 'amber' },
  { id: 'reviewed', label: 'Recently Reviewed', icon: CheckCircle2, color: 'emerald' },
  { id: 'upload', label: 'File Upload Claims', icon: Upload, color: 'violet' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Pagination Component ──────────────────────────────────────
function Pagination({
  page,
  totalPages,
  totalCount,
  limit,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  // Build page numbers (max 5 visible)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{startItem}–{endItem}</span> of{' '}
        <span className="font-semibold text-slate-700">{totalCount}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {getPageNumbers().map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200 ${
              p === page
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Time Ago Helper ───────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Overview state
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewPage, setOverviewPage] = useState(1);

  // Queue state
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queuePage, setQueuePage] = useState(1);

  // Reviewed state
  const [reviewedItems, setReviewedItems] = useState<ReviewedItem[]>([]);
  const [reviewedTotal, setReviewedTotal] = useState(0);
  const [reviewedPage, setReviewedPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUserId, setFilterUserId] = useState('all');
  const [usersList, setUsersList] = useState<Array<{ userId: string; email: string }>>([]);

  // Upload state
  const [uploadType, setUploadType] = useState<'single' | 'zip'>('single');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<Array<{ name: string; size: number; status: string; time: string }>>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 10;

  // ─── Fetch Data ────────────────────────────────────────────
  const fetchTabData = useCallback(
    async (tab: TabId, page: number, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        let url = `/api/claims/dashboard?tab=${tab}&page=${page}&limit=${ITEMS_PER_PAGE}`;
        if (tab === 'reviewed') {
          if (startDate) url += `&startDate=${startDate}`;
          if (endDate) url += `&endDate=${endDate}`;
          if (filterUserId && filterUserId !== 'all') url += `&filterUserId=${filterUserId}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();

        if (tab === 'overview') {
          setOverview(data as OverviewData);
        } else if (tab === 'queue') {
          setQueueItems(data.items || []);
          setQueueTotal(data.totalCount || 0);
        } else if (tab === 'reviewed') {
          setReviewedItems(data.items || []);
          setReviewedTotal(data.totalCount || 0);
          if (data.users) {
            setUsersList(data.users);
          }
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast, startDate, endDate, filterUserId]
  );

  // Initial load + auto-refresh
  useEffect(() => {
    if (activeTab !== 'upload') {
      const page =
        activeTab === 'overview'
          ? overviewPage
          : activeTab === 'queue'
          ? queuePage
          : reviewedPage;
      fetchTabData(activeTab, page);

      const interval = setInterval(() => {
        fetchTabData(activeTab, page, true);
      }, 30000);
      return () => clearInterval(interval);
    }
    setLoading(false);
  }, [activeTab, overviewPage, queuePage, reviewedPage, fetchTabData]);

  // ─── File Upload ───────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Only PDF files are accepted',
        variant: 'destructive',
      });
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/claims/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadHistory((prev) => [
        {
          name: selectedFile.name,
          size: selectedFile.size,
          status: 'success',
          time: new Date().toISOString(),
        },
        ...prev,
      ]);

      toast({
        title: 'Upload Successful',
        description: `${selectedFile.name} uploaded and sent for processing`,
      });

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadHistory((prev) => [
        {
          name: selectedFile.name,
          size: selectedFile.size,
          status: 'failed',
          time: new Date().toISOString(),
        },
        ...prev,
      ]);

      toast({
        title: 'Upload Failed',
        description: err.message || 'Could not upload the file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // ─── Process Queue Handler ────────────────────────────────
  const [processing, setProcessing] = useState(false);
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
      fetchTabData(activeTab, activeTab === 'overview' ? overviewPage : queuePage, true);
    } catch {
      toast({ title: 'Error', description: 'Failed to process queue', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="relative space-y-6">
      {refreshing && (
        <div className="absolute -top-2 left-0 right-0 h-0.5 bg-slate-100 overflow-hidden z-30 rounded-full">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 w-1/2 animate-loading-bar" />
        </div>
      )}
      {/* ──── Tab Bar ──── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 flex gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const colorMap: Record<string, string> = {
            blue: 'from-blue-500 to-indigo-600 shadow-blue-500/25',
            amber: 'from-amber-500 to-orange-600 shadow-amber-500/25',
            emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
            violet: 'from-violet-500 to-purple-600 shadow-violet-500/25',
          };
          const iconColorMap: Record<string, string> = {
            blue: 'text-blue-600',
            amber: 'text-amber-600',
            emerald: 'text-emerald-600',
            violet: 'text-violet-600',
          };

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? `bg-gradient-to-r ${colorMap[tab.color]} text-white shadow-lg`
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? '' : iconColorMap[tab.color]}`} />
              {tab.label}
              {/* Live badge for queue */}
              {tab.id === 'queue' && overview && overview.queueCount > 0 && !isActive && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                  {overview.queueCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ──── Loading State ──── */}
      {loading && <AdminDashboardSkeleton />}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: PROCESS OVERVIEW                                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'overview' && overview && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: 'Active Reviews',
                value: overview.activeCount,
                icon: Activity,
                gradient: 'from-blue-500 to-indigo-600',
                bg: 'bg-blue-50',
                text: 'text-blue-600',
                pulse: true,
              },
              {
                label: 'In Queue',
                value: overview.queueCount,
                icon: Clock,
                gradient: 'from-amber-500 to-orange-600',
                bg: 'bg-amber-50',
                text: 'text-amber-600',
              },
              {
                label: 'Total Reviewed',
                value: overview.reviewedCount,
                icon: CheckCircle2,
                gradient: 'from-emerald-500 to-teal-600',
                bg: 'bg-emerald-50',
                text: 'text-emerald-600',
              },
              {
                label: 'Active Users',
                value: overview.usersCount,
                icon: Users,
                gradient: 'from-violet-500 to-purple-600',
                bg: 'bg-violet-50',
                text: 'text-violet-600',
              },
            ].map((kpi) => {
              const KIcon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm overflow-hidden group hover:shadow-md transition-shadow duration-300"
                >
                  {/* Gradient accent line at top */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <KIcon className={`h-5 w-5 ${kpi.text} ${kpi.pulse ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 tabular-nums">{kpi.value}</p>
                      <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                        {kpi.label}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* User Load Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">User Load Distribution</h3>
                  <p className="text-[10px] text-slate-400">Live capacity overview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {overview.queueCount > 0 && (
                  <Button
                    size="sm"
                    onClick={handleProcessQueue}
                    disabled={processing}
                    className="h-8 gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs shadow-sm"
                  >
                    {processing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ArrowDownToLine className="h-3 w-3" />
                    )}
                    Process Queue ({overview.queueCount})
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fetchTabData('overview', overviewPage, true)}
                  className="h-8 text-xs gap-1.5"
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {overview.users.length === 0 ? (
              <div className="text-center text-slate-400 py-12 text-sm">No active users found.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...overview.users]
                  .sort((a, b) => a.assignedCount - b.assignedCount)
                  .map((user, idx) => {
                    const pct = Math.min(user.loadPercentage, 100);
                    const isNext = idx === 0 && pct < 100;
                    const barColor =
                      pct >= 100
                        ? 'bg-red-500'
                        : pct >= 75
                        ? 'bg-amber-500'
                        : pct >= 50
                        ? 'bg-blue-500'
                        : 'bg-emerald-500';
                    const barBg =
                      pct >= 100
                        ? 'bg-red-100'
                        : pct >= 75
                        ? 'bg-amber-100'
                        : pct >= 50
                        ? 'bg-blue-100'
                        : 'bg-emerald-100';

                    return (
                      <div
                        key={user.userId}
                        className={`px-5 py-3.5 flex items-center gap-4 transition-colors hover:bg-slate-50/50 ${
                          isNext ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <div className="min-w-0 w-48">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-800 truncate">{user.email}</p>
                            {isNext && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[9px] px-1.5 py-0 font-semibold whitespace-nowrap">
                                NEXT ↓
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${barBg}`}>
                              <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-semibold text-slate-600 w-10 text-right">
                              {Math.round(user.loadPercentage)}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right w-20">
                          <span className="text-sm font-bold text-slate-800">
                            {user.assignedCount}
                          </span>
                          <span className="text-xs text-slate-400"> / {user.claimLimit}</span>
                        </div>
                        <div className="w-24 flex justify-end">
                          {pct >= 100 ? (
                            <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 text-[10px] font-semibold">
                              At Capacity
                            </Badge>
                          ) : pct >= 75 ? (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px] font-semibold">
                              High Load
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[10px] font-semibold">
                              Available
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Queue status footer */}
            {overview.queueCount > 0 && (
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  <strong>{overview.queueCount} claim{overview.queueCount > 1 ? 's' : ''}</strong>{' '}
                  waiting in queue. Auto-assigns when users have capacity.
                </p>
              </div>
            )}
            {overview.queueCount === 0 && overview.users.length > 0 && (
              <div className="px-5 py-3 bg-emerald-50/50 border-t border-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <p className="text-xs text-emerald-700">
                  All clear — no claims in queue.
                </p>
              </div>
            )}
          </div>

          {/* Active Assignments Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-800">
                  Active Assignments
                </h3>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 text-[10px]">
                  {overview.activeCount}
                </Badge>
              </div>
            </div>

            {overview.activeItems.length === 0 ? (
              <div className="py-10 text-center">
                <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No active assignments</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/80 select-none">
                      <tr>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Claim No
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Insured Name
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Assigned To
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Assigned
                        </th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {overview.activeItems.map((a) => (
                        <tr
                          key={a.claimId}
                          className="hover:bg-blue-50/30 transition-colors duration-150"
                        >
                          <td className="px-5 py-3 text-xs font-semibold text-slate-900">
                            {a.claimNumber}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-700">{a.insuredName}</td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {a.assignedTo}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-400">
                            {timeAgo(a.assignedAt)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() =>
                                window.open(
                                  `/projects/${a.projectId}/jobs/${a.claimId}`,
                                  '_blank'
                                )
                              }
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={overviewPage}
                  totalPages={Math.ceil(overview.totalActiveItems / ITEMS_PER_PAGE)}
                  totalCount={overview.totalActiveItems}
                  limit={ITEMS_PER_PAGE}
                  onPageChange={setOverviewPage}
                />
              </>
            )}
          </div>

          {/* Auto-assignment info */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-xs text-blue-700 space-y-0.5">
                <p className="font-semibold text-blue-800">Auto-Assignment Logic</p>
                <p className="text-blue-600">
                  New claims → assigned to user with <strong>fewest current claims</strong> → if all at
                  capacity → queued (FIFO)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: PENDING QUEUE                                     */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'queue' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Queue header card */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{queueTotal}</p>
                  <p className="text-amber-100 text-sm font-medium">Claims waiting for assignment</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {queueTotal > 0 && (
                  <Button
                    size="sm"
                    onClick={handleProcessQueue}
                    disabled={processing}
                    className="h-9 gap-1.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30"
                  >
                    {processing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                    )}
                    Process Queue
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fetchTabData('queue', queuePage, true)}
                  className="h-9 text-white hover:bg-white/20"
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Queue Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {queueItems.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Queue is empty</p>
                <p className="text-xs text-slate-400 mt-1">All claims have been assigned</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/80 select-none">
                      <tr>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Claim No
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Insured Name
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          In Queue Since
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Wait Time
                        </th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {queueItems.map((q, idx) => (
                        <tr
                          key={q.claimId}
                          className="hover:bg-amber-50/30 transition-colors duration-150"
                        >
                          <td className="px-5 py-3 text-xs text-slate-400 font-mono">
                            {(queuePage - 1) * ITEMS_PER_PAGE + idx + 1}
                          </td>
                          <td className="px-5 py-3 text-xs font-semibold text-slate-900">
                            {q.claimNumber}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-700">{q.insuredName}</td>
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {new Date(q.createdAt).toLocaleString()}
                          </td>
                          <td className="px-5 py-3">
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px] font-medium">
                              {timeAgo(q.createdAt)}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() =>
                                window.open(
                                  `/projects/${q.projectId}/jobs/${q.claimId}`,
                                  '_blank'
                                )
                              }
                              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-800 transition-colors"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={queuePage}
                  totalPages={Math.ceil(queueTotal / ITEMS_PER_PAGE)}
                  totalCount={queueTotal}
                  limit={ITEMS_PER_PAGE}
                  onPageChange={setQueuePage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: RECENTLY REVIEWED                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'reviewed' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Reviewed header card */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{reviewedTotal}</p>
                  <p className="text-emerald-100 text-sm font-medium">Claims reviewed & completed</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fetchTabData('reviewed', reviewedPage, true)}
                className="h-9 text-white hover:bg-white/20"
                disabled={refreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Filter Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Filter Completed Claims</h3>
              {(startDate || endDate || filterUserId !== 'all') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setFilterUserId('all');
                    setReviewedPage(1);
                  }}
                  className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 animate-in fade-in duration-200"
                >
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setReviewedPage(1);
                  }}
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setReviewedPage(1);
                  }}
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">User</label>
                <select
                  value={filterUserId}
                  onChange={(e) => {
                    setFilterUserId(e.target.value);
                    setReviewedPage(1);
                  }}
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                >
                  <option value="all">All Users</option>
                  {usersList.map((usr) => (
                    <option key={usr.userId} value={usr.userId}>
                      {usr.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Reviewed Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {reviewedItems.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No reviewed claims yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Completed reviews will appear here
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/80 select-none">
                      <tr>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Claim No
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Insured Name
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Reviewed By
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Completed At
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {reviewedItems.map((r) => (
                        <tr
                          key={r.claimId}
                          className="hover:bg-emerald-50/30 transition-colors duration-150"
                        >
                          <td className="px-5 py-3 text-xs font-semibold text-slate-900">
                            {r.claimNumber}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-700">{r.insuredName}</td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {r.reviewedBy}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {new Date(r.completedAt).toLocaleString()}
                          </td>
                          <td className="px-5 py-3">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[10px] font-medium">
                              {timeAgo(r.completedAt)}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() =>
                                window.open(
                                  `/projects/${r.projectId}/jobs/${r.claimId}`,
                                  '_blank'
                                )
                              }
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={reviewedPage}
                  totalPages={Math.ceil(reviewedTotal / ITEMS_PER_PAGE)}
                  totalCount={reviewedTotal}
                  limit={ITEMS_PER_PAGE}
                  onPageChange={setReviewedPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: FILE UPLOAD                                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'upload' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Upload header */}
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-violet-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <FileUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold">Upload Claim Files</p>
                <p className="text-violet-100 text-sm">
                  Upload PDF files to be parsed and auto-assigned to reviewers
                </p>
              </div>
            </div>
          </div>

          {/* Upload Type Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
            <button
              onClick={() => setUploadType('single')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                uploadType === 'single'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Single PDF Claim
            </button>
            <button
              onClick={() => setUploadType('zip')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                uploadType === 'zip'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ZIP Archive (Bulk)
            </button>
          </div>

          {uploadType === 'single' ? (
            <>
              {/* Upload Area */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6">
                  {/* Drop Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileSelect(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                      dragOver
                        ? 'border-violet-400 bg-violet-50 scale-[1.01]'
                        : selectedFile
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-violet-50/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />

                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                          <File className="w-7 h-7 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatFileSize(selectedFile.size)} • PDF Document
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                        >
                          <X className="w-3 h-3" /> Remove file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto">
                          <Upload className="w-7 h-7 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            Drop PDF file here or <span className="text-violet-600">browse</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Supports PDF format • Max 50MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || uploading}
                      className="h-10 px-6 gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md shadow-violet-500/20 disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploading ? 'Uploading...' : 'Upload & Process'}
                    </Button>
                  </div>
                </div>

                {/* Upload History */}
                {uploadHistory.length > 0 && (
                  <div className="border-t border-slate-100">
                    <div className="px-5 py-3 border-b border-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Upload History
                      </h4>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {uploadHistory.map((item, idx) => (
                        <div
                          key={idx}
                          className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                item.status === 'success'
                                  ? 'bg-emerald-50'
                                  : 'bg-red-50'
                              }`}
                            >
                              {item.status === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {formatFileSize(item.size)} • {timeAgo(item.time)}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={`text-[10px] ${
                              item.status === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {item.status === 'success' ? 'Uploaded' : 'Failed'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* API Info */}
              <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="text-xs text-violet-700 space-y-0.5">
                    <p className="font-semibold text-violet-800">Processing Pipeline</p>
                    <p className="text-violet-600">
                      Uploaded PDFs are sent to the MedSense API → parsed → auto-assigned to available
                      reviewers based on capacity
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <ZipProcessor />
          )}
        </div>
      )}
    </div>
  );
}

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <Skeleton className="w-10 h-10 rounded-xl bg-slate-100" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-12 bg-slate-150" />
              <Skeleton className="h-3.5 w-24 bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Load distribution card skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <Skeleton className="h-5 w-40 bg-slate-150" />
          <Skeleton className="h-8 w-24 bg-slate-150" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-36 bg-slate-100" />
              <Skeleton className="flex-1 h-3 bg-slate-100 rounded-full" />
              <Skeleton className="h-4 w-12 bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
