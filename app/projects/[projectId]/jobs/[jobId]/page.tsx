'use client';

import { useEffect, useState, startTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PdfViewer } from '@/components/dashboard/pdf-viewer';
import { DocumentValidationChecklist } from '@/components/dashboard/document-validation-checklist';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Save,
  RotateCcw,
  Pencil,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Eye,
  X,
  AlertCircle,
  CreditCard,
  User,
  Activity,
  FileText,
  ClipboardCheck,
  Receipt,
  Coins,
  Landmark,
  Stethoscope,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface File {
  filename: string;
  blob_url: string;
}

interface Job {
  _id: string;
  project_id: string;
  status: string;
  files?: File[];
  parsed_data?: Record<string, any>;
  created_at?: string;
}

// Normalizes parsed data by converting objects with numeric keys to standard arrays.
const normalizeParsedData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => normalizeParsedData(item));
  }
  
  const keys = Object.keys(data);
  const isNumericKeys = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
  
  if (isNumericKeys) {
    const arr: any[] = [];
    const sortedKeys = keys.map(Number).sort((a, b) => a - b);
    sortedKeys.forEach(k => {
      arr.push(normalizeParsedData(data[String(k)]));
    });
    return arr;
  }
  
  const result: any = {};
  for (const [key, val] of Object.entries(data)) {
    result[key] = normalizeParsedData(val);
  }
  return result;
};

export default function JobComparisonPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const jobId = params.jobId as string;

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullViewPdf, setFullViewPdf] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; userId: string; role: string } | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Editing & Tab State
  const [editableData, setEditableData] = useState<Record<string, any>>({});
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Section Collapse/Toggle State
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const isCollapsibleSection = (key: string) => {
    const nonCollapsible = [
      'overview',
      'document_validation_checklist',
      'details_of_bills_enclosed',
      'queries_to_be_raised',
      'repudiation_remarks'
    ];
    return !nonCollapsible.includes(key);
  };

  const isSectionCollapsed = (key: string) => {
    if (!isCollapsibleSection(key)) return false;
    return collapsedSections[key] !== false;
  };

  const toggleSection = (key: string) => {
    if (!isCollapsibleSection(key)) return;
    setCollapsedSections((prev) => {
      const isCurrentlyCollapsed = prev[key] !== false;
      return {
        ...prev,
        [key]: !isCurrentlyCollapsed,
      };
    });
  };

  // Fetch current user details
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    };
    fetchUser();
  }, []);

  const handleReviewStatusChange = async (action: 'complete' | 'reopen') => {
    if (!job || !job.assignedUserId) return;
    try {
      setReviewLoading(true);
      const res = await fetch(`/api/claims/${job.assignedUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          claimId: jobId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action} review`);
      }

      await fetchData();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : `Failed to ${action} review`);
    } finally {
      setReviewLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const jobRes = await fetch(`/api/jobs/${jobId}`);
      if (!jobRes.ok) throw new Error('Failed to fetch job');

      const jobData = await jobRes.json();
      setJob(jobData);
      if (jobData.parsed_data) {
        const normalized = normalizeParsedData(jobData.parsed_data);
        setEditableData(normalized);
        setJsonText(JSON.stringify(normalized, null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const handleFormChange = (path: string, value: any) => {
    setEditableData((prev) => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const nextKey = keys[i + 1];
        const isNextKeyIndex = !isNaN(Number(nextKey));

        if (!current[key]) {
          current[key] = isNextKeyIndex ? [] : {};
        } else if (Array.isArray(current[key])) {
          current[key] = [ ...current[key] ];
        } else {
          current[key] = { ...current[key] };
        }
        current = current[key];
      }
      current[keys[keys.length - 1]] = value;

      // Update jsonText in sync
      setJsonText(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    try {
      if (!val.trim()) {
        setJsonError('JSON cannot be empty');
        return;
      }
      const parsed = JSON.parse(val);
      setEditableData(parsed);
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON syntax');
    }
  };

  const handleReset = () => {
    if (job?.parsed_data) {
      if (confirm('Are you sure you want to discard all changes?')) {
        setEditableData(job.parsed_data);
        setJsonText(JSON.stringify(job.parsed_data, null, 2));
        setJsonError(null);
        setSaveStatus('idle');
        setIsEditing(false);
      }
    }
  };

  const handleSave = async () => {
    if (jsonError) {
      alert('Please fix JSON syntax errors before saving.');
      return;
    }

    try {
      setSaveStatus('saving');
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed_data: editableData }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save changes');
      }

      const updatedJob = await res.json();
      setJob(updatedJob);
      setSaveStatus('success');
      setIsEditing(false);

      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (err) {
      setSaveStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred while saving');
    }
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'secondary',
      pending: 'outline',
      failed: 'destructive',
      processing: 'default',
    };
    return statusMap[status.toLowerCase()] || 'outline';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format snake_case and CamelCase keys nicely for dynamic labels
  const formatLabel = (str: string) => {
    return str
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Premium design styling tokens
  const cardClass = "bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 relative w-full";
  const sectionHeaderClass = "pb-2 border-b border-slate-100 select-none flex items-center justify-between";
  const sectionTitleClass = "text-xs font-bold text-slate-800 tracking-wider uppercase";
  const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none block leading-tight break-words";
  const inputClass = "w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-250/20 transition-all shadow-3xs hover:border-slate-300";
  const selectClass = "w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-250/20 transition-all shadow-3xs hover:border-slate-350 font-semibold cursor-pointer";
  const textareaClass = "w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-250/20 transition-all shadow-3xs hover:border-slate-350 min-h-[65px] leading-relaxed";

  const getDecisionBadge = (decision: string | undefined) => {
    if (!decision) return <span className="text-slate-300 italic">—</span>;
    const d = decision.toUpperCase();
    if (d === 'PAY' || d === 'APPROVE' || d === 'APPROVED') {
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-50 font-bold whitespace-nowrap">PAY</Badge>;
    }
    if (d === 'REJECT' || d === 'REJECTED') {
      return <Badge className="bg-rose-50 text-rose-700 border-rose-250 hover:bg-rose-50 font-bold whitespace-nowrap">REJECT</Badge>;
    }
    if (d === 'REPUDIATE') {
      return <Badge className="bg-rose-50 text-rose-700 border-rose-250 hover:bg-rose-50 font-bold whitespace-nowrap">REPUDIATE</Badge>;
    }
    return <Badge className="bg-amber-50 text-amber-700 border-amber-250 hover:bg-amber-50 font-bold whitespace-nowrap">{decision}</Badge>;
  };

  const getCardThemeClasses = (keyName: string, isCollapsed = false) => {
    const base = cn(
      "border border-slate-200 rounded-2xl shadow-xs relative w-full border-l-4 transition-all duration-300",
      isCollapsed ? "p-4 space-y-0" : "p-6 space-y-4"
    );
    
    if (keyName === 'overview') {
      const decision = String(editableData.final_decision || '').toUpperCase();
      if (decision.includes('PAY') || decision.includes('APPROVE')) {
        return `${base} border-l-emerald-500 bg-emerald-50/10`;
      }
      if (decision.includes('REPUDIATE') || decision.includes('REJECT')) {
        return `${base} border-l-rose-500 bg-rose-50/10`;
      }
      if (decision.includes('QUERY')) {
        return `${base} border-l-amber-500 bg-amber-50/10`;
      }
      return `${base} border-l-purple-500 bg-purple-50/10`;
    }
    
    switch (keyName) {
      case 'claim_details':
        return `${base} border-l-indigo-500 bg-indigo-50/10`;
      case 'insured_person_details':
        return `${base} border-l-sky-500 bg-sky-50/10`;
      case 'chronic_disease_assessment':
        return `${base} border-l-teal-500 bg-teal-50/10`;
      case 'repudiation_remarks':
        return `${base} border-l-rose-450 bg-rose-50/10`;
      case 'document_validation_checklist':
        return `${base} border-l-fuchsia-500 bg-fuchsia-50/10`;
      case 'details_of_bills_enclosed':
        return `${base} border-l-blue-500 bg-blue-50/10`;
      case 'claimed_expenses':
        return `${base} border-l-violet-500 bg-violet-50/10`;
      case 'diagnosis_from_documents':
        return `${base} border-l-cyan-500 bg-cyan-50/10`;
      case 'queries_to_be_raised':
        return `${base} border-l-orange-500 bg-orange-50/10`;
      case 'details_of_primary_insured_bank_account':
        return `${base} border-l-emerald-500 bg-emerald-50/10`;
      default:
        return `${base} border-l-slate-400 bg-slate-50/10`;
    }
  };

  const getCardIcon = (keyName: string) => {
    switch (keyName) {
      case 'claim_details':
        return <CreditCard className="w-4 h-4 text-indigo-500 shrink-0" />;
      case 'insured_person_details':
        return <User className="w-4 h-4 text-sky-500 shrink-0" />;
      case 'chronic_disease_assessment':
        return <Activity className="w-4 h-4 text-teal-500 shrink-0" />;
      case 'repudiation_remarks':
        return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'document_validation_checklist':
        return <ClipboardCheck className="w-4 h-4 text-fuchsia-500 shrink-0" />;
      case 'details_of_bills_enclosed':
        return <Receipt className="w-4 h-4 text-blue-500 shrink-0" />;
      case 'claimed_expenses':
        return <Coins className="w-4 h-4 text-violet-500 shrink-0" />;
      case 'diagnosis_from_documents':
        return <Stethoscope className="w-4 h-4 text-cyan-500 shrink-0" />;
      case 'queries_to_be_raised':
        return <HelpCircle className="w-4 h-4 text-orange-500 shrink-0" />;
      case 'details_of_primary_insured_bank_account':
        return <Landmark className="w-4 h-4 text-emerald-500 shrink-0" />;
      default:
        return <Shield className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };  // Helper to flat-render key-value primitive pairs
  const renderField = (key: string, value: any, path: string) => {
    const label = formatLabel(key);
    
    if (isEditing) {
      // --- EDIT MODE ---
      if (typeof value === 'boolean') {
        return (
          <div key={path} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50/50 select-none col-span-1">
            <span className="text-xs font-semibold text-slate-700 leading-tight mr-2 break-words">{label}</span>
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer shrink-0"
              checked={value}
              onChange={(e) => handleFormChange(path, e.target.checked)}
            />
          </div>
        );
      }

      if (typeof value === 'number') {
        return (
          <div key={path} className="space-y-1 col-span-1">
            <label className={labelClass}>{label}</label>
            <input
              type="number"
              className={inputClass}
              value={value}
              onChange={(e) => handleFormChange(path, Number(e.target.value))}
            />
          </div>
        );
      }

      if (key === 'final_decision') {
        return (
          <div key={path} className="space-y-1 col-span-1">
            <label className={labelClass}>{label}</label>
            <select
              className={selectClass}
              value={value}
              onChange={(e) => handleFormChange(path, e.target.value)}
            >
              <option value="PAY">PAY</option>
              <option value="QUERY">QUERY</option>
              <option value="REPUDIATE">REPUDIATE</option>
            </select>
          </div>
        );
      }

      if (key === 'gender') {
        return (
          <div key={path} className="space-y-1 col-span-1">
            <label className={labelClass}>{label}</label>
            <select
              className={selectClass}
              value={value}
              onChange={(e) => handleFormChange(path, e.target.value)}
            >
              <option value="">— Select —</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        );
      }

      const valStr = String(value);
      const isLongText = valStr.length > 60 || key.includes('remarks') || key.includes('notes') || key.includes('description') || key.includes('evidence');
      const isMediumText = !isLongText && (valStr.length > 25 || key.includes('name') || key.includes('number') || key.includes('policy') || key.includes('condition') || key.includes('disease') || key.includes('by') || key.includes('towards'));

      const colSpanClass = isLongText 
        ? "col-span-1 sm:col-span-2 md:col-span-3" 
        : isMediumText 
          ? "col-span-1 sm:col-span-2" 
          : "col-span-1";

      if (isLongText) {
        return (
          <div key={path} className={`space-y-1 ${colSpanClass}`}>
            <label className={labelClass}>{label}</label>
            <textarea
              className={textareaClass}
              value={value}
              onChange={(e) => handleFormChange(path, e.target.value)}
            />
          </div>
        );
      }

      return (
        <div key={path} className={`space-y-1 ${colSpanClass}`}>
          <label className={labelClass}>{label}</label>
          <input
            type="text"
            className={inputClass}
            value={value}
            onChange={(e) => handleFormChange(path, e.target.value)}
          />
        </div>
      );
    } else {
      // --- VIEW MODE ---
      if (key === 'final_decision') {
        return (
          <div key={path} className="space-y-1 py-0.5 col-span-1">
            <span className={labelClass}>{label}</span>
            <div className="pt-0.5">{getDecisionBadge(value)}</div>
          </div>
        );
      }

      if (typeof value === 'boolean') {
        return (
          <div key={path} className="space-y-1 py-0.5 col-span-1">
            <span className={labelClass}>{label}</span>
            <div className="flex items-center gap-1.5 pt-0.5 text-sm font-semibold text-slate-800 select-none">
              <span>{value ? 'Yes' : 'No'}</span>
              <span className={`w-2 h-2 rounded-full ${value ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            </div>
          </div>
        );
      }

      const valString = value !== undefined && value !== null ? String(value) : '';
      const isAmount = key.includes('amount') || key.includes('claimed') || key.includes('payable');
      const formattedValue =
        isAmount && typeof value === 'number'
          ? `₹${Number(value).toLocaleString('en-IN')}`
          : valString;

      const isLongText =
        formattedValue.length > 60 ||
        key.includes('remarks') ||
        key.includes('notes') ||
        key.includes('description') ||
        key.includes('evidence');

      const isMediumText = !isLongText && (formattedValue.length > 25 || key.includes('name') || key.includes('number') || key.includes('policy') || key.includes('condition') || key.includes('disease') || key.includes('by') || key.includes('towards'));

      const colSpanClass = isLongText 
        ? "col-span-1 sm:col-span-2 md:col-span-3" 
        : isMediumText 
          ? "col-span-1 sm:col-span-2" 
          : "col-span-1";

      if (isLongText) {
        return (
          <div key={path} className={`space-y-1 py-0.5 ${colSpanClass}`}>
            <span className={labelClass}>{label}</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 leading-relaxed break-words font-mono whitespace-pre-wrap select-all shadow-3xs">
              {formattedValue || <span className="text-slate-350 italic">None</span>}
            </div>
          </div>
        );
      }

      return (
        <div key={path} className={`space-y-1 py-0.5 ${colSpanClass}`}>
          <span className={labelClass}>{label}</span>
          <p className="text-sm font-semibold text-slate-800 break-words leading-tight truncate" title={formattedValue}>
            {formattedValue.trim() !== '' ? formattedValue : <span className="text-slate-300 italic font-medium">None</span>}
          </p>
        </div>
      );
    }
  };

  // Flatten nested objects into flat key-value pairs (skips arrays by default, optionally includes them)
  const flattenObject = (obj: any, parentKey = '', parentPath = '', skipArrays = true): Array<{ key: string; value: any; path: string }> => {
    if (!obj || typeof obj !== 'object') return [];
    let results: Array<{ key: string; value: any; path: string }> = [];
    for (const k of Object.keys(obj)) {
      const val = obj[k];
      const currentPath = parentPath ? `${parentPath}.${k}` : k;
      const currentKey = parentKey ? `${parentKey}_${k}` : k;
      
      if (Array.isArray(val)) {
        if (!skipArrays) {
          results.push({ key: currentKey, value: val, path: currentPath });
        }
      } else if (val !== null && val !== undefined && typeof val === 'object') {
        results = [...results, ...flattenObject(val, currentKey, currentPath, skipArrays)];
      } else if (val !== null && val !== undefined) {
        results.push({ key: currentKey, value: val, path: currentPath });
      }
    }
    return results;
  };

  // Flattened Structured Report layout builder
  const renderStructuredReport = () => {
    const keys = Object.keys(editableData).filter(
      (k) => !['_id', 'project_id', 'status', 'files', 'created_at', 'updated_at', 'final_decision', 'requires_manual_review'].includes(k)
    );

    // Explicit order for structured report elements (important ones at the top)
    const keysOrder = [
      'document_validation_checklist',
      'details_of_bills_enclosed',
      'queries_to_be_raised',
      'repudiation_remarks',
      'claim_details',
      'insured_person_details',
      'details_of_primary_insured_bank_account',
      'chronic_disease_assessment',
      'diagnosis_from_documents',
      'claimed_expenses',
    ];

    const orderedKeys = [
      ...keysOrder.filter(k => keys.includes(k)),
      ...keys.filter(k => !keysOrder.includes(k))
    ];

    const nonCollapsibleKeys = orderedKeys.filter(k => !isCollapsibleSection(k));
    const collapsibleKeys = orderedKeys.filter(k => isCollapsibleSection(k));

    // Group the main overview details (decision & review status) in one prominent card at the top
    const showOverviewCard = editableData.final_decision !== undefined || editableData.requires_manual_review !== undefined;

    const renderCard = (key: string, isCollapsible: boolean) => {
      const value = editableData[key];
      const currentPath = key;
      const isCollapsed = isCollapsible && isSectionCollapsed(key);
      const cardThemeClass = getCardThemeClasses(key, isCollapsed);

      const currentHeaderClass = cn(
        "select-none flex items-center justify-between w-full",
        isCollapsible ? "cursor-pointer hover:opacity-85 transition-all" : "",
        isCollapsed ? "pb-0 border-b-0" : "pb-2 border-b border-slate-100"
      );

      const handleHeaderClick = () => {
        if (isCollapsible) {
          toggleSection(key);
        }
      };

      // ── Special handling for claimed_expenses (mixed object with sub-objects and arrays) ──
      if (key === 'claimed_expenses' && value && typeof value === 'object' && !Array.isArray(value)) {
        return (
          <div key={key} className={cardThemeClass}>
            <div className={currentHeaderClass} onClick={handleHeaderClick}>
              <div className="flex items-center gap-2">
                {getCardIcon(key)}
                <h3 className={sectionTitleClass}>{formatLabel(key)}</h3>
              </div>
              {isCollapsible && (isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
            </div>

            {!isCollapsed && (
              <>
                {/* Consultation sub-section */}
                {value.consultation && typeof value.consultation === 'object' && (
                  <div className="space-y-3 pb-4">
                    <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest block">Consultation</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 w-full">
                      {flattenObject(value.consultation, '', `${currentPath}.consultation`).map((f) => renderField(f.key, f.value, f.path))}
                    </div>
                  </div>
                )}

                {/* Diagnostic Tests sub-section */}
                {value.diagnostic_tests && typeof value.diagnostic_tests === 'object' && (
                  <div className="space-y-3 pb-4 border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest block">Diagnostic Tests</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 w-full">
                      {flattenObject(value.diagnostic_tests, '', `${currentPath}.diagnostic_tests`).map((f) => renderField(f.key, f.value, f.path))}
                    </div>
                  </div>
                )}

                {/* Medicines sub-section (array of invoice objects, each with nested items) */}
                {(Array.isArray(value.medicines) || isEditing) && (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest block">
                      Medicines ({value.medicines?.length || 0} invoice{value.medicines?.length !== 1 ? 's' : ''})
                    </span>
                    <div className="space-y-6 divide-y divide-slate-100">
                      {(Array.isArray(value.medicines) ? value.medicines : []).map((invoice: any, invIdx: number) => {
                        const invPath = `${currentPath}.medicines.${invIdx}`;
                        // Get top-level invoice fields (skip the nested items array)
                        const invoiceFields = flattenObject(
                          Object.fromEntries(Object.entries(invoice).filter(([k]) => k !== 'items')),
                          '', invPath
                        );

                        return (
                          <div key={invPath} className="pt-6 first:pt-0 space-y-4 w-full">
                            <div className="select-none flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/20 px-4 py-2 rounded-xl border border-blue-100/80 shadow-3xs">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md shadow-blue-500/20">
                                  {invIdx + 1}
                                </div>
                                <span className="text-xs font-bold text-blue-900 tracking-wide flex items-center gap-1.5">
                                  <Receipt className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  Medicine Invoice #{invIdx + 1}
                                </span>
                              </div>
                              {isEditing && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 text-xs gap-1.5 bg-rose-50 text-rose-650 hover:bg-rose-100 border border-rose-200"
                                  onClick={() => {
                                    const updatedArr = value.medicines.filter((_: any, i: number) => i !== invIdx);
                                    handleFormChange(`${currentPath}.medicines`, updatedArr);
                                  }}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Remove Invoice
                                </Button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 w-full px-1">
                              {invoiceFields.map((f) => renderField(f.key, f.value, f.path))}
                            </div>

                            {/* Nested medicine items */}
                            {(Array.isArray(invoice.items) || isEditing) && (
                              <div className="space-y-4 pt-2.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Billed Medicines Items ({invoice.items?.length || 0})</span>
                                <div className="space-y-4 divide-y divide-slate-100/70 pl-4 border-l border-slate-200">
                                  {(Array.isArray(invoice.items) ? invoice.items : []).map((subItem: any, subIdx: number) => {
                                    const subItemPath = `${invPath}.items.${subIdx}`;
                                    const subFlat = flattenObject(subItem, '', subItemPath);
                                    
                                    return (
                                      <div key={subItemPath} className="pt-4 first:pt-0 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase select-none">
                                            Item #{subIdx + 1}
                                          </span>
                                          {isEditing && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 h-6 w-16 text-[10px]"
                                              onClick={() => {
                                                const updatedItems = invoice.items.filter((_: any, i: number) => i !== subIdx);
                                                handleFormChange(`${invPath}.items`, updatedItems);
                                              }}
                                            >
                                              Remove Item
                                            </Button>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 w-full">
                                          {subFlat.map((sf) => renderField(sf.key, sf.value, sf.path))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {isEditing && (
                                    <div className="pt-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] gap-1 text-slate-500 border-slate-250 hover:bg-slate-50"
                                        onClick={() => {
                                          const currentItems = Array.isArray(invoice.items) ? invoice.items : [];
                                          const newItem = currentItems.length > 0 ? Object.fromEntries(Object.keys(currentItems[0]).map(k => [k, ''])) : { name: '', quantity: 1, amount: 0 };
                                          handleFormChange(`${invPath}.items`, [...currentItems, newItem]);
                                        }}
                                      >
                                        + Add Item
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {isEditing && (
                        <div className="pt-4 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 text-xs gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50"
                            onClick={() => {
                              const currentMedicines = Array.isArray(value.medicines) ? value.medicines : [];
                              const newInvoice = {
                                invoice_number: '',
                                date: '',
                                pharmacy_name: '',
                                total_amount: 0,
                                items: []
                              };
                              handleFormChange(`${currentPath}.medicines`, [...currentMedicines, newInvoice]);
                            }}
                          >
                            + Add Medicine Invoice
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      // ── Special handling for document_validation_checklist (rich visual checklist component) ──
      if (key === 'document_validation_checklist' && value && typeof value === 'object' && !Array.isArray(value)) {
        return (
          <div key={key} className={cardThemeClass}>
            <div className={currentHeaderClass} onClick={handleHeaderClick}>
              <div className="flex items-center gap-2">
                {getCardIcon(key)}
                <h3 className={sectionTitleClass}>{formatLabel(key)}</h3>
              </div>
              {isCollapsible && (isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
            </div>
            {!isCollapsed && (
              <DocumentValidationChecklist
                data={value}
                isEditing={isEditing}
                onFormChange={handleFormChange}
                basePath={currentPath}
              />
            )}
          </div>
        );
      }

      // ── Special handling for chronic_disease_assessment (object with an evidence array) ──
      if (key === 'chronic_disease_assessment' && value && typeof value === 'object' && !Array.isArray(value)) {
        const scalarFields = flattenObject(value, '', currentPath);
        const evidenceArr = Array.isArray(value.evidence) ? value.evidence : [];

        return (
          <div key={key} className={cardThemeClass}>
            <div className={currentHeaderClass} onClick={handleHeaderClick}>
              <div className="flex items-center gap-2">
                {getCardIcon(key)}
                <h3 className={sectionTitleClass}>{formatLabel(key)}</h3>
              </div>
              {isCollapsible && (isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
            </div>
            {!isCollapsed && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 w-full">
                  {scalarFields.map((f) => renderField(f.key, f.value, f.path))}
                </div>
                {(evidenceArr.length > 0 || isEditing) && (
                  <div className="space-y-2 pt-3 border-t border-slate-100 mt-3">
                    <span className="text-[10px] font-bold text-teal-500 uppercase tracking-widest block">Evidence ({evidenceArr.length})</span>
                    <div className="space-y-1.5">
                      {evidenceArr.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2.5 text-slate-700 text-sm font-medium leading-relaxed">
                          <span className="text-teal-400 font-sans select-none font-bold">•</span>
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-250/20 transition-all bg-white shadow-3xs"
                                value={item}
                                onChange={(e) => {
                                  const updatedArr = [...evidenceArr];
                                  updatedArr[idx] = e.target.value;
                                  handleFormChange(`${currentPath}.evidence`, updatedArr);
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-500 hover:text-rose-750 hover:bg-rose-50 p-1.5 h-8 w-8 shrink-0"
                                onClick={() => {
                                  const updatedArr = evidenceArr.filter((_: any, i: number) => i !== idx);
                                  handleFormChange(`${currentPath}.evidence`, updatedArr);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="break-words select-all">{String(item)}</span>
                          )}
                        </div>
                      ))}
                      {isEditing && (
                        <div className="pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1 text-teal-650 border-teal-200 hover:bg-teal-50"
                            onClick={() => {
                              const updatedArr = [...evidenceArr, ''];
                              handleFormChange(`${currentPath}.evidence`, updatedArr);
                            }}
                          >
                            + Add Evidence
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      // A. Object Rendering (Flattens all nested items, rendering in a beautifully aligned grid)
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const flatFields = flattenObject(value, '', currentPath);
        if (flatFields.length === 0) return null;

        return (
          <div key={key} className={cardThemeClass}>
            <div className={currentHeaderClass} onClick={handleHeaderClick}>
              <div className="flex items-center gap-2">
                {getCardIcon(key)}
                <h3 className={sectionTitleClass}>{formatLabel(key)}</h3>
              </div>
              {isCollapsible && (isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
            </div>
            {!isCollapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 w-full">
                {flatFields.map((f) => renderField(f.key, f.value, f.path))}
              </div>
            )}
          </div>
        );
      }

      // B. Array of Objects Rendering (Renders clean list rows divided by lines, aligned perfectly in grids)
      if (Array.isArray(value)) {
        const isBillsEnclosed = key === 'details_of_bills_enclosed';
        const totalBillAmount = isBillsEnclosed
          ? value.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0)
          : 0;

        return (
          <div key={key} className={cardThemeClass}>
            <div className={currentHeaderClass} onClick={handleHeaderClick}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {getCardIcon(key)}
                  <h3 className={sectionTitleClass}>
                    {formatLabel(key)} ({value.length} item{value.length !== 1 ? 's' : ''})
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {isBillsEnclosed && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 shadow-3xs">
                      <span>Total Bill Amount:</span>
                      <span>₹{Number(totalBillAmount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {isCollapsible && (isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
                </div>
              </div>
            </div>

            {!isCollapsed && (
              <>
                {value.length === 0 ? (
                  <div className="space-y-4 p-4 bg-slate-50/20 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 italic">No entries available.</p>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs gap-1.5 text-blue-605 border-blue-200 hover:bg-blue-50"
                        onClick={() => {
                          let newItem: Record<string, any> = {};
                          if (isBillsEnclosed) {
                            newItem = {
                              bill_number: '',
                              date: '',
                              issued_by: '',
                              towards: '',
                              amount: 0,
                              items: []
                            };
                          }
                          handleFormChange(currentPath, [newItem]);
                        }}
                      >
                        + Add New Entry
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 divide-y divide-slate-100">
                    {value.map((item, idx) => {
                      const itemPath = `${currentPath}.${idx}`;

                      if (typeof item === 'object' && item !== null) {
                        // Extract flat fields of array item
                        const flatFields = flattenObject(item, '', itemPath);

                        return (
                          <div key={itemPath} className="pt-6 first:pt-0 space-y-4 w-full">
                            <div className="select-none flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/20 px-4 py-2 rounded-xl border border-blue-100/80 shadow-3xs">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md shadow-blue-500/20">
                                  {idx + 1}
                                </div>
                                <span className="text-xs font-bold text-blue-900 tracking-wide flex items-center gap-1.5">
                                  <Receipt className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  {isBillsEnclosed ? `Bill #${idx + 1} Details` : `${formatLabel(key).replace(/s$/i, '')} #${idx + 1}`}
                                </span>
                              </div>
                              {isEditing && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 text-xs gap-1.5 bg-rose-50 text-rose-650 hover:bg-rose-100 border border-rose-200"
                                  onClick={() => {
                                    const updatedArr = value.filter((_: any, i: number) => i !== idx);
                                    handleFormChange(currentPath, updatedArr);
                                  }}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Remove
                                </Button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 w-full px-1">
                              {flatFields.map((f) => renderField(f.key, f.value, f.path))}
                            </div>

                            {/* Deep Nested Items List Flat Rendering */}
                            {(Array.isArray(item.items) || isEditing) && (
                              <div className="space-y-4 pt-2.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Nested Items ({item.items?.length || 0})</span>
                                <div className="space-y-4 divide-y divide-slate-100/70 pl-4 border-l border-slate-200">
                                  {(Array.isArray(item.items) ? item.items : []).map((subItem: any, subIdx: number) => {
                                    const subItemPath = `${itemPath}.items.${subIdx}`;
                                    const subFlat = flattenObject(subItem, '', subItemPath);
                                    
                                    return (
                                      <div key={subItemPath} className="pt-4 first:pt-0 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase select-none">
                                            Item #{subIdx + 1}
                                          </span>
                                          {isEditing && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 h-6 w-16 text-[10px]"
                                              onClick={() => {
                                                const updatedItems = item.items.filter((_: any, i: number) => i !== subIdx);
                                                handleFormChange(`${itemPath}.items`, updatedItems);
                                              }}
                                            >
                                              Remove Item
                                            </Button>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 w-full">
                                          {subFlat.map((sf) => renderField(sf.key, sf.value, sf.path))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {isEditing && (
                                    <div className="pt-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] gap-1 text-slate-500 border-slate-250 hover:bg-slate-50"
                                        onClick={() => {
                                          const currentItems = Array.isArray(item.items) ? item.items : [];
                                          const newItem = currentItems.length > 0 ? Object.fromEntries(Object.keys(currentItems[0]).map(k => [k, ''])) : { name: '', amount: 0 };
                                          handleFormChange(`${itemPath}.items`, [...currentItems, newItem]);
                                        }}
                                      >
                                        + Add Item
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        // Array of primitives (e.g. repudiation remarks, queries, chronic disease evidence list)
                        return (
                          <div key={itemPath} className="pt-2.5 first:pt-0">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-250/20 transition-all bg-white shadow-3xs"
                                  value={item}
                                  onChange={(e) => {
                                    const updatedArr = [...value];
                                    updatedArr[idx] = e.target.value;
                                    handleFormChange(currentPath, updatedArr);
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 h-8 w-8 shrink-0"
                                  onClick={() => {
                                    const updatedArr = value.filter((_: any, i: number) => i !== idx);
                                    handleFormChange(currentPath, updatedArr);
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2.5 text-slate-700 text-sm font-medium leading-relaxed">
                                <span className="text-slate-350 font-sans select-none font-bold">•</span>
                                <span className="break-words select-all">{String(item)}</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                    })}
                    {isEditing && (
                      <div className="pt-4 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => {
                            let newItem: Record<string, any> = {};
                            const currentVal = Array.isArray(value) ? value : [];
                            if (currentVal.length > 0) {
                              Object.keys(currentVal[0]).forEach(k => {
                                if (Array.isArray(currentVal[0][k])) {
                                  newItem[k] = [];
                                } else if (typeof currentVal[0][k] === 'object' && currentVal[0][k] !== null) {
                                  newItem[k] = {};
                                } else if (typeof currentVal[0][k] === 'boolean') {
                                  newItem[k] = false;
                                } else if (typeof currentVal[0][k] === 'number') {
                                  newItem[k] = 0;
                                } else {
                                  newItem[k] = '';
                                }
                              });
                            } else {
                              if (isBillsEnclosed) {
                                newItem = {
                                  bill_number: '',
                                  date: '',
                                  issued_by: '',
                                  towards: '',
                                  amount: 0,
                                  items: []
                                };
                              } else {
                                newItem = {};
                              }
                            }
                            const updatedArr = [...currentVal, newItem];
                            handleFormChange(currentPath, updatedArr);
                          }}
                        >
                          + Add New Entry
                        </Button>
                      </div>
                    )}
                    {isBillsEnclosed && (
                      <div className="pt-4 mt-4 flex items-center justify-between border-t border-slate-200 bg-slate-50/50 p-3 rounded-xl">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Final Billing Amount (Sum of Bills)</span>
                        <span className="text-sm font-black text-slate-800">
                          ₹{Number(totalBillAmount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      // C. Flat Primitives Render
      return (
        <div key={key} className={cardThemeClass}>
          <div className={currentHeaderClass} onClick={handleHeaderClick}>
            <div className="flex items-center gap-2">
              {getCardIcon(key)}
              <h3 className={sectionTitleClass}>{formatLabel(key)}</h3>
            </div>
            {isCollapsible && (isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
          </div>
          {!isCollapsed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {renderField(key, value, currentPath)}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-6 w-full pb-16">
        {/* Prominent Section 1: Overview & Rules Summary */}
        {showOverviewCard && (
          <div className={getCardThemeClasses('overview')}>
            <div className={sectionHeaderClass}>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-500 shrink-0" />
                <h3 className={sectionTitleClass}>Analysis Overview & Verification</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              {editableData.final_decision !== undefined && renderField('final_decision', editableData.final_decision, 'final_decision')}
              {editableData.requires_manual_review !== undefined && renderField('requires_manual_review', editableData.requires_manual_review, 'requires_manual_review')}
            </div>
          </div>
        )}

        {/* Non-collapsible cards (Audit, validation, checklist, bills, etc.) */}
        {nonCollapsibleKeys.map((key) => renderCard(key, false))}

        {/* Heading: Parsed Information with Expand/Collapse All Button */}
        {collapsibleKeys.length > 0 && (
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-purple-600 rounded-full" />
              <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase">Parsed Information</h2>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const allCollapsed = collapsibleKeys.every(k => isSectionCollapsed(k));
                const newState: Record<string, boolean> = {};
                collapsibleKeys.forEach(k => {
                  newState[k] = !allCollapsed;
                });
                setCollapsedSections(newState);
              }}
              className="h-7 text-xs font-semibold text-purple-650 hover:text-purple-800 hover:bg-purple-50 transition-all rounded-lg cursor-pointer"
            >
              {collapsibleKeys.every(k => isSectionCollapsed(k)) ? 'Expand All' : 'Collapse All'}
            </Button>
          </div>
        )}

        {/* Collapsible parsed details cards */}
        {collapsibleKeys.map((key) => renderCard(key, true))}
      </div>
    );
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Top Navbar */}
      <header className="shrink-0 border-b border-slate-200 bg-white shadow-xs px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Breadcrumbs & Navigation */}
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium select-none">
              <span className="hover:text-slate-700 cursor-pointer" onClick={() => startTransition(() => router.push(`/projects/${projectId}`))}>Dashboard</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-800 font-semibold truncate max-w-[120px]">
                Claim {jobId.slice(-8).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Title & Branding + View Toggle */}
          <div className="flex items-center gap-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFullViewPdf(!fullViewPdf)}
              className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer shadow-3xs"
            >
              {fullViewPdf ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 mr-1.5" />
                  Split View
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
                  Full PDF
                </>
              )}
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[oklch(0.55_0.176_265.75)] to-[oklch(0.45_0.2_290)] flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-900">MedSense</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <JobDetailsSkeleton />
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mb-2">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Failed to Load Claim</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{error}</p>
              <button
                onClick={() => router.push(`/projects/${projectId}`)}
                className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors text-sm font-semibold shadow-md shadow-slate-900/10"
              >
                Go Back to Dashboard
              </button>
            </div>
          </div>
        ) : job ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Split Screen Container */}
            <div className="flex-1 flex overflow-hidden">
              {/* PDF Viewer - Left 50% */}
              <div className={`flex flex-col bg-white ${fullViewPdf ? 'w-full' : 'w-1/2 border-r border-slate-200'} overflow-hidden`}>
                <div className="flex-1 overflow-hidden">
                  {job.files && job.files.length > 0 ? (
                    <PdfViewer
                      pdfUrl={job.files[0].blob_url}
                      fileName={job.files[0].filename}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-slate-50/50">
                      <div className="text-center space-y-2">
                        <div className="text-4xl">📄</div>
                        <p className="text-sm text-slate-500 font-medium">No PDF file available for this job</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Flattened Structured Report & JSON Editor - Right 50% */}
              {!fullViewPdf && (
                <div className="w-1/2 flex flex-col bg-white overflow-hidden relative">
                  {/* Job Metadata Context Panel */}
                  <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-6 py-3 flex items-center justify-between gap-4 select-none">
                    <div className="flex items-center gap-6 flex-wrap">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Job Status</p>
                        <Badge variant={getStatusColor(job.status)} className="mt-0.5 text-xs py-0.5 px-2 capitalize font-semibold">
                          {job.status.toLowerCase() === 'completed' ? 'Parsed' : job.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Review Status</p>
                        <Badge
                          variant={
                            job.reviewStatus === 'completed'
                              ? 'secondary'
                              : job.reviewStatus === 'assigned'
                                ? 'default'
                                : 'outline'
                          }
                          className={`mt-0.5 text-xs py-0.5 px-2 font-semibold ${
                            job.reviewStatus === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-50'
                              : job.reviewStatus === 'assigned'
                                ? 'bg-blue-50 text-blue-700 border-blue-250 hover:bg-blue-50 animate-pulse'
                                : 'bg-amber-50 text-amber-700 border-amber-250 hover:bg-amber-50'
                          }`}
                        >
                          {job.reviewStatus === 'completed'
                            ? 'Review Completed'
                            : job.reviewStatus === 'assigned'
                              ? 'Under Review'
                              : 'In Queue'}
                        </Badge>
                      </div>
                      {job.assignedUserEmail && (
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Assigned To</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">{job.assignedUserEmail}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Created At</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">{formatDate(job.created_at)}</p>
                      </div>
                      {job.files && job.files.length > 0 && (
                        <div className="max-w-[180px]">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Source Document</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate select-all" title={job.files[0].filename}>
                            {job.files[0].filename}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {job.reviewStatus === 'assigned' && (
                        <Button
                          size="sm"
                          onClick={() => handleReviewStatusChange('complete')}
                          disabled={reviewLoading}
                          className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-3xs"
                        >
                          {reviewLoading ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Mark Review Completed
                        </Button>
                      )}
                      {job.reviewStatus === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReviewStatusChange('reopen')}
                          disabled={reviewLoading}
                          className="h-8 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-3xs"
                        >
                          {reviewLoading ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Reopen Review
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tab Headers */}
                  <div className="shrink-0 border-b border-slate-200 bg-slate-50/70 px-6 py-2 flex items-center justify-between shadow-3xs">
                    <div className="flex items-center gap-1.5 bg-slate-200/50 p-1 rounded-lg border border-slate-200/60">
                      <button
                        onClick={() => {
                          setActiveTab('form');
                          setSaveStatus('idle');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                          activeTab === 'form'
                            ? 'bg-white text-slate-900 shadow-xs border-b border-slate-250'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        Structured Data
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('json');
                          setSaveStatus('idle');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                          activeTab === 'json'
                            ? 'bg-white text-slate-900 shadow-xs border-b border-slate-250'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5 text-slate-500" />
                        JSON Editor
                      </button>
                    </div>

                    <div className="flex items-center gap-2 select-none">
                      <Badge className={`uppercase text-[9px] font-bold px-2 py-0.5 ${isEditing ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-650 border-slate-200'}`}>
                        {isEditing ? 'EDIT MODE' : 'VIEW MODE'}
                      </Badge>
                    </div>
                  </div>

                  {/* Tab Contents - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 relative">
                    {activeTab === 'form' ? (
                      /* Flattened Structured Dashboard Workspace */
                      <div className="max-w-4xl mx-auto pb-10 w-full">
                        {renderStructuredReport()}
                      </div>
                    ) : (
                      /* IDE-Style Monospace Raw JSON Editor */
                      <div className="h-full flex flex-col gap-3 min-h-[400px]">
                        <div className="flex-1 flex flex-col border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                          <div className="bg-slate-900 text-slate-400 px-4 py-2 border-b border-slate-800 text-[10px] font-mono select-none flex items-center justify-between">
                            <span>RAW_PARSED_DATA.json</span>
                            {jsonError ? (
                              <span className="text-rose-450 font-bold animate-pulse">⚠️ SYNTAX_ERROR</span>
                            ) : (
                              <span className="text-emerald-500">✓ JSON_VALID</span>
                            )}
                          </div>
                          <textarea
                            className="flex-1 w-full bg-slate-950 text-emerald-400 p-4 font-mono text-xs leading-relaxed focus:outline-none resize-none overflow-y-auto selection:bg-slate-800 selection:text-white"
                            spellCheck={false}
                            value={jsonText}
                            onChange={(e) => handleJsonChange(e.target.value)}
                          />
                        </div>

                        {jsonError && (
                          <div className="bg-rose-55 border border-rose-200 text-rose-700 text-xs px-4 py-3 rounded-lg flex items-start gap-2 animate-in fade-in duration-350">
                            <span className="font-semibold select-none">Error:</span>
                            <span className="font-mono">{jsonError}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* View Mode Floating Circular Edit Button */}
                  {activeTab === 'form' && !isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="absolute bottom-6 right-6 w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 hover:opacity-95 active:scale-95 transition-all z-20 animate-bounce"
                      title="Edit Fields"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  )}

                  {/* Form Footer Action Bar - ONLY in Edit Mode */}
                  {activeTab === 'form' && isEditing && (
                    <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between shadow-lg z-10 animate-in slide-in-from-bottom duration-250">
                      <button
                        onClick={handleReset}
                        disabled={saveStatus === 'saving'}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-slate-650 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>

                      <div className="flex items-center gap-3">
                        {saveStatus === 'success' && (
                          <span className="text-emerald-650 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Saved to MongoDB!
                          </span>
                        )}
                        {saveStatus === 'error' && (
                          <span className="text-rose-600 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {errorMessage.slice(0, 30)}
                          </span>
                        )}

                        <button
                          onClick={handleSave}
                          disabled={saveStatus === 'saving' || jsonError !== null}
                          className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[oklch(0.55_0.176_265.75)] to-[oklch(0.5_0.2_290)] text-white hover:opacity-95 shadow-md shadow-[oklch(0.55_0.176_265.75/0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {saveStatus === 'saving' ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* JSON Editor Tab Footer Action Bar */}
                  {activeTab === 'json' && (
                    <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between shadow-lg z-10">
                      <button
                        onClick={handleReset}
                        disabled={saveStatus === 'saving'}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-slate-650 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </button>

                      <div className="flex items-center gap-3">
                        {saveStatus === 'success' && (
                          <span className="text-emerald-650 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Saved to MongoDB!
                          </span>
                        )}
                        {saveStatus === 'error' && (
                          <span className="text-rose-600 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {errorMessage.slice(0, 30)}
                          </span>
                        )}

                        <button
                          onClick={handleSave}
                          disabled={saveStatus === 'saving' || jsonError !== null}
                          className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[oklch(0.55_0.176_265.75)] to-[oklch(0.5_0.2_290)] text-white hover:opacity-95 shadow-md shadow-[oklch(0.55_0.176_265.75/0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {saveStatus === 'saving' ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-4xl">📬</div>
              <p className="text-slate-500 font-medium">Claim file context not found</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function JobDetailsSkeleton() {
  return (
    <div className="flex-1 flex overflow-hidden animate-pulse">
      {/* PDF Viewer - Left 50% */}
      <div className="w-1/2 h-full border-r border-slate-200 bg-slate-50 flex flex-col p-4 space-y-4">
        <div className="flex justify-between items-center bg-white border border-slate-200 rounded-lg p-3">
          <Skeleton className="h-4 w-32 bg-slate-100" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 bg-slate-100 rounded-md" />
            <Skeleton className="h-8 w-8 bg-slate-100 rounded-md" />
          </div>
        </div>
        <Skeleton className="flex-1 w-full bg-slate-100 rounded-xl" />
      </div>

      {/* Structured Report & JSON Editor - Right 50% */}
      <div className="w-1/2 h-full bg-white flex flex-col p-6 space-y-6">
        {/* Job Metadata Panel */}
        <div className="flex items-center gap-6 border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16 bg-slate-150" />
            <Skeleton className="h-5.5 w-24 bg-slate-100 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 bg-slate-150" />
            <Skeleton className="h-5.5 w-28 bg-slate-100 rounded-full" />
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex gap-4 border-b border-slate-250 pb-2">
          <Skeleton className="h-8 w-24 bg-slate-150 rounded" />
          <Skeleton className="h-8 w-32 bg-slate-100 rounded" />
          <Skeleton className="h-8 w-20 bg-slate-100 rounded" />
        </div>

        {/* Content Blocks */}
        <div className="space-y-4 flex-1 overflow-hidden">
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-40 bg-slate-150" />
              <Skeleton className="h-5 w-16 bg-slate-100" />
            </div>
            <Skeleton className="h-3 w-full bg-slate-100" />
            <Skeleton className="h-3 w-5/6 bg-slate-100" />
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-48 bg-slate-150" />
              <Skeleton className="h-5 w-20 bg-slate-100" />
            </div>
            <div className="space-y-2 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-32 bg-slate-100" />
                  <Skeleton className="h-4 w-24 bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
