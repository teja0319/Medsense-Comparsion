"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, FileArchive, CheckCircle2, XCircle, Loader2, Play, Info, AlertTriangle, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
            toast({
              title: "Bulk Processing Complete",
              description: `Successfully processed ${data.success} of ${data.total} claims.`,
            });
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [polling, sessionId, toast]);

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select a ZIP file to upload.",
      });
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

      const data = await res.json();

      if (res.ok) {
        setSessionId(data.sessionId);
        setPolling(true);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast({
          title: "Upload Successful",
          description: `ZIP archive uploaded. Queueing ${data.queuedFiles} claims.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: data.error || "Failed to parse ZIP archive.",
        });
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: "An error occurred during upload. Please check connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {!sessionId ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
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
              const files = e.dataTransfer.files;
              if (files && files[0]) {
                const f = files[0];
                if (f.name.toLowerCase().endsWith(".zip")) {
                  setFile(f);
                } else {
                  toast({
                    variant: "destructive",
                    title: "Invalid file type",
                    description: "Please upload a ZIP archive (.zip).",
                  });
                }
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
              dragOver
                ? 'border-violet-400 bg-violet-50 scale-[1.01]'
                : file
                ? 'border-emerald-300 bg-emerald-50/50'
                : 'border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-violet-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />

            {file ? (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                  <FileArchive className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatFileSize(file.size)} • ZIP Archive
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  <X className="w-3 h-3" /> Remove archive
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto">
                  <Upload className="w-7 h-7 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Drop ZIP file here or <span className="text-violet-600">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports ZIP archive containing PDF files
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Max 20 files per ZIP archive.</span>
            </div>
            <Button
              onClick={handleUpload}
              disabled={!file || loading}
              className="h-10 px-6 gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md shadow-violet-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {loading ? "Analyzing ZIP..." : "Start Processing"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-end border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Session ID</p>
              <code className="text-xs font-mono text-violet-600 bg-violet-50 px-2 py-1 rounded border border-violet-100">{sessionId}</code>
            </div>
            <button 
              onClick={() => { setSessionId(null); setStats(null); setFile(null); setPolling(false); }}
              className="text-xs text-slate-400 hover:text-slate-700 underline font-medium transition-colors"
            >
              Process New File
            </button>
          </div>

          {stats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total" value={stats.total} />
                <StatCard label="Processing" value={stats.processing + stats.pending} color="text-amber-500" />
                <StatCard label="Success" value={stats.success} color="text-emerald-500" icon={<CheckCircle2 className="w-4 h-4" />} />
                <StatCard label="Failed" value={stats.failed} color="text-red-500" icon={<XCircle className="w-4 h-4" />} />
              </div>

              {/* Progress Bar */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                 <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Queue Progress</span>
                    <span className="text-violet-600">
                      {Math.round(((stats.success || 0) + (stats.failed || 0)) / (stats.total || 1) * 100)}%
                    </span>
                 </div>
                 <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-1000" 
                      style={{ width: `${Math.round(((stats.success || 0) + (stats.failed || 0)) / (stats.total || 1) * 100)}%` }} 
                    />
                 </div>
                 <p className="text-[10px] text-center text-slate-400">
                   {polling ? "Processing enqueued claims..." : "Processing complete."}
                 </p>
              </div>

              {/* Show successful job IDs */}
              {stats.details?.success && stats.details.success.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed Jobs
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50/50 scrollbar-thin">
                    {stats.details.success.map((f, i) => (
                      <div key={i} className="text-xs p-2 bg-emerald-50/30 border border-emerald-100 rounded-lg text-emerald-800">
                        {f.filename}
                        {f.externalJobId && <span className="ml-1.5 text-slate-400 font-mono text-[10px]">Job: {f.externalJobId}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          )}

          {stats?.details?.failed && stats.details.failed.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Error Logs
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50/50 scrollbar-thin">
                {stats.details.failed.map((f, i) => (
                  <div key={i} className="text-xs p-2 bg-red-50/30 border border-red-100 rounded-lg text-red-800">
                    {f.filename}: {f.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = "text-slate-800", icon }: any) {
  return (
    <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-150 shadow-sm flex flex-col justify-between">
      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</p>
      <div className={`text-2xl font-bold flex items-center gap-2 mt-1 ${color}`}>
        {value}
        {icon}
      </div>
    </div>
  );
}
