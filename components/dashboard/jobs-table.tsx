'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Eye, FileText, Loader2, Upload, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';
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
import { Spinner } from '@/components/ui/spinner';

interface ParsedData {
  [key: string]: unknown;
}

interface Job {
  _id: string;
  project_id: string;
  status: string;
  files?: Array<{ filename: string; blob_url: string }>;
  parsed_data?: ParsedData;
  created_at?: string;
}

interface StatusCounts {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface JobsTableProps {
  projectId: string;
  initialPage?: number;
}

export function JobsTable({ projectId, initialPage = 1 }: JobsTableProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<StatusCounts>({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0 });
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [goToPage, setGoToPage] = useState('');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleSelectJob = (jobId: string) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId]
    );
  };

  const handleToggleSelectAll = () => {
    const currentPageJobIds = jobs.map((j) => j._id);
    const allSelectedOnPage = currentPageJobIds.every((id) =>
      selectedJobIds.includes(id)
    );

    if (allSelectedOnPage) {
      setSelectedJobIds((prev) =>
        prev.filter((id) => !currentPageJobIds.includes(id))
      );
    } else {
      setSelectedJobIds((prev) => {
        const newSelection = [...prev];
        currentPageJobIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedJobIds.length === 0) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedJobIds.length} selected job(s)?`
    );
    if (!confirmDelete) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/projects/${projectId}/jobs`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: selectedJobIds }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete jobs');
      }

      setSelectedJobIds([]);
      await fetchJobs(true);
    } catch (err: any) {
      alert(err.message || 'Failed to delete jobs');
    } finally {
      setDeleting(false);
    }
  };

  const fetchJobs = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/jobs?page=${pagination.page}&limit=${pagination.limit}`
      );
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data.jobs);
      setPagination(data.pagination);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(true);
  }, [projectId, pagination.page, pagination.limit]);

  // Auto-refresh stats and list (without visual loader)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobs(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [projectId, pagination.page, pagination.limit]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
  };

  const uploadFiles = async (files: FileList) => {
    try {
      setUploading(true);
      setUploadProgress('Preparing upload...');
      
      const formData = new FormData();
      let pdfCount = 0;
      for (let i = 0; i < files.length; i++) {
        if (files[i].name.toLowerCase().endsWith('.pdf')) {
          formData.append('files', files[i]);
          pdfCount++;
        }
      }

      if (pdfCount === 0) {
        alert('Please select valid PDF files.');
        setUploading(false);
        return;
      }

      setUploadProgress(`Uploading ${pdfCount} file(s)...`);

      const res = await fetch(`/api/projects/${projectId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      setUploadProgress('Files uploaded successfully!');
      setTimeout(() => {
        setUploadProgress(null);
        setUploading(false);
      }, 1500);

      // Refresh list immediately
      fetchJobs(false);

    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive font-medium">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PDF File Upload Zone (Full Width Top Banner) */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow transition-all duration-300 w-full animate-in fade-in duration-300">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".pdf"
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-bold text-slate-700">{uploadProgress}</p>
            <p className="text-xs text-slate-400">Processing your reports, please wait...</p>
          </div>
        ) : (
          <button
            onClick={triggerFileInput}
            className="w-full flex flex-col md:flex-row items-center justify-between p-5 px-6 border-2 border-dashed border-slate-200 hover:border-primary/45 rounded-xl bg-slate-50/30 hover:bg-slate-50/80 transition-all duration-300 group gap-4 text-left cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 border border-primary/10 shrink-0">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800 tracking-wide group-hover:text-primary transition-colors block">
                  Upload PDF Medical Reports
                </span>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  Upload multiple patient report files for comparative parsing
                </span>
              </div>
            </div>
            <div className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-xs text-xs font-bold text-slate-650 group-hover:border-primary/30 group-hover:text-primary transition-all shrink-0">
              Drag &amp; drop or click to browse files
            </div>
          </button>
        )}
      </div>

      {/* Status Statistics Cards (Full Width Grid Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in duration-300">
        <StatCard
          label="Total Jobs"
          value={counts.total}
          icon={<FileText className="w-4 h-4 text-slate-500" />}
          colorClass="text-slate-800"
          borderClass="border-slate-200/60"
          iconBgClass="bg-slate-50 border-slate-100"
        />
        <StatCard
          label="Completed"
          value={counts.completed}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          colorClass="text-emerald-600"
          borderClass="border-emerald-200/60"
          iconBgClass="bg-emerald-50/50 border-emerald-100"
        />
        <StatCard
          label="Processing"
          value={counts.processing}
          icon={<Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          colorClass="text-blue-600"
          borderClass="border-blue-200/60"
          iconBgClass="bg-blue-50/50 border-blue-100"
        />
        <StatCard
          label="Pending"
          value={counts.pending}
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          colorClass="text-amber-600"
          borderClass="border-amber-200/60"
          iconBgClass="bg-amber-50/50 border-amber-100"
        />
        <StatCard
          label="Failed"
          value={counts.failed}
          icon={<XCircle className="w-4 h-4 text-rose-500" />}
          colorClass="text-rose-600"
          borderClass="border-rose-200/60"
          iconBgClass="bg-rose-50/50 border-rose-100"
        />
      </div>

      {/* ── Table Section ─────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between h-10">
          {selectedJobIds.length > 0 ? (
            <div className="flex items-center gap-4 animate-in slide-in-from-left-2 duration-200">
              <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg select-none">
                {selectedJobIds.length} selected
              </span>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete Selected
              </button>
            </div>
          ) : (
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Jobs Database</h3>
          )}
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="flex items-center justify-center h-48 border border-slate-200/60 rounded-2xl bg-white/50">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto border border-slate-100">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-slate-600 text-xs font-semibold">No jobs found in this project</p>
              <p className="text-[10px] text-slate-400">Upload PDF documents above to populate this view</p>
            </div>
          </div>
        ) : (
          <>
            <div className="border border-slate-200/60 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-md shadow-lg shadow-slate-100/50">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-200/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center px-4">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-primary focus:ring-primary/30 w-3.5 h-3.5 cursor-pointer accent-primary"
                        checked={jobs.length > 0 && jobs.every((j) => selectedJobIds.includes(j._id))}
                        onChange={handleToggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-slate-500 font-bold text-[9px] uppercase tracking-widest w-16 px-4">#</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[9px] uppercase tracking-widest px-4">File Name</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[9px] uppercase tracking-widest w-28 text-center px-4">Status</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[9px] uppercase tracking-widest w-24 text-center px-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job, index) => {
                    const rowNumber = (pagination.page - 1) * pagination.limit + index + 1;
                    const fileName = job.files && job.files.length > 0
                      ? job.files[0].filename
                      : 'No file';

                    return (
                      <TableRow
                        key={job._id}
                        className={`border-b border-slate-100 last:border-0 hover:bg-slate-55/40 transition-colors duration-200 group text-slate-700 ${
                          selectedJobIds.includes(job._id) ? 'bg-primary/5 hover:bg-primary/10' : ''
                        }`}
                      >
                        <TableCell className="text-center px-4">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-primary focus:ring-primary/30 w-3.5 h-3.5 cursor-pointer accent-primary"
                            checked={selectedJobIds.includes(job._id)}
                            onChange={() => handleToggleSelectJob(job._id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-400 font-semibold px-4">
                          {rowNumber}
                        </TableCell>
                        <TableCell className="px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                              <FileText className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-xs font-semibold text-slate-750 truncate max-w-md" title={fileName}>
                              {fileName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold select-none capitalize ${
                            job.status === 'completed' || job.status === 'success'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs'
                              : job.status === 'processing'
                              ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs animate-pulse'
                              : job.status === 'failed'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-xs'
                              : 'bg-amber-50 text-amber-600 border border-amber-200 shadow-xs'
                          }`}>
                            {job.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                            {job.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center px-4">
                          <Link
                            href={`/projects/${projectId}/jobs/${job._id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/15 hover:border-primary/30 hover:shadow-[0_0_10px_rgba(59,130,246,0.08)] transition-all duration-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {pagination.pages > 1 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 px-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <span className="text-xs font-medium">Rows per page:</span>
                  <select
                    className="bg-background border border-border rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    value={pagination.limit}
                    onChange={(e) => {
                      const newLimit = Number(e.target.value);
                      setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
                    }}
                  >
                    {[10, 20, 50, 100, 200, 500].map((size) => (
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
                          href={`?page=${pagination.page - 1}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setPagination((prev) => ({
                              ...prev,
                              page: prev.page - 1,
                            }));
                          }}
                        />
                      </PaginationItem>
                    )}

                    {Array.from({ length: pagination.pages }).map((_, i) => {
                      const pageNum = i + 1;

                      if (
                        pageNum === 1 ||
                        pageNum === pagination.pages ||
                        Math.abs(pageNum - pagination.page) <= 1
                      ) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href={`?page=${pageNum}`}
                              isActive={pageNum === pagination.page}
                              onClick={(e) => {
                                e.preventDefault();
                                setPagination((prev) => ({
                                  ...prev,
                                  page: pageNum,
                                }));
                              }}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (pageNum === pagination.page + 2) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                    })}

                    {pagination.page < pagination.pages && (
                      <PaginationItem>
                        <PaginationNext
                          href={`?page=${pagination.page + 1}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setPagination((prev) => ({
                              ...prev,
                              page: prev.page + 1,
                            }));
                          }}
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>

                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <span className="text-xs font-medium">Go to page:</span>
                  <input
                    type="number"
                    min={1}
                    max={pagination.pages}
                    className="bg-background border border-border rounded-lg w-16 px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
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
                  />
                  <span className="shrink-0 text-xs font-medium">/ {pagination.pages}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, colorClass = 'text-slate-800', borderClass = 'border-slate-200/60', iconBgClass = 'bg-slate-50/50' }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass?: string;
  borderClass?: string;
  iconBgClass?: string;
}) {
  return (
    <div className={`bg-white/90 border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-between gap-4 ${borderClass}`}>
      <div className="space-y-1 truncate">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block truncate">{label}</span>
        <p className={`text-2xl font-bold tracking-tight ${colorClass}`}>{value}</p>
      </div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${iconBgClass}`}>
        {icon}
      </div>
    </div>
  );
}
