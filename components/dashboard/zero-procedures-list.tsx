'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { PdfViewer } from '@/components/dashboard/pdf-viewer';
import { AlertTriangle, Building2, MapPin, FileWarning, Search, Eye, X, ChevronLeft, ChevronRight, RotateCcw, Flag, MoreHorizontal, RefreshCcw, FileQuestion } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ZeroHospital {
  _id: string;
  hospName: string;
  hospCode: string;
  state: string;
  city: string;
  status: string;
  filename: string;
  blobUrl: string;
  parsedData?: any;
}

interface ZeroProceduresListProps {
  projectId: string;
}

export function ZeroProceduresList({ projectId }: ZeroProceduresListProps) {
  const [hospitals, setHospitals] = useState<ZeroHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<{ completed: number; failed: number; processing: number; pending: number; total: number } | null>(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [tabCounts, setTabCounts] = useState({ queue: 0, verified_empty: 0, needs_reprocessing: 0, different_pdf: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<string>('all');
  const [selectedHospital, setSelectedHospital] = useState<ZeroHospital | null>(null);
  const [rerunning, setRerunning] = useState<Set<string>>(new Set());
  const [rerunSuccess, setRerunSuccess] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHospitals();
  }, [projectId, activeTab]);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/zero-procedures?tab=${activeTab}`);

      if (!response.ok) {
        throw new Error('Failed to fetch zero-procedure hospitals');
      }

      const data = await response.json();
      setHospitals(data.hospitals || []);
      if (data.statusCounts) {
        setStatusCounts(data.statusCounts);
      }
      if (data.tabCounts) {
        setTabCounts(data.tabCounts);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast.error(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const flagJob = async (hospital: ZeroHospital, flagName: string, label: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/jobs/${hospital._id}/flags`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flag: flagName, value: true }),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to flag job');
      }
      toast.success(`Flagged ${hospital.hospName} as ${label}`);
      setHospitals((prev) => prev.filter((h) => h._id !== hospital._id));
      // Determine the correct property name for the tab state
      const targetTab = flagName === 'manually_verified_no_procedures' ? 'verified_empty' : flagName;
      
      setTabCounts((prev) => ({
        ...prev,
        [activeTab]: Math.max(0, prev[activeTab as keyof typeof prev] - 1),
        [targetTab]: prev[targetTab as keyof typeof prev] + 1,
      }));
      if (selectedHospital?._id === hospital._id) {
        setSelectedHospital(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error flagging');
    }
  };

  const rerunJob = async (hospital: ZeroHospital) => {
    setRerunning((prev) => new Set(prev).add(hospital._id));
    try {
      const response = await fetch(
        `/api/projects/${projectId}/jobs/${hospital._id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending' }),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rerun job');
      }
      toast.success(`Rerun queued for ${hospital.hospName}`);
      setRerunSuccess((prev) => new Set(prev).add(hospital._id));
      // Update local state
      setHospitals((prev) =>
        prev.map((h) => (h._id === hospital._id ? { ...h, status: 'pending' } : h))
      );
      if (selectedHospital?._id === hospital._id) {
        setSelectedHospital({ ...hospital, status: 'pending' });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rerun');
    } finally {
      setRerunning((prev) => {
        const next = new Set(prev);
        next.delete(hospital._id);
        return next;
      });
    }
  };

  // Get unique states for filter
  const uniqueStates = Array.from(new Set(hospitals.map((h) => h.state))).sort();

  // Build flat filtered list (for navigation)
  const filteredList = hospitals
    .filter((h) => filterState === 'all' || h.state === filterState)
    .filter((h) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        h.hospName.toLowerCase().includes(term) ||
        h.hospCode.toLowerCase().includes(term) ||
        h.filename.toLowerCase().includes(term) ||
        h.city.toLowerCase().includes(term)
      );
    });

  // Group by state then city
  const groupedByState = filteredList.reduce<Record<string, Record<string, ZeroHospital[]>>>((acc, h) => {
    if (!acc[h.state]) acc[h.state] = {};
    if (!acc[h.state][h.city]) acc[h.state][h.city] = [];
    acc[h.state][h.city].push(h);
    return acc;
  }, {});

  const filteredStates = Object.keys(groupedByState).sort();

  // Navigation in comparison view
  const currentIndex = selectedHospital ? filteredList.findIndex((h) => h._id === selectedHospital._id) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < filteredList.length - 1;

  const goToPrev = () => {
    if (canGoPrev) setSelectedHospital(filteredList[currentIndex - 1]);
  };
  const goToNext = () => {
    if (canGoNext) setSelectedHospital(filteredList[currentIndex + 1]);
  };

  const rerunAll = async () => {
    const toRerun = filteredList.filter((h) => !rerunSuccess.has(h._id));
    if (toRerun.length === 0) {
      toast.info('All visible hospitals are already queued for rerun');
      return;
    }
    for (const h of toRerun) {
      await rerunJob(h);
    }
    toast.success(`Queued ${toRerun.length} jobs for rerun`);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!selectedHospital) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedHospital(null);
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedHospital, currentIndex]);

  // ─── Comparison View ───────────────────────────────────────────────
  if (selectedHospital) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Top Bar */}
        <div className="shrink-0 border-b bg-muted/40 px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedHospital(null)}
              className="gap-1 shrink-0"
            >
              <X className="h-4 w-4" />
              Close
            </Button>
            <div className="h-5 w-px bg-border shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {selectedHospital.hospName}
                {selectedHospital.hospCode && (
                  <span className="ml-2 text-xs font-mono text-muted-foreground">
                    ({selectedHospital.hospCode})
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedHospital.state} → {selectedHospital.city} • {selectedHospital.filename}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} of {filteredList.length}
            </span>
            <Button size="sm" variant="outline" onClick={goToPrev} disabled={!canGoPrev} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={goToNext} disabled={!canGoNext} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Split View: PDF left, Info right */}
        <div className="flex-1 flex overflow-hidden">
          {/* PDF Panel */}
          <div className="w-1/2 border-r flex flex-col overflow-hidden">
            {selectedHospital.blobUrl ? (
              <PdfViewer
                pdfUrl={selectedHospital.blobUrl}
                fileName={selectedHospital.filename}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <FileWarning className="mx-auto h-12 w-12 text-amber-500" />
                  <p className="text-sm text-muted-foreground font-medium">No PDF available</p>
                  <p className="text-xs text-muted-foreground">blob_url is missing for this job</p>
                </div>
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div className="w-1/2 flex flex-col overflow-auto p-6 space-y-5">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-amber-600">Zero Procedures Detected</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                This hospital PDF was processed but no procedures were extracted. 
                Compare the PDF content on the left to verify if procedure data exists in the document.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InfoCard label="Hospital Name" value={selectedHospital.hospName} />
              <InfoCard label="Hospital Code" value={selectedHospital.hospCode || 'N/A'} />
              <InfoCard label="State" value={selectedHospital.state} />
              <InfoCard label="City" value={selectedHospital.city} />
              <InfoCard label="Status" value={selectedHospital.status} highlight={
                selectedHospital.status === 'completed' ? 'green' :
                selectedHospital.status === 'failed' ? 'red' : 'amber'
              } />
              <InfoCard label="Job ID" value={selectedHospital._id} mono />
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source File</p>
              <p className="text-sm font-medium break-all">{selectedHospital.filename}</p>
              {selectedHospital.blobUrl && (
                <a
                  href={selectedHospital.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-blue-500 hover:underline mt-1"
                >
                  Open PDF in new tab ↗
                </a>
              )}
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Possible Reasons</p>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>PDF parsing may have failed silently</li>
                <li>PDF structure might be non-standard (scanned images instead of text)</li>
                <li>Document may only contain terms/notes without procedures</li>
                <li>Parser timeout or Gemini response blocked</li>
              </ul>
            </div>

            {selectedHospital.parsedData && Object.keys(selectedHospital.parsedData).length > 0 && (
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parsed Data (Raw JSON)</p>
                <div className="bg-muted/30 border border-border/50 rounded-md p-3 overflow-x-auto max-h-64 overflow-y-auto custom-scrollbar">
                  <pre className="text-[10px] font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {JSON.stringify(selectedHospital.parsedData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 border-primary/20 hover:bg-primary/5">
                    <Flag className="h-3.5 w-3.5" />
                    Triage Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Flag Document</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => flagJob(selectedHospital, 'needs_reprocessing', 'Needs Reprocessing')}>
                    <RefreshCcw className="mr-2 h-4 w-4 text-blue-500" /> Process Again
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => flagJob(selectedHospital, 'needs_different_pdf', 'Different PDF needed')}>
                    <FileQuestion className="mr-2 h-4 w-4 text-purple-500" /> Different PDF needed
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => flagJob(selectedHospital, 'manually_verified_no_procedures', 'Verified Empty')} className="text-red-600 focus:text-red-600">
                    <Flag className="mr-2 h-4 w-4" /> Mark Verified Empty
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => {
                  window.open(`/projects/${projectId}/jobs/${selectedHospital._id}`, '_blank');
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                Open Full Comparison
              </Button>
              <Button
                size="sm"
                className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => rerunJob(selectedHospital)}
                disabled={rerunning.has(selectedHospital._id) || rerunSuccess.has(selectedHospital._id)}
              >
                {rerunning.has(selectedHospital._id) ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {rerunSuccess.has(selectedHospital._id) ? 'Queued for Rerun' : 'Rerun Parsing'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── List View ─────────────────────────────────────────────────────

  const renderTabs = () => (
    <div className="flex space-x-2 border-b border-border/50 mb-6 overflow-x-auto">
      <TabButton id="queue" label="Queue" count={tabCounts.queue || 0} active={activeTab} set={setActiveTab} />
      <TabButton id="needs_reprocessing" label="Needs Reprocessing" count={tabCounts.needs_reprocessing || 0} active={activeTab} set={setActiveTab} icon={<RefreshCcw className="w-3.5 h-3.5 text-blue-500"/>} />
      <TabButton id="different_pdf" label="Different PDF" count={tabCounts.different_pdf || 0} active={activeTab} set={setActiveTab} icon={<FileQuestion className="w-3.5 h-3.5 text-purple-500"/>} />
      <TabButton id="verified_empty" label="Verified Empty" count={tabCounts.verified_empty || 0} active={activeTab} set={setActiveTab} icon={<Flag className="w-3.5 h-3.5 text-red-500"/>} />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {renderTabs()}
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        {renderTabs()}
        <div className="rounded-lg bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={fetchHospitals} variant="outline" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (hospitals.length === 0) {
    return (
      <div className="space-y-2">
        {renderTabs()}
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <p className="text-green-600 font-semibold text-lg">No hospitals here!</p>
          <p className="text-muted-foreground text-sm mt-2">This tab is currently empty.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderTabs()}
      {/* Summary Banner */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-amber-600">
                {hospitals.length} Hospital{hospitals.length !== 1 ? 's' : ''} with Zero Procedures
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                These hospitals have no procedures data extracted. Click <strong>View PDF</strong> to compare, or mark them as verified if they truly have no procedures.
              </p>
            </div>
          </div>
          {statusCounts && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded border border-emerald-500/20">Completed: {statusCounts.completed}</span>
              <span className="text-xs font-semibold bg-rose-500/10 text-rose-600 px-2 py-1 rounded border border-rose-500/20">Failed: {statusCounts.failed}</span>
              <span className="text-xs font-semibold bg-blue-500/10 text-blue-600 px-2 py-1 rounded border border-blue-500/20">Processing: {statusCounts.processing}</span>
              <span className="text-xs font-semibold bg-amber-500/10 text-amber-600 px-2 py-1 rounded border border-amber-500/20">Pending: {statusCounts.pending}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search hospital name, code, or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All States ({uniqueStates.length})</option>
          {uniqueStates.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          onClick={rerunAll}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Rerun All ({filteredList.filter((h) => !rerunSuccess.has(h._id)).length})
        </Button>
      </div>

      {/* Grouped List */}
      {filteredStates.map((state) => {
        const cities = groupedByState[state];
        const cityNames = Object.keys(cities).sort();
        
        const stateHospitals = Object.values(cities).flat();
        const stateToRerun = stateHospitals.filter((h) => !rerunSuccess.has(h._id));

        return (
          <div key={state} className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold uppercase">{state}</h3>
              <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                {stateHospitals.length} hospitals
              </span>
              {stateToRerun.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 text-xs gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                  onClick={async () => {
                    for (const h of stateToRerun) {
                      await rerunJob(h);
                    }
                    toast.success(`Queued ${stateToRerun.length} jobs for rerun in ${state}`);
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                  Rerun {stateToRerun.length} in State
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 ml-4">
              {cityNames.map((city) => {
                const cityHospitals = cities[city];
                if (cityHospitals.length === 0) return null;

                return (
                  <Card key={city} className="p-4 border-amber-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">{city}</h4>
                      <span className="ml-auto text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                        {cityHospitals.length}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {cityHospitals.map((h) => (
                        <div
                          key={h._id}
                          className="rounded-md bg-muted/50 p-2.5 text-xs space-y-1.5 border border-border/50 hover:border-amber-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-foreground leading-tight">
                              {h.hospName}
                            </span>
                            {h.hospCode && (
                              <span className="shrink-0 bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-mono">
                                {h.hospCode}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileWarning className="h-3 w-3 text-amber-500 shrink-0" />
                            <span className="truncate" title={h.filename}>
                              {h.filename}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  h.status === 'completed'
                                    ? 'bg-green-500/10 text-green-600'
                                    : h.status === 'failed'
                                    ? 'bg-red-500/10 text-red-500'
                                    : 'bg-amber-500/10 text-amber-600'
                                }`}
                              >
                                {h.status}
                              </span>
                              {rerunSuccess.has(h._id) && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 font-medium">
                                  ✓ Queued
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                                onClick={(e) => { e.stopPropagation(); rerunJob(h); }}
                                disabled={rerunning.has(h._id) || rerunSuccess.has(h._id)}
                              >
                                {rerunning.has(h._id) ? (
                                  <Spinner className="h-3 w-3" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                                Rerun
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                                onClick={() => setSelectedHospital(h)}
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-6 w-6 p-0 border-primary/20 hover:bg-primary/10" title="Triage Actions">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs font-semibold">Triage Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); flagJob(h, 'needs_reprocessing', 'Needs Reprocessing'); }} className="text-xs py-2">
                                    <RefreshCcw className="mr-2 h-3.5 w-3.5 text-blue-500" /> Process Again
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); flagJob(h, 'needs_different_pdf', 'Different PDF'); }} className="text-xs py-2">
                                    <FileQuestion className="mr-2 h-3.5 w-3.5 text-purple-500" /> Different PDF needed
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); flagJob(h, 'manually_verified_no_procedures', 'Verified Empty'); }} className="text-xs text-red-600 focus:text-red-600 focus:bg-red-50 py-2">
                                    <Flag className="mr-2 h-3.5 w-3.5" /> Mark Verified Empty
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: 'green' | 'red' | 'amber' }) {
  const highlightClass = highlight === 'green'
    ? 'text-green-600'
    : highlight === 'red'
    ? 'text-red-500'
    : highlight === 'amber'
    ? 'text-amber-600'
    : 'text-foreground';

  return (
    <div className="rounded-lg border p-3 space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-medium break-all ${mono ? 'font-mono text-xs' : ''} ${highlightClass}`}>
        {value}
      </p>
    </div>
  );
}

function TabButton({ id, label, count, active, set, icon }: any) {
  const isActive = active === id;
  return (
    <button
      onClick={() => set(id)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        isActive
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      }`}
    >
      {icon}
      {label}
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        {count}
      </span>
    </button>
  );
}
