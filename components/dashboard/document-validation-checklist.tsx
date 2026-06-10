'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Stethoscope,
  Pill,
  FlaskConical,
  ScanLine,
  ChevronDown,
  ChevronRight,
  FileText,
  Hash,
  Calendar,
  IndianRupee,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ValidatorEntry {
  key: string;
  label: string;
  value: boolean | string;
  type: 'boolean' | 'string';
}

interface BillEntry {
  bill_no: string;
  bill_date: string;
  claimed_amount: number;
  validators: Record<string, any>;
}

interface DocumentValidationChecklistProps {
  data: Record<string, any>;
  isEditing?: boolean;
  onFormChange?: (path: string, value: any) => void;
  basePath?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
    lightBg: string;
    accentText: string;
  }
> = {
  consultation: {
    label: 'Consultation',
    icon: Stethoscope,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    lightBg: 'bg-blue-500/5',
    accentText: 'text-blue-500',
  },
  pharmacy: {
    label: 'Pharmacy',
    icon: Pill,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    lightBg: 'bg-emerald-500/5',
    accentText: 'text-emerald-500',
  },
  investigation_lab: {
    label: 'Investigation - Lab',
    icon: FlaskConical,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    lightBg: 'bg-violet-500/5',
    accentText: 'text-violet-500',
  },
  investigation_radiology: {
    label: 'Investigation - Radiology',
    icon: ScanLine,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    lightBg: 'bg-amber-500/5',
    accentText: 'text-amber-500',
  },
};

function formatValidatorLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number): string {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function extractValidators(validators: Record<string, any>): ValidatorEntry[] {
  return Object.entries(validators).map(([key, value]) => ({
    key,
    label: formatValidatorLabel(key),
    value,
    type: typeof value === 'boolean' ? 'boolean' : 'string',
  }));
}

function getValidationStats(validators: Record<string, any>): {
  passed: number;
  failed: number;
  total: number;
  percentage: number;
} {
  const boolEntries = Object.entries(validators).filter(
    ([, v]) => typeof v === 'boolean'
  );
  const passed = boolEntries.filter(([key, v]) => {
    // For "duplicate_or_photocopy_bill", false is the passing state
    if (key === 'duplicate_or_photocopy_bill' || key === 'credit_bill') {
      return v === false;
    }
    return v === true;
  }).length;
  const total = boolEntries.length;
  return {
    passed,
    failed: total - passed,
    total,
    percentage: total > 0 ? Math.round((passed / total) * 100) : 0,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ValidationBadge({ passed, value }: { passed: boolean; value: boolean | string }) {
  if (typeof value === 'string') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 font-mono max-w-[200px] truncate" title={value}>
        {value}
      </span>
    );
  }

  if (passed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 select-none">
        <CheckCircle2 className="w-3 h-3" />
        Pass
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 select-none">
      <XCircle className="w-3 h-3" />
      Fail
    </span>
  );
}

function CircularProgress({
  percentage,
  size = 44,
  strokeWidth = 4,
  passed,
  total,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  passed: number;
  total: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage === 100
      ? 'stroke-emerald-500'
      : percentage >= 70
      ? 'stroke-amber-500'
      : 'stroke-rose-500';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-100 fill-none"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${color} fill-none transition-all duration-700 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-slate-700 leading-none">
          {passed}/{total}
        </span>
      </div>
    </div>
  );
}

function BillCard({
  bill,
  categoryKey,
  billIndex,
  config,
  isEditing,
  onFormChange,
  basePath,
}: {
  bill: BillEntry;
  categoryKey: string;
  billIndex: number;
  config: (typeof CATEGORY_CONFIG)[string];
  isEditing?: boolean;
  onFormChange?: (path: string, value: any) => void;
  basePath: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const validators = extractValidators(bill.validators);
  const stats = getValidationStats(bill.validators);

  const booleanValidators = validators.filter((v) => v.type === 'boolean');
  const stringValidators = validators.filter((v) => v.type === 'string');

  // Determine if a boolean value represents a "pass"
  const isPassingValue = (key: string, value: boolean): boolean => {
    if (key === 'duplicate_or_photocopy_bill' || key === 'credit_bill' || key === 'south_region_exception') {
      return value === false;
    }
    return value === true;
  };

  return (
    <div
      className={`rounded-xl border ${config.borderColor} ${config.lightBg} overflow-hidden transition-all duration-300 hover:shadow-sm`}
    >
      {/* Bill Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 ${config.bgColor} border-b ${config.borderColor} hover:brightness-[0.98] transition-all duration-200 cursor-pointer select-none`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-7 h-7 rounded-lg bg-white/80 border ${config.borderColor} shadow-xs`}>
            <FileText className={`w-3.5 h-3.5 ${config.color}`} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${config.color} uppercase tracking-wider`}>
                Bill #{billIndex + 1}
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-white/60 px-1.5 py-0.5 rounded border border-slate-200/50">
                {bill.bill_no}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                <Calendar className="w-2.5 h-2.5" />
                {formatDate(bill.bill_date)}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700">
                <IndianRupee className="w-2.5 h-2.5" />
                {formatCurrency(bill.claimed_amount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CircularProgress
            percentage={stats.percentage}
            passed={stats.passed}
            total={stats.total}
            size={38}
            strokeWidth={3}
          />
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-200" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 transition-transform duration-200" />
          )}
        </div>
      </button>

      {/* Validators */}
      {expanded && (
        <div className="p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {/* Quick stats bar */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-600">{stats.passed} Passed</span>
            </div>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <ShieldAlert className="w-3 h-3 text-rose-500" />
              <span className="text-rose-600">{stats.failed} Failed</span>
            </div>
            <div className="flex-1" />
            {stats.percentage === 100 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5" />
                All Clear
              </span>
            )}
            {stats.percentage < 100 && stats.failed > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-2.5 h-2.5" />
                Needs Attention
              </span>
            )}
          </div>

          {/* Boolean Validators Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {booleanValidators.map((v) => {
              const isPassing = isPassingValue(v.key, v.value as boolean);
              return (
                <div
                  key={v.key}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-150 ${
                    isPassing
                      ? 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50'
                      : 'bg-rose-50/50 border-rose-100 hover:bg-rose-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isPassing ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    )}
                    <span
                      className={`text-xs font-medium leading-tight break-words ${
                        isPassing ? 'text-emerald-800' : 'text-rose-800'
                      }`}
                      title={v.label}
                    >
                      {v.label}
                    </span>
                  </div>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer shrink-0 ml-2"
                      checked={v.value as boolean}
                      onChange={(e) => {
                        onFormChange?.(
                          `${basePath}.${billIndex}.validators.${v.key}`,
                          e.target.checked
                        );
                      }}
                    />
                  ) : (
                    <ValidationBadge passed={isPassing} value={v.value} />
                  )}
                </div>
              );
            })}
          </div>

          {/* String Validators (like GST number, prescription type) */}
          {stringValidators.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {stringValidators.map((v) => (
                <div
                  key={v.key}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all duration-150"
                >
                  <span className="text-xs font-medium text-slate-600 leading-tight">
                    {v.label}
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-40 px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-250/20 bg-white shadow-3xs"
                      value={v.value as string}
                      onChange={(e) => {
                        onFormChange?.(
                          `${basePath}.${billIndex}.validators.${v.key}`,
                          e.target.value
                        );
                      }}
                    />
                  ) : (
                    <ValidationBadge passed={false} value={v.value} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DocumentValidationChecklist({
  data,
  isEditing = false,
  onFormChange,
  basePath = 'document_validation_checklist',
}: DocumentValidationChecklistProps) {
  if (!data || typeof data !== 'object') return null;

  // Calculate overall stats across all categories
  const allCategories = Object.entries(data).filter(
    ([, value]) => Array.isArray(value) && value.length > 0
  );

  let totalPassed = 0;
  let totalChecks = 0;

  allCategories.forEach(([, bills]) => {
    (bills as BillEntry[]).forEach((bill) => {
      if (bill.validators) {
        const stats = getValidationStats(bill.validators);
        totalPassed += stats.passed;
        totalChecks += stats.total;
      }
    });
  });

  const overallPercentage =
    totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Overall Summary Bar */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-fuchsia-50/80 via-purple-50/50 to-violet-50/80 border border-fuchsia-200/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-fuchsia-100 border border-fuchsia-200 shadow-xs">
            <ClipboardCheck className="w-4.5 h-4.5 text-fuchsia-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-fuchsia-900">
              Overall Validation Score
            </p>
            <p className="text-[10px] text-fuchsia-600/80 font-medium">
              {allCategories.length} categories • {allCategories.reduce((a, [, v]) => a + (v as any[]).length, 0)} bills
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-black text-fuchsia-700">{overallPercentage}%</p>
            <p className="text-[10px] text-slate-500 font-semibold">
              {totalPassed}/{totalChecks} checks
            </p>
          </div>
          <CircularProgress
            percentage={overallPercentage}
            passed={totalPassed}
            total={totalChecks}
            size={48}
            strokeWidth={4}
          />
        </div>
      </div>

      {/* Category Sections */}
      {allCategories.map(([categoryKey, bills]) => {
        const config = CATEGORY_CONFIG[categoryKey] || {
          label: formatValidatorLabel(categoryKey),
          icon: ClipboardCheck,
          color: 'text-slate-600',
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200',
          lightBg: 'bg-slate-50/50',
          accentText: 'text-slate-500',
        };
        const CategoryIcon = config.icon;
        const billsArr = bills as BillEntry[];

        // Category-level stats
        let catPassed = 0;
        let catTotal = 0;
        billsArr.forEach((bill) => {
          if (bill.validators) {
            const s = getValidationStats(bill.validators);
            catPassed += s.passed;
            catTotal += s.total;
          }
        });
        const catPercentage = catTotal > 0 ? Math.round((catPassed / catTotal) * 100) : 0;

        return (
          <div key={categoryKey} className="space-y-3">
            {/* Category Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-lg ${config.bgColor} border ${config.borderColor}`}
                >
                  <CategoryIcon className={`w-3 h-3 ${config.color}`} />
                </div>
                <h4
                  className={`text-[11px] font-bold uppercase tracking-widest ${config.accentText}`}
                >
                  {config.label}
                </h4>
                <span className="text-[10px] text-slate-400 font-semibold">
                  ({billsArr.length} bill{billsArr.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold ${
                    catPercentage === 100
                      ? 'text-emerald-600'
                      : catPercentage >= 70
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                >
                  {catPercentage}%
                </span>
                <div
                  className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      catPercentage === 100
                        ? 'bg-emerald-500'
                        : catPercentage >= 70
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${catPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Bills */}
            <div className="space-y-3 pl-1">
              {billsArr.map((bill, billIndex) => (
                <BillCard
                  key={bill.bill_no || billIndex}
                  bill={bill}
                  categoryKey={categoryKey}
                  billIndex={billIndex}
                  config={config}
                  isEditing={isEditing}
                  onFormChange={onFormChange}
                  basePath={`${basePath}.${categoryKey}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
