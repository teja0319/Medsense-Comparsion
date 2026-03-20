"use client";

import React, { useState, useEffect } from "react";
import { Upload, FileArchive, CheckCircle2, XCircle, Loader2, Play, Info } from "lucide-react";

interface JobStats {
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  details: Record<string, Array<{ filename: string; city: string; state: string; error?: string; externalJobId?: string }>>;
}

export function ZipProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!polling || !sessionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/upload-status?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          // Stop polling when all done
          if (data.total > 0 && (data.success + data.failed) >= data.total) {
            setPolling(false);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [polling, sessionId]);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a ZIP file.");
      return;
    }

    setLoading(true);
    setStats(null);
    setSessionId(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload-zip", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setSessionId(data.sessionId);
        setPolling(true);
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("An error occurred during upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileArchive className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">ZIP Document Processor</h2>
          <p className="text-xs text-muted-foreground">Extracts State/City structure and uploads PDFs automatically</p>
        </div>
      </div>

      {!sessionId ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-10 bg-muted/5 hover:bg-muted/10 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="zip-upload"
            />
            <label htmlFor="zip-upload" className="cursor-pointer group">
              <span className="text-sm font-medium text-foreground bg-primary/10 px-4 py-2 rounded-full group-hover:bg-primary/20 transition-all border border-primary/20">
                {file ? file.name : "Select ZIP archive"}
              </span>
            </label>
            <p className="text-[10px] text-muted-foreground mt-4">Expected structure: State/City/PDFs</p>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loading ? "Analyzing ZIP..." : "Start Processing"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-border pb-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Session ID</p>
              <code className="text-xs font-mono text-primary bg-primary/5 px-2 py-1 rounded">{sessionId}</code>
            </div>
            <button 
              onClick={() => { setSessionId(null); setStats(null); setFile(null); setPolling(false); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Process New File
            </button>
          </div>

          {stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total" value={stats.total} />
                <StatCard label="Processing" value={stats.processing + stats.pending} color="text-amber-500" />
                <StatCard label="Success" value={stats.success} color="text-green-500" icon={<CheckCircle2 className="w-3 h-3" />} />
                <StatCard label="Failed" value={stats.failed} color="text-red-500" icon={<XCircle className="w-3 h-3" />} />
              </div>

              {/* Show successful job IDs */}
              {stats.details?.success && stats.details.success.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-green-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Completed Jobs
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
                    {stats.details.success.map((f, i) => (
                      <div key={i} className="text-[10px] p-2 bg-green-500/5 border border-green-500/10 rounded-md text-green-600">
                        <span className="font-bold">[{f.state}/{f.city}]</span> {f.filename}
                        {f.externalJobId && <span className="ml-1 text-muted-foreground">→ Job: {f.externalJobId}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {stats?.details?.failed && stats.details.failed.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-red-500 flex items-center gap-1">
                <Info className="w-3 h-3" /> Error Logs
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1.5 scrollbar-thin">
                {stats.details.failed.map((f, i) => (
                  <div key={i} className="text-[10px] p-2 bg-red-500/5 border border-red-500/10 rounded-md text-red-600">
                    <span className="font-bold">[{f.state}/{f.city}]</span> {f.filename}: {f.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 space-y-1.5">
             <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Queue Progress</span>
                <span className="text-primary font-bold">
                  {Math.round(((stats?.success || 0) + (stats?.failed || 0)) / (stats?.total || 1) * 100)}%
                </span>
             </div>
             <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000" 
                  style={{ width: `${Math.round(((stats?.success || 0) + (stats?.failed || 0)) / (stats?.total || 1) * 100)}%` }} 
                />
             </div>
             <p className="text-[9px] text-center text-muted-foreground">
               {polling ? "Processing... 100 files/min" : "Processing complete."}
             </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = "text-foreground", icon }: any) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
      <div className={`text-xl font-bold flex items-center gap-2 ${color}`}>
        {value}
        {icon}
      </div>
    </div>
  );
}
