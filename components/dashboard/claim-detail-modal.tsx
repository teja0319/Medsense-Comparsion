'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  GitCompare,
  Pencil,
  Code2,
  X,
  Save,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { JsonViewer } from '@/components/dashboard/json-viewer';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClaimDetailModalProps {
  open: boolean;
  onClose: () => void;
  job: {
    _id: string;
    status: string;
    parsed_data?: Record<string, any>;
    created_at?: string;
    files?: Array<{ filename: string; blob_url: string }>;
  } | null;
}

interface EditFormState {
  claim_number: string;
  policy_number: string;
  total_claimed_amount: string;
  name: string;
  age: string;
  gender: string;
  final_decision: string;
  requires_manual_review: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const KNOWN_TOP_LEVEL_FIELDS = new Set([
  'claim_details',
  'insured_person_details',
  'final_decision',
  'requires_manual_review',
]);

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getDecisionColor(decision?: string) {
  switch (decision?.toUpperCase()) {
    case 'APPROVE':
    case 'APPROVED':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    case 'REJECT':
    case 'REJECTED':
      return {
        bg: 'bg-rose-500/15',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        dot: 'bg-rose-400',
      };
    case 'QUERY':
    case 'QUERIED':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        dot: 'bg-amber-400',
      };
    default:
      return {
        bg: 'bg-muted/50',
        text: 'text-muted-foreground',
        border: 'border-border',
        dot: 'bg-muted-foreground',
      };
  }
}

function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'processing':
    case 'in_progress':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'failed':
    case 'error':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    case 'pending':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
}

function extractEditState(parsed?: Record<string, any>): EditFormState {
  const claim = parsed?.claim_details ?? {};
  const person = parsed?.insured_person_details ?? {};
  return {
    claim_number: String(claim?.claim_number ?? ''),
    policy_number: String(claim?.policy_number ?? ''),
    total_claimed_amount: String(claim?.total_claimed_amount ?? ''),
    name: String(person?.name ?? ''),
    age: String(person?.age ?? ''),
    gender: String(person?.gender ?? ''),
    final_decision: String(parsed?.final_decision ?? ''),
    requires_manual_review: Boolean(parsed?.requires_manual_review),
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlassCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl',
        'shadow-[0_0_15px_rgba(0,0,0,0.1)] transition-all duration-300',
        'hover:border-border/70 hover:shadow-[0_0_25px_rgba(0,0,0,0.15)]',
        className
      )}
    >
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/30">
        {Icon && (
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
        )}
        <h3 className="text-sm font-semibold text-foreground tracking-tight">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/20 last:border-0">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span
        className={cn(
          'text-sm text-foreground text-right',
          mono && 'font-mono text-xs'
        )}
      >
        {value ?? <span className="text-muted-foreground/50 italic">—</span>}
      </span>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background/50 border-border/50 focus:border-primary/50 h-9"
      />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ClaimDetailModal({
  open,
  onClose,
  job,
}: ClaimDetailModalProps) {
  const parsed = job?.parsed_data;

  const initialEditState = useMemo(() => extractEditState(parsed), [parsed]);

  const [editState, setEditState] = useState<EditFormState>(initialEditState);
  const [activeTab, setActiveTab] = useState('comparison');

  // Reset edit state when job changes
  useEffect(() => {
    setEditState(extractEditState(parsed));
    setActiveTab('comparison');
  }, [parsed]);

  const updateField = useCallback(
    <K extends keyof EditFormState>(field: K, value: EditFormState[K]) => {
      setEditState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleReset = useCallback(() => {
    setEditState(initialEditState);
  }, [initialEditState]);

  const handleSave = useCallback(() => {
    alert(
      `Changes saved (mock):\n${JSON.stringify(editState, null, 2)}`
    );
  }, [editState]);

  // Collect "additional" fields not covered by the structured cards
  const additionalFields = useMemo(() => {
    if (!parsed) return [];
    return Object.entries(parsed).filter(([key]) => !KNOWN_TOP_LEVEL_FIELDS.has(key));
  }, [parsed]);

  const shortId = job?._id?.slice(-8) ?? '—';
  const decisionColors = getDecisionColor(parsed?.final_decision);

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden',
          'bg-background/95 backdrop-blur-2xl border-border/50',
          'shadow-[0_0_60px_rgba(0,0,0,0.3)]'
        )}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border/40 bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 ring-1 ring-primary/20">
                <Hash className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                  Claim{' '}
                  <span className="font-mono text-primary">
                    ...{shortId}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Job detail and claim analysis
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] uppercase tracking-widest font-semibold px-2.5 py-0.5',
                  getStatusColor(job.status)
                )}
              >
                {job.status}
              </Badge>
              {job.created_at && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDate(job.created_at)}
                </span>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="shrink-0 px-6 pt-3 pb-0 bg-gradient-to-b from-card/30 to-transparent">
            <TabsList className="bg-muted/40 backdrop-blur-lg border border-border/30 p-1 h-10">
              <TabsTrigger
                value="comparison"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs px-4"
              >
                <GitCompare className="w-3.5 h-3.5" />
                Comparison
              </TabsTrigger>
              <TabsTrigger
                value="edit"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs px-4"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </TabsTrigger>
              <TabsTrigger
                value="json"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1.5 text-xs px-4"
              >
                <Code2 className="w-3.5 h-3.5" />
                JSON
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Comparison Tab ─────────────────────────────────────── */}
          <TabsContent
            value="comparison"
            className="flex-1 overflow-y-auto px-6 py-5"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in-0 duration-300">
              {/* Left column */}
              <div className="space-y-5">
                {/* Claim Details */}
                <GlassCard title="Claim Details" icon={Hash}>
                  <div className="space-y-0">
                    <FieldRow
                      label="Claim Number"
                      value={parsed?.claim_details?.claim_number}
                      mono
                    />
                    <FieldRow
                      label="Policy Number"
                      value={parsed?.claim_details?.policy_number}
                      mono
                    />
                    <FieldRow
                      label="Total Claimed Amount"
                      value={
                        parsed?.claim_details?.total_claimed_amount != null ? (
                          <span className="font-semibold text-emerald-400">
                            ₹
                            {Number(
                              parsed.claim_details.total_claimed_amount
                            ).toLocaleString()}
                          </span>
                        ) : undefined
                      }
                    />
                  </div>
                </GlassCard>

                {/* Decision */}
                <GlassCard title="Decision" icon={GitCompare}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Final Decision
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border',
                          decisionColors.bg,
                          decisionColors.text,
                          decisionColors.border
                        )}
                      >
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full animate-pulse',
                            decisionColors.dot
                          )}
                        />
                        {parsed?.final_decision?.toUpperCase() ?? '—'}
                      </span>
                    </div>
                    {parsed?.requires_manual_review != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Manual Review
                        </span>
                        {parsed.requires_manual_review ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Required
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          >
                            Not Required
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* Insured Person */}
                <GlassCard title="Insured Person" icon={Pencil}>
                  <div className="space-y-0">
                    <FieldRow label="Name" value={parsed?.insured_person_details?.name} />
                    <FieldRow label="Age" value={parsed?.insured_person_details?.age} />
                    <FieldRow label="Gender" value={parsed?.insured_person_details?.gender} />
                  </div>
                </GlassCard>

                {/* Additional Details */}
                {additionalFields.length > 0 && (
                  <GlassCard title="Additional Details" icon={Code2}>
                    <div className="space-y-0">
                      {additionalFields.map(([key, val]) => (
                        <FieldRow
                          key={key}
                          label={formatFieldLabel(key)}
                          value={
                            typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val)
                          }
                        />
                      ))}
                    </div>
                  </GlassCard>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Edit Tab ───────────────────────────────────────────── */}
          <TabsContent
            value="edit"
            className="flex-1 overflow-y-auto px-6 py-5"
          >
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-0 duration-300">
              {/* Claim fields */}
              <GlassCard title="Claim Details" icon={Hash}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LabeledInput
                    label="Claim Number"
                    value={editState.claim_number}
                    onChange={(v) => updateField('claim_number', v)}
                  />
                  <LabeledInput
                    label="Policy Number"
                    value={editState.policy_number}
                    onChange={(v) => updateField('policy_number', v)}
                  />
                  <LabeledInput
                    label="Total Claimed Amount"
                    value={editState.total_claimed_amount}
                    onChange={(v) => updateField('total_claimed_amount', v)}
                    type="number"
                  />
                </div>
              </GlassCard>

              {/* Person fields */}
              <GlassCard title="Insured Person" icon={Pencil}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <LabeledInput
                    label="Name"
                    value={editState.name}
                    onChange={(v) => updateField('name', v)}
                  />
                  <LabeledInput
                    label="Age"
                    value={editState.age}
                    onChange={(v) => updateField('age', v)}
                    type="number"
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Gender
                    </label>
                    <select
                      value={editState.gender}
                      onChange={(e) => updateField('gender', e.target.value)}
                      className={cn(
                        'flex h-9 w-full rounded-md border border-border/50 bg-background/50 px-3 py-1',
                        'text-sm text-foreground transition-colors',
                        'focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                      )}
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </GlassCard>

              {/* Decision fields */}
              <GlassCard title="Decision" icon={GitCompare}>
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Final Decision
                    </label>
                    <select
                      value={editState.final_decision}
                      onChange={(e) =>
                        updateField('final_decision', e.target.value)
                      }
                      className={cn(
                        'flex h-9 w-full rounded-md border border-border/50 bg-background/50 px-3 py-1',
                        'text-sm text-foreground transition-colors',
                        'focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                      )}
                    >
                      <option value="">Select...</option>
                      <option value="APPROVE">Approve</option>
                      <option value="REJECT">Reject</option>
                      <option value="QUERY">Query</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-2 px-1">
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Requires Manual Review
                      </label>
                      <p className="text-[11px] text-muted-foreground/60">
                        Flag this claim for human review
                      </p>
                    </div>
                    <Switch
                      checked={editState.requires_manual_review}
                      onCheckedChange={(v) =>
                        updateField('requires_manual_review', v)
                      }
                    />
                  </div>
                </div>
              </GlassCard>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1.5 border-border/50 hover:bg-muted/50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── JSON Tab ───────────────────────────────────────────── */}
          <TabsContent
            value="json"
            className="flex-1 min-h-0 overflow-hidden px-6 py-5"
          >
            <div className="h-full rounded-xl border border-border/50 overflow-hidden bg-card/30 backdrop-blur-xl animate-in fade-in-0 duration-300">
              <JsonViewer data={parsed ?? {}} expanded={true} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
