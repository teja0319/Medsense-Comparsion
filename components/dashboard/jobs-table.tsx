'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
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

interface ParsedData {
  State?: string;
  City?: string;
  Hospname?: string;
  Hospid?: string;
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

interface JobsTableProps {
  projectId: string;
  initialPage?: number;
}

export function JobsTable({ projectId, initialPage = 1 }: JobsTableProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: 10,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/projects/${projectId}/jobs?page=${pagination.page}&limit=${pagination.limit}`
        );
        if (!response.ok) throw new Error('Failed to fetch jobs');
        const data = await response.json();
        setJobs(data.jobs);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [projectId, pagination.page]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'secondary',
      pending: 'outline',
      failed: 'destructive',
      processing: 'default',
    };
    return statusMap[status.toLowerCase()] || 'outline';
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

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">No jobs found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-border/50 rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-muted/30 border-b border-border/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-foreground/70 font-semibold">Job ID</TableHead>
              <TableHead className="text-foreground/70 font-semibold">State</TableHead>
              <TableHead className="text-foreground/70 font-semibold">City</TableHead>
              <TableHead className="text-foreground/70 font-semibold">Hospital Name</TableHead>
              <TableHead className="text-foreground/70 font-semibold">Status</TableHead>
              <TableHead className="text-foreground/70 font-semibold">Files</TableHead>
              <TableHead className="text-foreground/70 font-semibold">Created Date</TableHead>
              <TableHead className="text-foreground/70 font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job, index) => (
              <TableRow 
                key={job._id}
                className="border-border/30 hover:bg-muted/50 transition-colors duration-200"
              >
                <TableCell className="font-mono text-xs text-muted-foreground">{job._id.slice(-8)}</TableCell>
                <TableCell className="text-foreground/80">{job.parsed_data?.State || 'N/A'}</TableCell>
                <TableCell className="text-foreground/80">{job.parsed_data?.City || 'N/A'}</TableCell>
                <TableCell className="text-foreground/80 max-w-xs truncate">{job.parsed_data?.Hospname || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadge(job.status)} className="capitalize">
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-foreground/80">{job.files?.length || 0} file(s)</TableCell>
                <TableCell className="text-foreground/80">
                  {job.created_at
                    ? new Date(job.created_at).toLocaleDateString()
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/projects/${projectId}/jobs/${job._id}`}
                    className="text-primary hover:text-primary/80 text-sm font-medium transition-colors inline-flex items-center gap-1"
                  >
                    View
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center">
          <Pagination>
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
                const isEllipsis =
                  pageNum > pagination.page + 1 &&
                  pageNum < pagination.pages;

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
        </div>
      )}
    </div>
  );
}
