'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TopologyGlyph, { TOPOLOGY_LABELS } from '@/components/TopologyGlyph';
import type { TopologyType } from '@/lib/db/types';

// ── Style constants ────────────────────────────────────────────────────────

const inputClasses =
  'w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none';

const labelClasses = 'block text-xs font-medium uppercase tracking-wide text-text-tertiary';

const selectClasses =
  'w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none appearance-none cursor-pointer';

// ── Topology options ───────────────────────────────────────────────────────

const TOPOLOGY_TYPES: TopologyType[] = [
  'hub_and_spoke',
  'pipeline',
  'peer',
  'hierarchical',
  'solo_plus_tools',
  'other',
];

// ── Tag input component ────────────────────────────────────────────────────

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
  const inputRef = useRef<HTMLInputElement>(null);

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

  function handleBlur() {
    if (draft.trim()) addTag(draft);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <p className="mt-0.5 text-[11px] text-text-tertiary">{hint}</p>
      <div
        className="mt-1.5 flex min-h-[40px] flex-wrap gap-1.5 rounded-lg border border-border bg-surface-elevated px-2 py-1.5 focus-within:border-accent cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-accent/60 hover:text-accent"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {tags.length < maxItems && (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={handleBlur}
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

// ── Char counter textarea ──────────────────────────────────────────────────

interface CharTextareaProps {
  label: string;
  name: string;
  rows?: number;
  maxLength: number;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}

function CharTextarea({
  label,
  name,
  rows = 4,
  maxLength,
  placeholder,
  value,
  onChange,
  hint,
}: CharTextareaProps) {
  const remaining = maxLength - value.length;
  const warn = remaining < maxLength * 0.1;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={name} className={labelClasses}>
          {label}
        </label>
        <span className={`text-[10px] ${warn ? 'text-amber-400' : 'text-text-tertiary'}`}>
          {remaining} chars remaining
        </span>
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-text-tertiary">{hint}</p>}
      <textarea
        id={name}
        name={name}
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

// ── Main page ──────────────────────────────────────────────────────────────

interface FieldErrors {
  [key: string]: string;
}

export default function SubmitPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');

  // Controlled state for complex fields
  const [topologyType, setTopologyType] = useState<TopologyType | ''>('');
  const [agentCount, setAgentCount] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [taskKinds, setTaskKinds] = useState<string[]>([]);
  const [whyItWorks, setWhyItWorks] = useState('');
  const [howBuilt, setHowBuilt] = useState('');
  const [oversight, setOversight] = useState('');
  const [topologyProse, setTopologyProse] = useState('');

  // Client-side validation mirroring server rules
  function validate(form: FormData): FieldErrors {
    const errs: FieldErrors = {};
    const name = (form.get('name') as string | null)?.trim() ?? '';
    const tagline = (form.get('tagline') as string | null)?.trim() ?? '';
    const ownerName = (form.get('ownerName') as string | null)?.trim() ?? '';
    const ownerHandle = (form.get('ownerHandle') as string | null)?.trim() ?? '';

    if (!name) errs['name'] = 'Name is required';
    else if (name.length > 80) errs['name'] = 'Name must be at most 80 characters';

    if (!tagline) errs['tagline'] = 'Tagline is required';
    else if (tagline.length > 200) errs['tagline'] = 'Tagline must be at most 200 characters';

    if (!ownerName) errs['ownerName'] = 'Owner display name is required';
    else if (ownerName.length > 80) errs['ownerName'] = 'Owner name must be at most 80 characters';

    if (!ownerHandle) errs['ownerHandle'] = 'Owner handle is required';
    else if (ownerHandle.length > 40) errs['ownerHandle'] = 'Handle must be at most 40 characters';

    const ac = agentCount.trim();
    if (ac) {
      const n = parseInt(ac, 10);
      if (!Number.isInteger(n) || n < 1 || n > 50)
        errs['agentCount'] = 'Agent count must be an integer between 1 and 50';
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setGlobalError('');
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      name: (form.get('name') as string).trim(),
      tagline: (form.get('tagline') as string).trim(),
      ownerName: (form.get('ownerName') as string).trim(),
      ownerHandle: (form.get('ownerHandle') as string).trim(),
    };

    if (topologyType) payload['topologyType'] = topologyType;

    const platformRaw = (form.get('platform') as string | null)?.trim();
    if (platformRaw) payload['platform'] = platformRaw;

    if (agentCount.trim()) payload['agentCount'] = parseInt(agentCount.trim(), 10);
    if (industries.length > 0) payload['industries'] = industries;
    if (taskKinds.length > 0) payload['taskKinds'] = taskKinds;
    if (topologyProse.trim()) payload['topology'] = topologyProse.trim();
    if (whyItWorks.trim()) payload['whyItWorks'] = whyItWorks.trim();
    if (howBuilt.trim()) payload['howBuilt'] = howBuilt.trim();
    if (oversight.trim()) payload['oversight'] = oversight.trim();

    const opSince = (form.get('operationalSince') as string | null)?.trim();
    if (opSince) payload['operationalSince'] = opSince;

    try {
      const res = await fetch('/api/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        slug?: string;
        error?: { message?: string; fields?: FieldErrors };
      };

      if (!res.ok || !data.slug) {
        if (data.error?.fields) {
          setFieldErrors(data.error.fields);
        } else {
          setGlobalError(data.error?.message ?? 'Submission failed');
        }
        setSubmitting(false);
        return;
      }
      router.push(`/configurations/${data.slug}`);
    } catch {
      setGlobalError('Network error');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
        Submit your configuration
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Register a configuration</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        Document a working agent harness — the role topology, platform, and evidence that makes it
        real.
      </p>

      {/* Honesty notice */}
      <div className="mt-5 rounded-lg border border-dashed border-border bg-surface-elevated/40 px-4 py-3 text-xs leading-relaxed text-text-secondary">
        <span className="font-semibold text-text-primary">Self-reported tier.</span> Submissions
        land as{' '}
        <span className="rounded bg-surface px-1 py-px font-mono text-[10px] text-text-primary">
          self_reported
        </span>{' '}
        — every claim is labeled as yours. Log proof entries with public evidence links after
        creation and the computed tier upgrades itself. Nothing is self-assignable.
      </div>

      {/* Section navigator — shows form structure from the fold */}
      <nav
        aria-label="Form sections"
        className="mt-6 flex flex-wrap items-center gap-x-0 divide-x divide-border overflow-hidden rounded-lg border border-border bg-surface-elevated/50 text-xs"
      >
        {(
          [
            { id: 'section-identity', label: 'Identity' },
            { id: 'section-comparable', label: 'Comparable fields' },
            { id: 'section-blueprint', label: 'Blueprint' },
            { id: 'section-owner', label: 'Owner' },
          ] as const
        ).map(({ id, label }, i) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex items-center gap-1.5 px-3 py-2 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[9px] font-semibold text-text-tertiary">
              {i + 1}
            </span>
            {label}
          </a>
        ))}
      </nav>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
        {/* ── Identity ── */}
        <section
          id="section-identity"
          className="space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5"
        >
          <h2 className="text-sm font-semibold">Identity</h2>

          <div>
            <label htmlFor="name" className={labelClasses}>
              Configuration name *
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={80}
              placeholder="e.g. Ari Collective, Research Pipeline Alpha"
              className={`mt-1.5 ${inputClasses} ${fieldErrors['name'] ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors['name'] && (
              <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['name']}</p>
            )}
          </div>

          <div>
            <label htmlFor="tagline" className={labelClasses}>
              Tagline *
            </label>
            <input
              id="tagline"
              name="tagline"
              required
              maxLength={200}
              placeholder="One sentence: what does it actually run?"
              className={`mt-1.5 ${inputClasses} ${fieldErrors['tagline'] ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors['tagline'] && (
              <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['tagline']}</p>
            )}
          </div>

          <div>
            <label htmlFor="operationalSince" className={labelClasses}>
              Operating since
            </label>
            <input
              id="operationalSince"
              name="operationalSince"
              type="text"
              inputMode="numeric"
              pattern="\d{4}-\d{2}-\d{2}"
              placeholder="YYYY-MM-DD"
              maxLength={10}
              className={`mt-1.5 ${inputClasses} font-mono`}
            />
            <p className="mt-0.5 text-[11px] text-text-tertiary">
              ISO format — e.g. 2024-03-15. Day is required.
            </p>
          </div>
        </section>

        {/* ── Comparable fields ── */}
        <section
          id="section-comparable"
          className="space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5"
        >
          <h2 className="text-sm font-semibold">Comparable fields</h2>
          <p className="text-[11px] text-text-tertiary">
            These are the benchmark fields — structured so configurations can be compared across
            topologies, platforms, and industries.
          </p>

          {/* Topology type */}
          <div>
            <label htmlFor="topologyType" className={labelClasses}>
              Topology type
            </label>
            <div className="relative mt-1.5">
              <select
                id="topologyType"
                value={topologyType}
                onChange={(e) => setTopologyType(e.target.value as TopologyType | '')}
                className={selectClasses}
              >
                <option value="">— select topology —</option>
                {TOPOLOGY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TOPOLOGY_LABELS[t]}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-tertiary">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path
                    d="M2 4l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            {topologyType && (
              <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                <TopologyGlyph topology={topologyType} size={16} className="text-accent" />
                <span>{TOPOLOGY_LABELS[topologyType]}</span>
              </div>
            )}
          </div>

          {/* Platform + agent count */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="platform" className={labelClasses}>
                Platform
              </label>
              <input
                id="platform"
                name="platform"
                maxLength={60}
                placeholder="OpenClaw, Claude Code, LangGraph…"
                className={`mt-1.5 ${inputClasses}`}
              />
            </div>
            <div>
              <label htmlFor="agentCount" className={labelClasses}>
                Agent count
              </label>
              <input
                id="agentCount"
                name="agentCount"
                type="number"
                min={1}
                max={50}
                placeholder="1–50"
                value={agentCount}
                onChange={(e) => setAgentCount(e.target.value)}
                className={`mt-1.5 ${inputClasses} ${fieldErrors['agentCount'] ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors['agentCount'] && (
                <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['agentCount']}</p>
              )}
            </div>
          </div>

          {/* Industries */}
          <TagInput
            label="Industries"
            hint="What domain does this run in? e.g. software-delivery, research, ops"
            tags={industries}
            onChange={setIndustries}
          />

          {/* Task kinds */}
          <TagInput
            label="Task kinds"
            hint="What work does it actually do? e.g. code-review, incident-response, data-pipeline"
            tags={taskKinds}
            onChange={setTaskKinds}
          />

          {/* Topology prose */}
          <div>
            <label htmlFor="topology" className={labelClasses}>
              Topology description
            </label>
            <p className="mt-0.5 text-[11px] text-text-tertiary">
              Prose summary of the role topology — who orchestrates, who specializes, how they
              interact.
            </p>
            <textarea
              id="topology"
              name="topology"
              rows={3}
              maxLength={2000}
              placeholder="e.g. Ari orchestrates; Stanley handles code; Arthur handles ops monitoring."
              value={topologyProse}
              onChange={(e) => setTopologyProse(e.target.value)}
              className={`mt-1.5 ${inputClasses} resize-y`}
            />
          </div>
        </section>

        {/* ── Blueprint ── */}
        <section
          id="section-blueprint"
          className="space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5"
        >
          <h2 className="text-sm font-semibold">Blueprint</h2>
          <p className="text-[11px] text-text-tertiary">
            Operational DNA: why this configuration works, how it was built, and how it is overseen.
            Plans, not the house — not files for sale.
          </p>

          <CharTextarea
            label="Why it works"
            name="whyItWorks"
            rows={4}
            maxLength={4000}
            placeholder="The architectural decisions that make this configuration effective for its domain."
            value={whyItWorks}
            onChange={setWhyItWorks}
          />

          <CharTextarea
            label="How it was built"
            name="howBuilt"
            rows={4}
            maxLength={4000}
            placeholder="Runtime, memory model, routing logic, tool integrations — operational DNA."
            value={howBuilt}
            onChange={setHowBuilt}
          />

          <CharTextarea
            label="Oversight model"
            name="oversight"
            rows={3}
            maxLength={2000}
            placeholder="What requires a human decision? What runs autonomously?"
            value={oversight}
            onChange={setOversight}
          />
        </section>

        {/* ── Owner ── */}
        <section
          id="section-owner"
          className="space-y-4 rounded-xl border border-border bg-surface-elevated/50 p-5"
        >
          <h2 className="text-sm font-semibold">Owner</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ownerName" className={labelClasses}>
                Display name *
              </label>
              <input
                id="ownerName"
                name="ownerName"
                required
                maxLength={80}
                placeholder="Your name or org"
                className={`mt-1.5 ${inputClasses} ${fieldErrors['ownerName'] ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors['ownerName'] && (
                <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['ownerName']}</p>
              )}
            </div>
            <div>
              <label htmlFor="ownerHandle" className={labelClasses}>
                Handle *
              </label>
              <input
                id="ownerHandle"
                name="ownerHandle"
                required
                maxLength={40}
                placeholder="lowercase-no-spaces"
                className={`mt-1.5 ${inputClasses} ${fieldErrors['ownerHandle'] ? 'border-red-500/50' : ''}`}
              />
              {fieldErrors['ownerHandle'] && (
                <p className="mt-0.5 text-[11px] text-red-400">{fieldErrors['ownerHandle']}</p>
              )}
            </div>
          </div>

          <p className="text-xs text-text-tertiary">
            Existing handles attach this configuration to that owner. New handles create a new owner
            page. Auth and ownership claiming are a later phase.
          </p>
        </section>

        {globalError && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-400">
            {globalError}
          </p>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit configuration'}
          </button>
          <p className="text-xs text-text-tertiary">
            Lands as{' '}
            <span className="font-mono text-[10px] text-text-secondary">self_reported</span> · tier
            upgrades with proof entries
          </p>
        </div>
      </form>
    </div>
  );
}
