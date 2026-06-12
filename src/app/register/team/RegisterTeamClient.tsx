'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TopologyGlyph, { TOPOLOGY_LABELS } from '@/components/TopologyGlyph';
import type { TopologyType } from '@/lib/db/types';

// ── Style constants ────────────────────────────────────────────────────────

const inputClasses =
  'w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none';

const labelClasses = 'block text-xs font-medium uppercase tracking-wide text-text-tertiary';

// ── Topology definitions (5 named) ─────────────────────────────────────────

const NAMED_TOPOLOGIES: { type: TopologyType; when: string }[] = [
  {
    type: 'supervisor',
    when: 'A lead agent reviews outputs and directs specialists — authority stays at the top.',
  },
  {
    type: 'orchestrator_worker',
    when: 'A hub decomposes work and routes tasks to workers — parallel or sequential execution.',
  },
  {
    type: 'swarm',
    when: 'Peers coordinate without a fixed lead — emergent consensus, high autonomy.',
  },
  {
    type: 'pipeline',
    when: 'Staged hand-offs in sequence — output of one agent is input to the next.',
  },
  {
    type: 'router',
    when: 'A dispatcher classifies incoming tasks and sends each to the right specialist.',
  },
];

// ── ISO date validation ────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidISODate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface SessionUser {
  id?: string;
  name: string | null;
  email: string | null;
}

interface MemberRow {
  name: string;
  role: string;
  model: string;
  platform: string;
  tagline: string;
}

const emptyMember = (): MemberRow => ({
  name: '',
  role: '',
  model: '',
  platform: '',
  tagline: '',
});

interface FormState {
  // Step 1: Identity
  name: string;
  tagline: string;
  platform: string;
  industries: string[];
  taskKinds: string[];
  operationalSince: string;
  // Step 2: Topology
  topologyType: TopologyType | '';
  // Step 3: Members
  members: MemberRow[];
  // Step 4: Blueprint
  whyItWorks: string;
  howBuilt: string;
  oversight: string;
  // Owner (shown at step 1 on mobile; shown in review on desktop)
  ownerName: string;
  ownerHandle: string;
}

type StepErrors = Record<string, string>;

// ── TagInput ───────────────────────────────────────────────────────────────

interface TagInputProps {
  label: string;
  hint: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  maxItems?: number;
  maxItemLength?: number;
}

function TagInput({
  label,
  hint,
  tags,
  onChange,
  maxItems = 10,
  maxItemLength = 40,
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  const addTag = useCallback(
    (raw: string) => {
      const candidates = raw
        .split(',')
        .map((s) => s.trim().toLowerCase().replace(/\s+/g, '-'))
        .filter(Boolean);
      const next = [...tags];
      for (const c of candidates) {
        if (next.length >= maxItems) break;
        if (c.length > maxItemLength) continue;
        if (!next.includes(c)) next.push(c);
      }
      onChange(next);
      setDraft('');
    },
    [tags, onChange, maxItems, maxItemLength]
  );

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (draft.trim()) addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <p className="mt-0.5 text-[11px] text-text-tertiary">{hint}</p>
      <div className="mt-1.5 flex min-h-[40px] flex-wrap gap-1.5 rounded-lg border border-border bg-surface-elevated px-2 py-1.5 focus-within:border-accent cursor-text">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="text-accent/60 hover:text-accent"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {tags.length < maxItems && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={() => {
              if (draft.trim()) addTag(draft);
            }}
            placeholder={tags.length === 0 ? 'type and press Enter or comma' : ''}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
            maxLength={maxItemLength + 1}
          />
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-text-tertiary">
        {tags.length}/{maxItems} tags
      </p>
    </div>
  );
}

// ── CharTextarea ───────────────────────────────────────────────────────────

function CharTextarea({
  label,
  id,
  rows = 4,
  maxLength,
  placeholder,
  value,
  onChange,
  hint,
}: {
  label: string;
  id: string;
  rows?: number;
  maxLength: number;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const remaining = maxLength - value.length;
  const warn = remaining < maxLength * 0.1;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className={labelClasses}>
          {label}
        </label>
        <span className={`text-[10px] ${warn ? 'text-amber-400' : 'text-text-tertiary'}`}>
          {remaining} chars remaining
        </span>
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-text-tertiary">{hint}</p>}
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 ${inputClasses} resize-y`}
      />
    </div>
  );
}

// ── Stepper indicator ──────────────────────────────────────────────────────

const STEP_LABELS = ['Identity', 'Topology', 'Members', 'Blueprint', 'Review'];

function StepperBar({ current }: { current: number }) {
  return (
    <nav aria-label="Registration steps" className="flex items-center gap-0">
      {STEP_LABELS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  done
                    ? 'bg-accent text-white'
                    : active
                      ? 'border-2 border-accent bg-accent/10 text-accent'
                      : 'border border-border bg-surface-elevated text-text-tertiary'
                }`}
              >
                {done ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`hidden text-[10px] sm:block ${active ? 'text-accent font-medium' : done ? 'text-text-secondary' : 'text-text-tertiary'}`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`mx-1.5 h-px w-6 sm:w-10 transition-colors ${done ? 'bg-accent' : 'bg-border'}`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function RegisterTeamClient({ sessionUser }: { sessionUser?: SessionUser | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<StepErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState<FormState>({
    name: '',
    tagline: '',
    platform: '',
    industries: [],
    taskKinds: [],
    operationalSince: '',
    topologyType: '',
    members: [emptyMember()],
    whyItWorks: '',
    howBuilt: '',
    oversight: '',
    ownerName: sessionUser?.name ?? '',
    ownerHandle: '',
  });

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (stepErrors[key])
      setStepErrors((e) => {
        const n = { ...e };
        delete n[key];
        return n;
      });
  }

  // ── Per-step validation ────────────────────────────────────────────────

  function validateStep(s: number): StepErrors {
    const errs: StepErrors = {};
    if (s === 0) {
      if (!form.name.trim()) errs['name'] = 'Team name is required';
      else if (form.name.trim().length > 80) errs['name'] = 'Max 80 characters';
      if (!form.tagline.trim()) errs['tagline'] = 'Tagline is required';
      else if (form.tagline.trim().length > 200) errs['tagline'] = 'Max 200 characters';
      if (!form.ownerName.trim()) errs['ownerName'] = 'Owner display name is required';
      if (!form.ownerHandle.trim()) errs['ownerHandle'] = 'Owner handle is required';
      if (form.operationalSince.trim() && !isValidISODate(form.operationalSince.trim())) {
        errs['operationalSince'] = 'Use YYYY-MM-DD format — e.g. 2024-03-15';
      }
    }
    if (s === 1) {
      if (!form.topologyType) errs['topologyType'] = 'Select a topology to continue';
    }
    if (s === 2) {
      if (form.members.length === 0) {
        errs['members'] = 'At least one member is required';
      } else {
        form.members.forEach((m, i) => {
          if (!m.name.trim()) errs[`member_${i}_name`] = 'Name is required';
          if (!m.role.trim()) errs[`member_${i}_role`] = 'Role is required';
        });
      }
    }
    return errs;
  }

  function goNext() {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setStepErrors(errs);
      return;
    }
    setStepErrors({});
    setStep((s) => s + 1);
  }

  function goBack() {
    setStepErrors({});
    setStep((s) => Math.max(0, s - 1));
  }

  // ── Member row helpers ─────────────────────────────────────────────────

  function updateMember(i: number, key: keyof MemberRow, val: string) {
    setForm((f) => {
      const m = [...f.members];
      m[i] = { ...m[i]!, [key]: val };
      return { ...f, members: m };
    });
    if (stepErrors[`member_${i}_${key}`]) {
      setStepErrors((e) => {
        const n = { ...e };
        delete n[`member_${i}_${key}`];
        return n;
      });
    }
  }

  function addMember() {
    setForm((f) => ({ ...f, members: [...f.members, emptyMember()] }));
  }

  function removeMember(i: number) {
    setForm((f) => ({ ...f, members: f.members.filter((_, idx) => idx !== i) }));
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    setGlobalError('');

    const membersPayload = form.members.map((m) => ({
      create: {
        name: m.name.trim(),
        role: m.role.trim(),
        model: m.model.trim() || undefined,
        platform: m.platform.trim() || form.platform.trim() || undefined,
        tagline: m.tagline.trim() || undefined,
      },
    }));

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      ownerName: form.ownerName.trim(),
      ownerHandle: form.ownerHandle.trim(),
      members: membersPayload,
      agentCount: form.members.length,
    };
    if (form.topologyType) payload['topologyType'] = form.topologyType;
    if (form.platform.trim()) payload['platform'] = form.platform.trim();
    if (form.industries.length > 0) payload['industries'] = form.industries;
    if (form.taskKinds.length > 0) payload['taskKinds'] = form.taskKinds;
    if (form.operationalSince.trim()) payload['operationalSince'] = form.operationalSince.trim();
    if (form.whyItWorks.trim()) payload['whyItWorks'] = form.whyItWorks.trim();
    if (form.howBuilt.trim()) payload['howBuilt'] = form.howBuilt.trim();
    if (form.oversight.trim()) payload['oversight'] = form.oversight.trim();

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        slug?: string;
        error?: { message?: string };
      };
      if (!res.ok || !data.slug) {
        setGlobalError(data.error?.message ?? 'Submission failed. Please try again.');
        setSubmitting(false);
        return;
      }
      router.push(`/teams/${data.slug}`);
    } catch {
      setGlobalError('Network error — please try again.');
      setSubmitting(false);
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────

  function FieldError({ field }: { field: string }) {
    if (!stepErrors[field]) return null;
    return <p className="mt-0.5 text-[11px] text-red-400">{stepErrors[field]}</p>;
  }

  // ── Step renders ───────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-5">
        <div>
          <label htmlFor="st1-name" className={labelClasses}>
            Team name *
          </label>
          <input
            id="st1-name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            maxLength={80}
            placeholder="e.g. Ari Collective, Research Pipeline Alpha"
            className={`mt-1.5 ${inputClasses} ${stepErrors['name'] ? 'border-red-500/50' : ''}`}
          />
          <FieldError field="name" />
        </div>

        <div>
          <label htmlFor="st1-tagline" className={labelClasses}>
            Tagline *
          </label>
          <input
            id="st1-tagline"
            value={form.tagline}
            onChange={(e) => setField('tagline', e.target.value)}
            maxLength={200}
            placeholder="One sentence: what does this team actually run?"
            className={`mt-1.5 ${inputClasses} ${stepErrors['tagline'] ? 'border-red-500/50' : ''}`}
          />
          <FieldError field="tagline" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="st1-platform" className={labelClasses}>
              Platform
            </label>
            <input
              id="st1-platform"
              value={form.platform}
              onChange={(e) => setField('platform', e.target.value)}
              maxLength={60}
              placeholder="OpenClaw, Claude Code, LangGraph…"
              className={`mt-1.5 ${inputClasses}`}
            />
            <p className="mt-0.5 text-[11px] text-text-tertiary">
              Default platform for member agents.
            </p>
          </div>
          <div>
            <label htmlFor="st1-since" className={labelClasses}>
              Operating since <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              id="st1-since"
              value={form.operationalSince}
              onChange={(e) => setField('operationalSince', e.target.value)}
              placeholder="YYYY-MM-DD"
              maxLength={10}
              className={`mt-1.5 ${inputClasses} font-mono ${stepErrors['operationalSince'] ? 'border-red-500/50' : ''}`}
            />
            <FieldError field="operationalSince" />
          </div>
        </div>

        <TagInput
          label="Industries"
          hint="What domain does this run in? e.g. software-delivery, research, ops"
          tags={form.industries}
          onChange={(t) => setField('industries', t)}
        />

        <TagInput
          label="Task kinds"
          hint="What work does it actually do? e.g. code-review, incident-response, data-pipeline"
          tags={form.taskKinds}
          onChange={(t) => setField('taskKinds', t)}
        />

        <div className="border-t border-border pt-5">
          <h3 className="mb-3 text-xs font-semibold text-text-secondary">Owner</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="st1-ownerName" className={labelClasses}>
                Display name *
              </label>
              {sessionUser?.name && (
                <p className="mt-0.5 text-[11px] text-accent/80">Prefilled from your account.</p>
              )}
              <input
                id="st1-ownerName"
                value={form.ownerName}
                onChange={(e) => setField('ownerName', e.target.value)}
                maxLength={80}
                placeholder="Your name or org"
                className={`mt-1.5 ${inputClasses} ${stepErrors['ownerName'] ? 'border-red-500/50' : ''}`}
              />
              <FieldError field="ownerName" />
            </div>
            <div>
              <label htmlFor="st1-ownerHandle" className={labelClasses}>
                Handle *
              </label>
              <input
                id="st1-ownerHandle"
                value={form.ownerHandle}
                onChange={(e) => setField('ownerHandle', e.target.value)}
                maxLength={40}
                placeholder="lowercase-no-spaces"
                className={`mt-1.5 ${inputClasses} ${stepErrors['ownerHandle'] ? 'border-red-500/50' : ''}`}
              />
              <FieldError field="ownerHandle" />
            </div>
          </div>
          <p className="mt-2 text-xs text-text-tertiary">
            Existing handles attach this team to that owner.{' '}
            {sessionUser
              ? 'This submission will be linked to your account.'
              : 'Sign in to automatically link submissions to your account.'}
          </p>
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-4">
        <p className="text-xs text-text-secondary">
          Select the topology that best describes how this team&apos;s agents relate to each other.
          This is a comparable field — it lets others filter and compare by architecture pattern.
        </p>
        {stepErrors['topologyType'] && (
          <p className="text-[11px] text-red-400">{stepErrors['topologyType']}</p>
        )}
        <div className="grid gap-3">
          {NAMED_TOPOLOGIES.map(({ type, when }) => {
            const selected = form.topologyType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setField('topologyType', type)}
                className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all ${
                  selected
                    ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                    : 'border-border bg-surface-elevated/50 hover:border-accent/30 hover:bg-surface-elevated'
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 transition-colors ${selected ? 'text-accent' : 'text-text-tertiary'}`}
                >
                  <TopologyGlyph topology={type} size={32} />
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${selected ? 'text-accent' : 'text-text-primary'}`}
                  >
                    {TOPOLOGY_LABELS[type]}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{when}</p>
                </div>
                {selected && (
                  <span className="ml-auto mt-0.5 shrink-0 text-accent">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live glyph preview */}
        {form.topologyType && (
          <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
            <TopologyGlyph topology={form.topologyType} size={40} className="text-accent" />
            <div>
              <p className="text-sm font-semibold text-accent">
                {TOPOLOGY_LABELS[form.topologyType]}
              </p>
              <p className="text-[11px] text-text-tertiary">Selected topology</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-4">
        <p className="text-xs text-text-secondary">
          Add each agent in this team. Members are created as new agent profiles in the same
          transaction — they will appear on the team roster immediately. At least one member is
          required.
        </p>
        {stepErrors['members'] && (
          <p className="text-[11px] text-red-400">{stepErrors['members']}</p>
        )}

        <div className="space-y-3">
          {form.members.map((m, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface-elevated/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text-secondary">Member {i + 1}</p>
                {form.members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(i)}
                    className="text-[11px] text-text-tertiary hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClasses}>Name *</label>
                  <input
                    value={m.name}
                    onChange={(e) => updateMember(i, 'name', e.target.value)}
                    maxLength={80}
                    placeholder="e.g. Stanley, Atlas"
                    className={`mt-1.5 ${inputClasses} ${stepErrors[`member_${i}_name`] ? 'border-red-500/50' : ''}`}
                  />
                  {stepErrors[`member_${i}_name`] && (
                    <p className="mt-0.5 text-[11px] text-red-400">
                      {stepErrors[`member_${i}_name`]}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClasses}>Role *</label>
                  <input
                    value={m.role}
                    onChange={(e) => updateMember(i, 'role', e.target.value)}
                    maxLength={80}
                    placeholder="e.g. Lead coder, Ops watcher"
                    className={`mt-1.5 ${inputClasses} ${stepErrors[`member_${i}_role`] ? 'border-red-500/50' : ''}`}
                  />
                  {stepErrors[`member_${i}_role`] && (
                    <p className="mt-0.5 text-[11px] text-red-400">
                      {stepErrors[`member_${i}_role`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClasses}>Model</label>
                  <input
                    value={m.model}
                    onChange={(e) => updateMember(i, 'model', e.target.value)}
                    maxLength={80}
                    placeholder="e.g. claude-sonnet-4-5"
                    className={`mt-1.5 ${inputClasses}`}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Platform</label>
                  <input
                    value={m.platform}
                    onChange={(e) => updateMember(i, 'platform', e.target.value)}
                    maxLength={40}
                    placeholder={form.platform || 'Override team default'}
                    className={`mt-1.5 ${inputClasses}`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Tagline</label>
                <input
                  value={m.tagline}
                  onChange={(e) => updateMember(i, 'tagline', e.target.value)}
                  maxLength={200}
                  placeholder="One sentence: what does this agent do?"
                  className={`mt-1.5 ${inputClasses}`}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addMember}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-xs text-text-tertiary transition-colors hover:border-accent/40 hover:text-text-secondary"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add another member
        </button>

        <p className="text-[11px] text-text-tertiary">
          {form.members.length} member{form.members.length !== 1 ? 's' : ''} — agent_count will be
          set to {form.members.length} automatically.
        </p>
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-5">
        <p className="text-xs text-text-secondary">
          Operational DNA — why this configuration works, how it was built, and how it is overseen.
          Plans, not the house. Not files for sale.
        </p>
        <CharTextarea
          label="Why it works"
          id="bp-why"
          rows={4}
          maxLength={4000}
          placeholder="The architectural decisions that make this configuration effective for its domain."
          value={form.whyItWorks}
          onChange={(v) => setField('whyItWorks', v)}
        />
        <CharTextarea
          label="How it was built"
          id="bp-how"
          rows={4}
          maxLength={4000}
          placeholder="Runtime, memory model, routing logic, tool integrations — operational DNA."
          value={form.howBuilt}
          onChange={(v) => setField('howBuilt', v)}
        />
        <CharTextarea
          label="Oversight model"
          id="bp-oversight"
          rows={3}
          maxLength={2000}
          placeholder="What requires a human decision? What runs autonomously?"
          value={form.oversight}
          onChange={(v) => setField('oversight', v)}
          hint="Honest about automation limits — what can fail without a human catching it?"
        />
      </div>
    );
  }

  function renderStep5() {
    const topo = form.topologyType ? TOPOLOGY_LABELS[form.topologyType] : '—';
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-dashed border-border bg-surface-elevated/40 px-4 py-3 text-xs leading-relaxed text-text-secondary">
          <span className="font-semibold text-text-primary">Self-reported tier.</span> This
          submission lands as{' '}
          <span className="rounded bg-surface px-1 py-px font-mono text-[10px] text-text-primary">
            self_reported
          </span>{' '}
          — every claim is labeled as yours. Log proof entries with public evidence links after
          creation and the computed tier upgrades itself. Nothing is self-assignable.
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-surface-elevated/50 p-4">
          <h3 className="text-xs font-semibold text-text-secondary">Team</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
            <dt className={labelClasses.replace('block', '')}>Name</dt>
            <dd className="text-text-primary">{form.name || '—'}</dd>
            <dt className={labelClasses.replace('block', '')}>Tagline</dt>
            <dd className="text-text-secondary">{form.tagline || '—'}</dd>
            <dt className={labelClasses.replace('block', '')}>Topology</dt>
            <dd className="flex items-center gap-1.5 text-text-primary">
              {form.topologyType && (
                <TopologyGlyph topology={form.topologyType} size={14} className="text-accent" />
              )}
              {topo}
            </dd>
            <dt className={labelClasses.replace('block', '')}>Platform</dt>
            <dd className="text-text-secondary">{form.platform || '—'}</dd>
            <dt className={labelClasses.replace('block', '')}>Members</dt>
            <dd className="text-text-primary">{form.members.length}</dd>
            {form.industries.length > 0 && (
              <>
                <dt className={labelClasses.replace('block', '')}>Industries</dt>
                <dd className="text-text-secondary">{form.industries.join(', ')}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-surface-elevated/50 p-4">
          <h3 className="text-xs font-semibold text-text-secondary">
            Members ({form.members.length})
          </h3>
          {form.members.map((m, i) => (
            <div
              key={i}
              className="flex items-start gap-3 py-2 border-t border-border first:border-t-0"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
                {i + 1}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-primary">{m.name || '—'}</p>
                <p className="text-[11px] text-text-tertiary">
                  {m.role || '—'}
                  {m.model ? ` · ${m.model}` : ''}
                  {m.platform ? ` · ${m.platform}` : ''}
                </p>
                {m.tagline && <p className="mt-0.5 text-[11px] text-text-secondary">{m.tagline}</p>}
              </div>
            </div>
          ))}
        </div>

        {(form.whyItWorks || form.howBuilt || form.oversight) && (
          <div className="space-y-2 rounded-xl border border-border bg-surface-elevated/50 p-4">
            <h3 className="text-xs font-semibold text-text-secondary">Blueprint</h3>
            {form.whyItWorks && (
              <div>
                <p className={`${labelClasses}`}>Why it works</p>
                <p className="mt-0.5 text-xs text-text-secondary line-clamp-3">{form.whyItWorks}</p>
              </div>
            )}
            {form.howBuilt && (
              <div>
                <p className={`${labelClasses}`}>How built</p>
                <p className="mt-0.5 text-xs text-text-secondary line-clamp-3">{form.howBuilt}</p>
              </div>
            )}
            {form.oversight && (
              <div>
                <p className={`${labelClasses}`}>Oversight</p>
                <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{form.oversight}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1 rounded-xl border border-border bg-surface-elevated/50 p-4">
          <h3 className="mb-2 text-xs font-semibold text-text-secondary">Owner</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            <dt className={labelClasses.replace('block', '')}>Name</dt>
            <dd className="text-text-primary">{form.ownerName || '—'}</dd>
            <dt className={labelClasses.replace('block', '')}>Handle</dt>
            <dd className="font-mono text-text-secondary">@{form.ownerHandle || '—'}</dd>
          </dl>
        </div>
      </div>
    );
  }

  // ── Layout ─────────────────────────────────────────────────────────────

  const STEP_TITLES = [
    'Team identity',
    'Topology',
    'Member agents',
    'Blueprint',
    'Review & submit',
  ];

  const STEP_HINTS = [
    'Name, tagline, platform, and owner.',
    'Select the architectural pattern that describes your team.',
    'Add 1 or more agents — created atomically with the team.',
    'Operational DNA: why it works, how it was built. (Optional — adds depth.)',
    'Confirm everything looks right, then submit.',
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <nav className="mb-6 text-xs text-text-tertiary">
        <Link href="/register" className="hover:text-text-primary transition-colors">
          Register
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-text-secondary">Team</span>
      </nav>

      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
        Register a team
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{STEP_TITLES[step]}</h1>
      <p className="mt-1.5 text-sm text-text-secondary">{STEP_HINTS[step]}</p>

      {sessionUser && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5 text-xs text-text-secondary">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-accent"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>
            Signed in as{' '}
            <span className="font-medium text-text-primary">
              {sessionUser.name ?? sessionUser.email ?? 'you'}
            </span>{' '}
            — linked to your account.
          </span>
        </div>
      )}

      <div className="mt-6 mb-8">
        <StepperBar current={step} />
      </div>

      <div className="rounded-xl border border-border bg-surface-elevated/30 p-5 sm:p-6">
        {step === 0 && renderStep1()}
        {step === 1 && renderStep2()}
        {step === 2 && renderStep3()}
        {step === 3 && renderStep4()}
        {step === 4 && renderStep5()}
      </div>

      {globalError && (
        <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-400">
          {globalError}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-accent/40 hover:text-text-primary disabled:opacity-50"
            >
              ← Back
            </button>
          ) : (
            <Link
              href="/register"
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-accent/40 hover:text-text-primary"
            >
              ← Chooser
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-tertiary">
            Step {step + 1} of {STEP_LABELS.length}
          </span>
          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-accent-button px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-button-hover"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-accent-button px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-button-hover disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit team'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
