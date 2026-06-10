'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  AlertTriangle,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';

interface Job {
  _id: string;
  project_id: string;
  status: string;
  state?: string;
  city?: string;
  files?: Array<{ filename: string; blob_url: string }>;
  parsed_data?: Record<string, any>;
  created_at?: string;
  reviewStatus?: string;
}

interface StatusCounts {
  total: number;
  queue: number;
  underReview: number;
  reviewed: number;
  failed: number;
}

interface ClaimsTableProps {
  projectId: string;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function ClaimsTable({ projectId }: ClaimsTableProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [counts, setCounts] = useState<StatusCounts>({
    total: 0,
    queue: 0,
    underReview: 0,
    reviewed: 0,
    failed: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [goToPage, setGoToPage] = useState('');

  // Check user role on mount
  useEffect(() => {
    const checkRole = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          setIsSuperadmin(true);
        }
      } catch {
        // User is not superadmin
      }
    };
    checkRole();
  }, []);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // When debounced search changes, reset page to 1
  useEffect(() => {
    setJobs([]);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (debouncedSearch.trim()) {
        queryParams.set('search', debouncedSearch.trim());
      }
      if (!isSuperadmin) {
        queryParams.set('history', activeTab === 'history' ? 'true' : 'false');
      }
      
      // Use different endpoint based on user role
      const endpoint = isSuperadmin 
        ? `/api/projects/${projectId}/jobs?${queryParams.toString()}`
        : `/api/projects/${projectId}/assigned-jobs?${queryParams.toString()}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data.jobs);
      if (data.counts) setCounts(data.counts);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Reset pagination page to 1 when tab changes
  useEffect(() => {
    setJobs([]);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [activeTab]);

  // Clear jobs when page or limit changes to show skeleton
  useEffect(() => {
    setJobs([]);
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 15000);
    return () => clearInterval(interval);
  }, [projectId, pagination.page, pagination.limit, debouncedSearch, isSuperadmin, activeTab]);

  const getDecisionBadge = (decision: string | undefined) => {
    if (!decision) return <span className="text-slate-400 text-xs">—</span>;
    const d = decision.toUpperCase();
    if (d === 'APPROVE' || d === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          {decision}
        </span>
      );
    }
    if (d === 'REJECT' || d === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3" />
          {decision}
        </span>
      );
    }
    if (d === 'QUERY') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3" />
          {decision}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
        {decision}
      </span>
    );
  };

  const getReviewStatusBadge = (reviewStatus: string, parserStatus: string) => {
    if (parserStatus.toLowerCase() === 'failed') {
      return <Badge variant="destructive" className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50 capitalize">Failed</Badge>;
    }
    if (parserStatus.toLowerCase() === 'processing' || parserStatus.toLowerCase() === 'pending') {
      return <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 capitalize animate-pulse">Parsing...</Badge>;
    }
    
    const s = reviewStatus.toLowerCase();
    if (s === 'completed') {
      return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 capitalize hover:bg-emerald-50">Review Completed</Badge>;
    }
    if (s === 'assigned') {
      return <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 capitalize">Under Review</Badge>;
    }
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 capitalize">In Queue</Badge>;
  };

  const getManualReviewBadge = (val: boolean | undefined) => {
    if (val === undefined || val === null) return <span className="text-slate-400 text-xs">—</span>;
    if (val) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3" />
          Yes
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
        No
      </span>
    );
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '—';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const handleViewJob = (job: Job) => {
    router.push(`/projects/${projectId}/jobs/${job._id}`);
  };

  // Generate perfect pagination pages array with ellipses
  const getPageNumbers = () => {
    const pages = [];
    const { page, pages: totalPages } = pagination;
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Always include page 1
    pages.push(1);

    if (page > 3) {
      pages.push('ellipsis-start');
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      if (i > 1 && i < totalPages) {
        pages.push(i);
      }
    }

    if (page < totalPages - 2) {
      pages.push('ellipsis-end');
    }

    // Always include last page
    pages.push(totalPages);

    return pages;
  };

  if (loading && jobs.length === 0) {
    return <ClaimsTableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-100 mb-4">
            <XCircle className="w-6 h-6 text-rose-600" />
          </div>
          <p className="text-rose-600 font-medium">Error: {error}</p>
          <button
            onClick={fetchJobs}
            className="mt-3 text-sm text-primary hover:text-primary/80 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: counts.total, icon: FileText, color: 'text-slate-800', borderColor: 'border-slate-200', bg: 'bg-white shadow-xs' },
          { label: 'In Queue', value: counts.queue, icon: Clock, color: 'text-amber-700', borderColor: 'border-amber-200/60', bg: 'bg-amber-50/30' },
          { label: 'Under Review', value: counts.underReview, icon: Loader2, color: 'text-blue-700', borderColor: 'border-blue-200/60', bg: 'bg-blue-50/30', animate: counts.underReview > 0 },
          { label: 'Reviewed', value: counts.reviewed, icon: CheckCircle2, color: 'text-emerald-750', borderColor: 'border-emerald-200/60', bg: 'bg-emerald-50/30' },
          { label: 'Failed', value: counts.failed, icon: XCircle, color: 'text-rose-700', borderColor: 'border-rose-200/60', bg: 'bg-rose-50/30' },
        ].map((item) => (
          <div
            key={item.label}
            className={`${item.bg} border ${item.borderColor} rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-xs`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <item.icon className={`w-4 h-4 ${item.color} ${item.animate ? 'animate-spin' : ''}`} />
              <span className={`text-[10px] uppercase font-bold ${item.color} tracking-wider`}>
                {item.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Role-based Tab Toggle for regular users */}
      {!isSuperadmin && (
        <div className="flex items-center gap-1.5 bg-slate-200/50 p-1 rounded-lg border border-slate-200/60 max-w-xs">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
              activeTab === 'active'
                ? 'bg-white text-slate-900 shadow-xs border-b border-slate-250'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Active Reviews
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs border-b border-slate-250'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Review History
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search claims by number, policy, name, status, or decision..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 shadow-xs"
        />
        {searchQuery && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {pagination.total} matching result{pagination.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      {jobs.length === 0 ? (
        <div className="flex items-center justify-center h-48 border border-slate-200/60 rounded-xl bg-white shadow-xs">
          <div className="text-center">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-slate-500 font-medium">
              {searchQuery ? 'No claims match your search' : 'No claims found'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="relative border border-slate-200/60 rounded-xl overflow-hidden bg-white shadow-xs">
            {loading && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-100 overflow-hidden z-10">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-650 w-1/2 animate-loading-bar" />
              </div>
            )}
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-slate-600 font-semibold text-xs w-12">#</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-xs">Claim No.</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-xs text-right">Amount</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-xs">Insured Name</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-xs w-16 text-center">Age</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-xs w-20 text-center">Gender</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-xs">Decision</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-xs text-center">Review</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-xs">Review Status</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-xs w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job, index) => {
                  const pd = job.parsed_data;
                  const amount = getNestedValue(pd, 'claim_details.total_claimed_amount');
                  const name = getNestedValue(pd, 'insured_person_details.name');
                  const age = getNestedValue(pd, 'insured_person_details.age');
                  const gender = getNestedValue(pd, 'insured_person_details.gender');
                  const decision = getNestedValue(pd, 'final_decision');
                  const manualReview = getNestedValue(pd, 'requires_manual_review');

                  const rowNum = (pagination.page - 1) * pagination.limit + index + 1;

                  const isParsing = job.status.toLowerCase() === 'processing' || job.status.toLowerCase() === 'pending';

                  return (
                    <TableRow
                      key={job._id}
                      className="border-slate-200/50 hover:bg-slate-50/50 transition-colors duration-150 cursor-pointer group"
                      onClick={() => handleViewJob(job)}
                    >
                      <TableCell className="font-mono text-xs text-slate-400">{rowNum}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-900 max-w-[200px] truncate" title={job.files?.[0]?.filename || ''}>
                        {isParsing ? (
                          <Skeleton className="h-4 w-24 bg-slate-100" />
                        ) : (
                          job.files?.[0]?.filename
                            ? job.files[0].filename.replace(/\.pdf$/i, '').replace(/\s*\(\d+\)\s*$/, '')
                            : <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-right text-slate-900">
                        {isParsing ? (
                          <Skeleton className="h-4 w-16 bg-slate-100 ml-auto" />
                        ) : (
                          formatCurrency(amount)
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 max-w-[180px] truncate">
                        {isParsing ? (
                          <Skeleton className="h-4 w-28 bg-slate-100" />
                        ) : (
                          name || <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-center text-slate-600">
                        {isParsing ? (
                          <Skeleton className="h-4 w-8 bg-slate-100 mx-auto" />
                        ) : (
                          age || '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-center text-slate-600">
                        {isParsing ? (
                          <Skeleton className="h-4 w-12 bg-slate-100 mx-auto" />
                        ) : (
                          gender || '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {isParsing ? (
                          <Skeleton className="h-5 w-16 bg-slate-100 rounded-full" />
                        ) : (
                          getDecisionBadge(decision)
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isParsing ? (
                          <Skeleton className="h-5 w-10 bg-slate-100 rounded-full mx-auto" />
                        ) : (
                          getManualReviewBadge(manualReview)
                        )}
                      </TableCell>
                      <TableCell>{getReviewStatusBadge(job.reviewStatus || 'unassigned', job.status)}</TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewJob(job);
                          }}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-xs font-semibold transition-colors group-hover:underline"
                        >
                          View
                          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-1">
              <div className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
                <span>Rows per page:</span>
                <select
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer shadow-xs"
                  value={pagination.limit}
                  onChange={(e) => {
                    const newLimit = Number(e.target.value);
                    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
                  }}
                >
                  {[10, 20, 50, 100, 200].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <Pagination className="mx-0 flex-1 w-full justify-center">
                <PaginationContent>
                  {pagination.page > 1 && (
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                        }}
                      />
                    </PaginationItem>
                  )}

                  {getPageNumbers().map((pageNum, index) => {
                    if (pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end') {
                      return (
                        <PaginationItem key={`${pageNum}-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          isActive={pageNum === pagination.page}
                          onClick={(e) => {
                            e.preventDefault();
                            setPagination((prev) => ({ ...prev, page: Number(pageNum) }));
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {pagination.page < pagination.pages && (
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
                        }}
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>

              <div className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
                <span>Page:</span>
                <input
                  type="number"
                  min={1}
                  max={pagination.pages}
                  className="bg-white border border-slate-200 rounded-lg w-16 px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/30 shadow-xs"
                  value={goToPage}
                  onChange={(e) => setGoToPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const p = Number(goToPage);
                      if (p >= 1 && p <= pagination.pages) {
                        setPagination((prev) => ({ ...prev, page: p }));
                        setGoToPage('');
                      }
                    }
                  }}
                  placeholder={String(pagination.page)}
                />
                <span className="text-xs">/ {pagination.pages}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClaimsTableSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Status Summary Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
            <Skeleton className="h-3 w-16 bg-slate-100" />
            <Skeleton className="h-7 w-12 bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Search Bar Skeleton */}
      <Skeleton className="h-10.5 w-full bg-slate-100 rounded-xl" />

      {/* Table Skeleton */}
      <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/60 flex items-center justify-between">
          <Skeleton className="h-4 w-24 bg-slate-200" />
          <Skeleton className="h-4 w-40 bg-slate-200" />
        </div>
        <div className="divide-y divide-slate-100 p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-5 w-8 bg-slate-100" />
                <Skeleton className="h-5 w-28 bg-slate-100" />
                <Skeleton className="h-5 w-24 bg-slate-100" />
              </div>
              <div className="flex items-center gap-6">
                <Skeleton className="h-5 w-20 bg-slate-100" />
                <Skeleton className="h-5 w-16 bg-slate-100" />
                <Skeleton className="h-6 w-20 rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
