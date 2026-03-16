'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JsonViewerProps {
  data: unknown;
  expanded?: boolean;
}

function JsonNode({
  value,
  path = '',
  expanded = false,
  defaultExpanded = false,
}: {
  value: unknown;
  path?: string;
  expanded?: boolean;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || expanded);

  if (value === null) {
    return <span className="text-yellow-500 dark:text-yellow-400 font-medium text-xs">null</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">{value.toString()}</span>;
  }

  if (typeof value === 'number') {
    return <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">{value}</span>;
  }

  if (typeof value === 'string') {
    return (
      <span className="text-orange-600 dark:text-orange-400 text-xs wrap-break-word">
        <span className="text-orange-600 dark:text-orange-400">"</span>
        <span>{value}</span>
        <span className="text-orange-600 dark:text-orange-400">"</span>
      </span>
    );
  }

  if (Array.isArray(value)) {
    const hasItems = value.length > 0;
    return (
      <div className="space-y-0.5">
        <div
          className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 rounded transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {hasItems && (isExpanded ? <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />)}
          {!hasItems && <span className="w-3" />}
          <span className="text-slate-600 dark:text-slate-400 font-medium text-xs">
            [
            {hasItems && !isExpanded && <span className="text-muted-foreground ml-0.5 text-xs">{value.length} items</span>}
            ]
          </span>
        </div>
        {isExpanded && hasItems && (
          <div className="ml-3 border-l border-border/50 pl-2 space-y-0.5">
            {value.map((item, index) => (
              <div key={index} className="flex items-start gap-1 py-0.5 text-xs">
                <span className="text-muted-foreground min-w-fit text-xs">{index}:</span>
                <JsonNode value={item} path={`${path}[${index}]`} defaultExpanded={defaultExpanded} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    const hasItems = entries.length > 0;
    return (
      <div className="space-y-0.5">
        <div
          className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 rounded transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {hasItems && (isExpanded ? <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />)}
          {!hasItems && <span className="w-3" />}
          <span className="text-slate-600 dark:text-slate-400 font-medium text-xs">
            {'{'}
            {hasItems && !isExpanded && <span className="text-muted-foreground ml-0.5 text-xs">{entries.length} fields</span>}
            {'}'}
          </span>
        </div>
        {isExpanded && hasItems && (
          <div className="ml-3 border-l border-border/50 pl-2 space-y-0.5">
            {entries.map(([key, val]) => (
              <div key={key} className="flex items-start gap-1 py-0.5 text-xs">
                <span className="text-red-600 dark:text-red-400 font-medium min-w-fit text-xs">
                  &quot;{key}&quot;
                </span>
                <span className="text-slate-600 dark:text-slate-400 text-xs">:</span>
                <JsonNode value={val} path={`${path}.${key}`} defaultExpanded={defaultExpanded} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span className="text-slate-600 dark:text-slate-400 text-xs">{String(value)}</span>;
}

export function JsonViewer({ data, expanded = false }: JsonViewerProps) {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/20">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Interactive JSON</p>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors"
          title="Copy to clipboard"
        >
          {copyFeedback ? (
            <>
              <Check className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
        <JsonNode value={data} expanded={true} defaultExpanded={expanded} />
      </div>

      {/* Footer info */}
      <div className="shrink-0 text-xs text-muted-foreground px-3 py-1.5 border-t border-border/50 bg-muted/20">
        <span className="text-xs">Size: {JSON.stringify(data).length.toLocaleString()} bytes</span>
      </div>
    </div>
  );
}
