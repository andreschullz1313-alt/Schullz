import React, { useEffect, useState } from 'react';
import { CheckSquare, RotateCcw, Square } from 'lucide-react';
import { fmt, useLanguage } from '../i18n/LanguageContext';

interface CareStepMeta {
  id: string;
  phase: '1-2' | '3-14' | '15-30';
}

const HEALING_STEPS_META: CareStepMeta[] = [
  { id: 'remove-wrap', phase: '1-2' },
  { id: 'wash-gentle', phase: '1-2' },
  { id: 'dry-paper', phase: '1-2' },
  { id: 'apply-ointment', phase: '3-14' },
  { id: 'no-picking', phase: '3-14' },
  { id: 'avoid-water-sun', phase: '3-14' },
  { id: 'loose-clothes', phase: '3-14' },
  { id: 'sunflower-oil', phase: '15-30' },
];

type PhaseFilter = 'all' | '1-2' | '3-14' | '15-30';

const STORAGE_KEY = 'schullz_healing_checklist_v1';

export const HealingGuide: React.FC = () => {
  const { domain } = useLanguage();
  const healing = domain.healing;

  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedIds));
    } catch {
      // ignore storage errors
    }
  }, [checkedIds]);

  const toggleStep = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const resetChecklist = () => {
    setCheckedIds([]);
  };

  const visibleSteps =
    phaseFilter === 'all'
      ? HEALING_STEPS_META
      : HEALING_STEPS_META.filter((s) => s.phase === phaseFilter);

  const completedCount = HEALING_STEPS_META.filter((s) => checkedIds.includes(s.id)).length;
  const progressPct = Math.round((completedCount / HEALING_STEPS_META.length) * 100);

  return (
    <div className="space-y-5 pt-4">
      <div className="torn" />

      <div className="space-y-2 pt-2">
        <div
          className="text-sm font-bold tracking-widest uppercase"
          style={{ color: 'var(--accent-gold)' }}
        >
          {healing.kicker}
        </div>
        <h2>{healing.title}</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {healing.lead}
        </p>
      </div>

      <div className="si-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="text-xl tabular-nums" style={{ color: 'var(--accent-gold)' }}>
              {fmt(healing.progressLabel, {
                done: completedCount,
                total: HEALING_STEPS_META.length,
                pct: progressPct,
              })}
            </strong>
          </div>
          {completedCount > 0 && (
            <button
              type="button"
              onClick={resetChecklist}
              className="si-btn si-btn-outline si-btn-sm"
            >
              <RotateCcw size={16} />
              {healing.resetBtn}
            </button>
          )}
        </div>

        <div
          className="w-full h-3.5 rounded-full overflow-hidden border"
          style={{ background: 'var(--card-alt)', borderColor: 'var(--border-subtle)' }}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              background: 'var(--pain-low)',
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label={healing.filterAria}>
          {(
            [
              ['all', healing.filters.all],
              ['1-2', healing.filters['1-2']],
              ['3-14', healing.filters['3-14']],
              ['15-30', healing.filters['15-30']],
            ] as [PhaseFilter, string][]
          ).map(([key, label]) => {
            const active = phaseFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPhaseFilter(key)}
                className="px-3.5 py-1.5 rounded border text-sm font-bold uppercase tracking-wider cursor-pointer"
                style={{
                  background: active ? 'var(--r)' : 'transparent',
                  color: active ? 'var(--btn-text)' : 'var(--text)',
                  borderColor: active ? 'var(--r)' : 'var(--border-strong)',
                  minHeight: '42px',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="space-y-2.5">
          {visibleSteps.map((step) => {
            const checked = checkedIds.includes(step.id);
            const localized = healing.steps[step.id];
            if (!localized) return null;
            return (
              <button
                key={step.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggleStep(step.id)}
                className="w-full text-left p-4 rounded border flex items-start gap-3.5 cursor-pointer transition-colors"
                style={{
                  background: checked ? 'var(--card-alt)' : 'transparent',
                  borderColor: checked ? 'var(--pain-low)' : 'var(--border-subtle)',
                  color: 'var(--text)',
                  minHeight: '48px',
                }}
              >
                <span
                  className="mt-0.5 shrink-0"
                  style={{ color: checked ? 'var(--pain-low-text)' : 'var(--accent-gold)' }}
                >
                  {checked ? <CheckSquare size={24} /> : <Square size={24} />}
                </span>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`font-bold text-lg ${checked ? 'line-through opacity-80' : ''}`}
                    >
                      {localized.title}
                    </span>
                    <span
                      className="text-sm font-bold uppercase tracking-wider"
                      style={{ color: checked ? 'var(--pain-low-text)' : 'var(--accent-gold)' }}
                    >
                      {checked
                        ? fmt(healing.doneBadge, { phase: localized.phaseLabel })
                        : localized.phaseLabel}
                    </span>
                  </div>
                  <p className="text-base" style={{ color: 'var(--text-muted)' }}>
                    {localized.detail}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
