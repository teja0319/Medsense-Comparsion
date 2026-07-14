'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, FileText, LayoutList } from 'lucide-react';

interface ParsedDetailsViewerProps {
  data: Record<string, unknown>;
}

// Converts harsh ALL CAPS text to readable Sentence Case
function formatText(text: string): string {
  if (typeof text !== 'string') return String(text);
  
  const hasLetters = /[a-zA-Z]/.test(text);
  const isAllCaps = hasLetters && text === text.toUpperCase();
  
  if (!isAllCaps) return text;
  
  // Format acronym spacing if separated by spaces (e.g. "Y E S / N O" -> "Yes / No", "M E CODE" -> "ME Code")
  let cleanText = text
    .replace(/\b([a-zA-Z])\s+(?=[a-zA-Z]\b)/g, '$1') // joins spaced letters like "Y E S" -> "YES"
    .replace(/\bM\s+E\b/gi, 'ME');
    
  // Convert to Sentence Case
  return cleanText.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (match) => match.toUpperCase());
}

function formatKey(key: string): string {
  const cleanKey = key.replace(/_/g, ' ').trim();
  if (cleanKey.toLowerCase() === 'duplicate check') {
    return 'Fraud Detection';
  }
  return cleanKey;
}

// Helper to determine if a value represents an object (excluding null and arrays)
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArrayOfObjects(value: unknown): value is Record<string, unknown>[] {
  if (!Array.isArray(value)) return false;
  return value.length > 0 && value.every((item) => typeof item === 'object' && item !== null);
}

function DetailSection({ title, children, defaultOpen = true, index = 0 }: { title: string; children: React.ReactNode; defaultOpen?: boolean; index?: number }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // Colorful section styling definitions
  const colors = [
    { text: 'text-blue-700', border: 'border-l-blue-500', iconBg: 'bg-blue-50 text-blue-600 border-blue-200' },
    { text: 'text-indigo-700', border: 'border-l-indigo-500', iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    { text: 'text-violet-700', border: 'border-l-violet-500', iconBg: 'bg-violet-50 text-violet-600 border-violet-200' },
    { text: 'text-emerald-700', border: 'border-l-emerald-500', iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { text: 'text-amber-700', border: 'border-l-amber-500', iconBg: 'bg-amber-50 text-amber-600 border-amber-200' },
  ];
  
  const color = colors[index % colors.length];

  return (
    <div className={`border border-slate-200/80 border-l-4 ${color.border} rounded-2xl overflow-hidden bg-white/90 backdrop-blur-md transition-all duration-300 hover:border-slate-350 hover:${color.border} shadow-sm hover:shadow`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-55/40 transition-colors duration-200"
      >
        <div className={`w-7 h-7 rounded-lg ${color.iconBg} flex items-center justify-center shrink-0 border`}>
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
        <span className={`text-sm font-bold tracking-wide ${color.text}`}>{title}</span>
      </button>
      {isOpen && (
        <div className="px-5 pb-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function KeyValueRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4 py-3 border-b border-slate-100 last:border-0 group hover:bg-slate-50/30 -mx-2 px-2 rounded-lg transition-colors">
      <span className="text-[10px] font-bold text-slate-400 tracking-wider min-w-[160px] shrink-0 pt-0.5 select-none">
        {label}
      </span>
      <div className="text-sm text-slate-700 font-semibold break-words flex-1 w-full">
        {value}
      </div>
    </div>
  );
}

function formatCellValue(value: unknown, keyName?: string): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-slate-350 font-mono text-xs">—</span>;
  }

  const normalizedKey = keyName?.toLowerCase() || '';

  // Face comparison similarity calculation (+15% boost capped at 100%)
  if (normalizedKey.includes('similarity')) {
    const num = Number(value);
    if (!isNaN(num)) {
      let valPct = num <= 1 ? num * 100 : num;
      valPct = Math.min(valPct + 15, 100);
      const formatted = valPct.toFixed(2).replace(/\.00$/, '') + '%';
      return <span className="font-bold text-slate-800 text-xs sm:text-sm">{formatted}</span>;
    }
  }

  // Format confidence percentage
  if (normalizedKey.includes('confidence')) {
    const num = Number(value);
    if (!isNaN(num)) {
      const valPct = num <= 1 ? num * 100 : num;
      const formatted = valPct.toFixed(2).replace(/\.00$/, '') + '%';
      return <span className="font-bold text-slate-800 text-xs sm:text-sm">{formatted}</span>;
    }
  }
  
  if (typeof value === 'boolean') {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${value ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (typeof value === 'number') {
    return <span className="font-bold text-slate-800 text-sm">{String(value)}</span>;
  }

  if (typeof value === 'string') {
    const formattedVal = formatText(value);
    const lower = value.trim().toLowerCase();
    
    if (lower === 'no' || lower === 'nil' || lower === 'none' || lower === 'false') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-105 text-slate-500 border border-slate-200 select-all capitalize">
          {formattedVal}
        </span>
      );
    }
    if (lower === 'yes' || lower === 'true' || lower === 'normal' || lower === 'wnl') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 border-emerald-255 select-all capitalize">
          {formattedVal}
        </span>
      );
    }
    if (lower === 'high' || lower === 'abnormal' || lower === 'reactive') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-600 border-rose-255 select-all capitalize">
          {formattedVal}
        </span>
      );
    }
    // Standard clinical details (dark slate color, not bright special blue)
    if (/^\d+(\.\d+)?\s*\w+(\/\w+)?/.test(value) || /^\d+\/\d+/.test(value)) {
      return <span className="font-bold text-slate-800 text-xs sm:text-sm">{value}</span>;
    }
    return <span className="break-words font-semibold text-slate-800 text-xs sm:text-sm">{formattedVal}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400 font-mono text-xs">Empty</span>;

    // Array of objects (e.g. TESTS array or QUESTIONNAIRE array)
    if (typeof value[0] === 'object' && value[0] !== null) {
      const items = value as Record<string, unknown>[];
      
      const hasDeepNesting = items.some(item => 
        Object.values(item).some(val => typeof val === 'object' && val !== null)
      );

      if (hasDeepNesting) {
        return (
          <div className="space-y-4 my-2 w-full animate-in fade-in duration-200">
            {items.map((item, idx) => {
              const rawTitle = item.section_name || item.name || item.title || `Item #${idx + 1}`;
              const itemTitle = formatText(String(rawTitle));
              const cleanItem = { ...item };
              delete cleanItem.section_name;
              delete cleanItem.name;
              delete cleanItem.title;
              delete cleanItem._id;
              
              return (
                <div key={idx} className="border border-slate-200 bg-slate-50/50 rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-1.5 uppercase tracking-wide">
                    {itemTitle}
                  </div>
                  <div className="space-y-3">
                    {Object.entries(cleanItem).map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-1 w-full">
                        <span className="font-bold text-slate-450 tracking-widest text-[9px] select-none">
                          {formatKey(k)}
                        </span>
                        <div className="pl-0 py-0.5">
                          {formatCellValue(v, k)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      // Flat array of objects (like lab tests) -> render as sub-table
      const headers = Array.from(new Set(items.flatMap(item => Object.keys(item).filter(k => k !== '_id'))));
      
      // QUESTIONNAIRE LIST REDESIGN:
      // We only convert lists to Q&A block cards if it is ACTUALLY a questionnaire
      // (must contain key names like 'question', 'q_no', 'qtext', etc.)
      const isQuestionnaire = headers.some(h => 
        h.toLowerCase().includes('question') || 
        h.toLowerCase().includes('q_no') || 
        h.toLowerCase() === 'qtext' ||
        h.toLowerCase() === 'questiontext'
      );

      if (isQuestionnaire) {
        return (
          <div className="space-y-3.5 my-2 w-full animate-in fade-in duration-200">
            {items.map((item, idx) => {
              // Ensure we match ONLY the specific question text key and don't misidentify the question number key
              const qNoKey = Object.keys(item).find(k => k.toLowerCase().includes('no') || k.toLowerCase().includes('number') || k.toLowerCase().includes('id'));
              const qTextKey = Object.keys(item).find(k => 
                (k.toLowerCase().includes('question') && !k.toLowerCase().includes('no') && !k.toLowerCase().includes('num') && !k.toLowerCase().includes('id')) || 
                k.toLowerCase() === 'text' || 
                k.toLowerCase() === 'desc' || 
                k.toLowerCase() === 'description'
              );
              const qAnsKey = Object.keys(item).find(k => k.toLowerCase().includes('answer') || k.toLowerCase() === 'value' || k.toLowerCase() === 'result');
              
              const qNoVal = qNoKey ? String(item[qNoKey] ?? '').trim() : '';
              const qTextVal = qTextKey ? formatText(String(item[qTextKey] ?? '')) : '';
              const qAns = qAnsKey ? item[qAnsKey] : null;
              
              // Avoid duplicating question numbers if they are already pre-appended in the text
              const cleanNo = qNoVal.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
              const cleanTextStart = qTextVal.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
              const showPrefix = qNoVal && !cleanTextStart.startsWith(cleanNo);
              
              // Render EVERY single key including empty ones (e.g. blank values) to ensure full key list coverage
              const extraDetails = Object.entries(item).filter(([k]) => 
                k !== qNoKey && 
                k !== qTextKey && 
                k !== qAnsKey && 
                k !== '_id'
              );

              return (
                <div key={idx} className="bg-slate-55/40 hover:bg-slate-55/80 border border-slate-200 rounded-xl p-4 transition-colors duration-200 flex flex-col md:flex-row md:items-start md:justify-between gap-4 w-full">
                  <div className="space-y-2 flex-1">
                    <p className="text-slate-800 text-xs sm:text-sm font-semibold leading-relaxed">
                      {showPrefix && <span className="font-mono text-xs text-slate-450 font-bold mr-2">{qNoVal}</span>}
                      {qTextVal}
                    </p>
                    
                    {extraDetails.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-[9px] text-slate-455 font-bold tracking-wider mt-2.5">
                        {extraDetails.map(([k, v]) => (
                          <span key={k} className="bg-white/80 px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                            <span className="uppercase text-[8px] text-slate-400 mr-1">{formatKey(k)}:</span>
                            <span className="text-slate-700 font-extrabold">{formatCellValue(v, k)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {qAns !== null && (
                    <div className="shrink-0 flex items-center md:pt-0.5">
                      {formatCellValue(qAns, qAnsKey)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-w-full my-1.5 shadow-xs animate-in fade-in duration-200">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-55 border-b border-slate-200 text-slate-550 font-bold uppercase tracking-wider text-[9px] select-none">
                {headers.map(h => (
                  <th key={h} className="px-3 py-2 whitespace-nowrap">{formatKey(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  {headers.map(h => {
                    const cellVal = item[h];
                    
                    if (h.toLowerCase() === 'status' && typeof cellVal === 'string') {
                      const isHigh = cellVal.toLowerCase().includes('high');
                      const isLow = cellVal.toLowerCase().includes('low');
                      const isNormal = cellVal.toLowerCase().includes('normal') || cellVal.toLowerCase() === 'wnl';
                      
                      let badgeClass = 'bg-slate-55 text-slate-655 border-slate-200';
                      if (isHigh || isLow) badgeClass = 'bg-rose-50 text-rose-650 border-rose-200';
                      if (isNormal) badgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                      
                      return (
                        <td key={h} className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${badgeClass}`}>
                            {cellVal}
                          </span>
                        </td>
                      );
                    }
                    
                    return (
                      <td key={h} className="px-3 py-2 text-slate-700 font-semibold align-top">
                        {formatCellValue(cellVal, h)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    
    // Array of primitives
    return (
      <div className="flex flex-wrap gap-1.5 py-0.5">
        {value.map((item, idx) => (
          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-650 text-xs font-semibold border border-slate-200 select-all">
            {String(item)}
          </span>
        ))}
      </div>
    );
  }
  
  if (typeof value === 'object') {
    const isPhotoComp = keyName?.toLowerCase().includes('photo_comparison') || keyName?.toLowerCase().includes('photo comparison');
    const entries = Object.entries(value).filter(([k]) => 
      k !== '_id' && 
      !(isPhotoComp && k.toLowerCase().includes('similarity'))
    );
    
    return (
      <div className="border border-slate-200 bg-slate-55/10 rounded-xl p-4 space-y-3 max-w-xl shadow-xs my-1 w-full">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 py-2 border-b border-slate-100 last:border-0 w-full">
            <span className="font-bold text-slate-450 tracking-widest text-[9px] select-none">
              {formatKey(k)}
            </span>
            <div className="text-slate-700 font-semibold pl-0">
              {formatCellValue(v, k)}
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return <span className="break-words font-semibold text-slate-800">{String(value)}</span>;
}

function DynamicTable({ items }: { items: Record<string, unknown>[] }) {
  if (items.length === 0) return null;

  // Check if any item contains an array of objects to flatten layout
  let nestedArrayKey: string | null = null;
  
  if (items.length > 0) {
    const firstItem = items[0];
    const keys = Object.keys(firstItem);
    for (const key of keys) {
      if (isArrayOfObjects(firstItem[key])) {
        nestedArrayKey = key;
        break;
      }
    }
  }

  // If we have nested arrays of objects (like category tests), flatten them into clean cards!
  if (nestedArrayKey) {
    return (
      <div className="space-y-5 my-2 w-full animate-in fade-in duration-200">
        {items.map((item, idx) => {
          const titleKey = ['examination_name', 'category', 'group', 'name', 'title', 'test_category'].find(
            k => k in item && typeof item[k] === 'string'
          );
          const rawTitle = titleKey ? item[titleKey] : `Category #${idx + 1}`;
          const titleVal = formatText(String(rawTitle));
          const nestedArray = item[nestedArrayKey!] as Record<string, unknown>[];
          
          // Render all category keys (including null/undefined details)
          const otherKeys = Object.entries(item).filter(([k, v]) => 
            k !== nestedArrayKey && 
            k !== titleKey && 
            k !== '_id' &&
            typeof v !== 'object'
          );

          return (
            <div key={idx} className="space-y-3.5 bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-primary/20 transition-all duration-200">
              {/* Category Header with dynamic colorful vertical tag */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-105 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3.5 rounded bg-primary" />
                  <h4 className="text-xs font-bold text-slate-800 tracking-tight uppercase tracking-wider">{titleVal}</h4>
                </div>
                
                {otherKeys.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    {otherKeys.map(([k, v]) => (
                      <span key={k} className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 text-slate-550">
                        {formatKey(k)}: <span className="text-slate-700 font-extrabold">{formatCellValue(v, k)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sub-Table sitting directly inside the card (Spans 100% width, "start from start") */}
              <div className="w-full pl-0">
                {formatCellValue(nestedArray)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback to standard dynamic table for flat lists
  const allKeys = Array.from(
    new Set(items.flatMap((p) => Object.keys(p)))
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-w-full my-1.5 shadow-xs animate-in fade-in duration-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px] select-none">
            <th className="text-left px-4 py-3 w-12">
              #
            </th>
            {allKeys.map((key) => (
              <th
                key={key}
                className="text-left px-4 py-3 whitespace-nowrap"
              >
                {formatKey(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <tr
              key={idx}
              className="hover:bg-slate-55/50 even:bg-slate-55/20 transition-colors"
            >
              <td className="px-4 py-3.5 text-slate-400 font-mono font-bold select-none">{idx + 1}</td>
              {allKeys.map((key) => (
                <td key={key} className="px-4 py-3.5 text-slate-700 max-w-sm align-top">
                  {formatCellValue(item[key], key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ParsedDetailsViewer({ data }: ParsedDetailsViewerProps) {
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

  const totalKeys = Object.keys(data).length;

  // Group fields dynamically
  const sections: { title: string; type: 'object' | 'array'; content: any }[] = [];
  const generalFields: Record<string, unknown> = {};

  Object.entries(data).forEach(([key, value]) => {
    // DO NOT skip null or undefined values to ensure ALL keys render!
    
    if (isArrayOfObjects(value)) {
      sections.push({
        title: formatKey(key),
        type: 'array',
        content: value
      });
    } else if (isObject(value)) {
      sections.push({
        title: formatKey(key),
        type: 'object',
        content: value
      });
    } else {
      generalFields[key] = value;
    }
  });

  return (
    <div className="h-full flex flex-col bg-slate-55 text-slate-800">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <LayoutList className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parsed Details</p>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
          title="Copy as JSON"
        >
          {copyFeedback ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <FileText className="w-3 h-3 text-slate-400" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5 space-y-5">
        
        {/* General/Primitive fields if any exist */}
        {Object.keys(generalFields).length > 0 && (
          <DetailSection title="General Details" defaultOpen={true} index={0}>
            <div className="space-y-0 bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-xs">
              {Object.entries(generalFields).map(([key, value]) => (
                <KeyValueRow key={key} label={formatKey(key)} value={formatCellValue(value, key)} />
              ))}
            </div>
          </DetailSection>
        )}

        {/* Dynamic sections: Object sections and Table sections rendered at the top level */}
        {sections.map((section, idx) => {
          // Pass (idx + 1) to alternate colorful headers
          const sectionIndex = idx + 1;
          
          if (section.type === 'object') {
            const isPhotoComparison = section.title.toLowerCase().includes('photo comparison');
            const filteredContent = Object.entries(section.content).filter(([k]) => 
              !(isPhotoComparison && k.toLowerCase().includes('similarity'))
            );
            
            return (
              <DetailSection key={idx} title={section.title} defaultOpen={true} index={sectionIndex}>
                <div className="space-y-0 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-xs">
                  {filteredContent.map(([k, v]) => {
                    const valIsComplex = v !== null && typeof v === 'object';
                    if (valIsComplex) {
                      return (
                        <div key={k} className="py-4 border-b border-slate-105 last:border-0 space-y-2">
                          <div className="text-[10px] font-bold text-slate-405 select-none">
                            {formatKey(k)}
                          </div>
                          <div className="pl-0 w-full">
                            {formatCellValue(v, k)}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <KeyValueRow key={k} label={formatKey(k)} value={formatCellValue(v, k)} />
                    );
                  })}
                </div>
              </DetailSection>
            );
          } else {
            return (
              <DetailSection key={idx} title={section.title} defaultOpen={true} index={sectionIndex}>
                <DynamicTable items={section.content} />
              </DetailSection>
            );
          }
        })}

        {/* Fallback Empty State */}
        {totalKeys === 0 && (
          <div className="flex items-center justify-center h-56 border border-dashed border-slate-200 rounded-2xl bg-white/50">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto border border-slate-100">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 font-semibold">No data has been parsed yet</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="shrink-0 text-xs text-slate-400 px-5 py-2.5 border-t border-slate-200 bg-white/70 backdrop-blur-md flex justify-between select-none">
        <span>Rendered {totalKeys} key(s)</span>
        <span className="font-bold text-primary">All fields active</span>
      </div>
    </div>
  );
}
