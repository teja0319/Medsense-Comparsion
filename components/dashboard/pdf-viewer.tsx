'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ZoomIn, ZoomOut, Download, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

interface PdfViewerProps {
  pdfUrl: string;
  fileName?: string;
}

export function PdfViewer({ pdfUrl, fileName = 'document.pdf' }: PdfViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const getViewerUrl = (url: string): string => {
    // Instead of Google Docs viewer which fails often, proxy it directly through our app
    if (url.includes('blob.core.windows.net') || url.startsWith('http')) {
      return `/api/proxy-pdf?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const viewerUrl = getViewerUrl(pdfUrl);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Set timeout to detect if PDF loads
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError('PDF took too long to load. Try downloading instead.');
    }, 45000); // Increased timeout to 45 seconds

    const handleIframeLoad = () => {
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const handleIframeError = () => {
      setLoading(false);
      setError('Unable to load PDF. Try downloading or opening in a new tab.');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
      iframe.addEventListener('error', handleIframeError);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (iframe) {
        iframe.removeEventListener('load', handleIframeLoad);
        iframe.removeEventListener('error', handleIframeError);
      }
    };
  }, [viewerUrl]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNew = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    if (iframeRef.current) {
      iframeRef.current.src = viewerUrl;
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom((prev) => {
      const newZoom = direction === 'in' ? prev + 0.1 : prev - 0.1;
      return Math.max(0.5, Math.min(2, newZoom));
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom('out')}
            disabled={zoom <= 0.5}
            className="h-8 px-2 text-xs"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs font-medium px-2 min-w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom('in')}
            disabled={zoom >= 2}
            className="h-8 px-2 text-xs"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 px-2 text-xs"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenNew}
            className="h-8 px-2 text-xs"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden relative bg-slate-100 dark:bg-slate-950">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 z-10">
            <Spinner className="w-8 h-8 mb-2" />
            <p className="text-xs text-slate-600 dark:text-slate-400">Loading PDF...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/20 z-10 p-4">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-xs text-red-700 dark:text-red-400 text-center mb-3">{error}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRetry} className="text-xs h-8">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload} className="text-xs h-8">
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )}

        {!error && (
          <iframe
            ref={iframeRef}
            src={viewerUrl}
            className="w-full h-full border-0"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`,
            }}
            title="PDF Viewer"
            allow="autoplay"
          />
        )}
      </div>
    </div>
  );
}
