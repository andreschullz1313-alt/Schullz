import React, { useEffect, useState } from 'react';
import { CheckSquare, Droplets, RotateCcw, Square, Utensils } from 'lucide-react';
import { NavigateTarget } from '../data/studioData';
import { fmt, useLanguage } from '../i18n/LanguageContext';

interface PrepStepMeta {
  id: string;
  phase: '48h' | 'dia' | 'saida';
}

const PREP_STEPS_META: PrepStepMeta[] = [
  { id: 'water-intake', phase: '48h' },
  { id: 'skin-moisturize', phase: '48h' },
  { id: 'no-alcohol-sun', phase: '48h' },
  { id: 'good-sleep', phase: '48h' },
  { id: 'solid-meal', phase: 'dia' },
  { id: 'morning-water', phase: 'dia' },
  { id: 'clean-skin', phase: 'dia' },
  { id: 'snacks-bottle', phase: 'saida' },
  { id: 'clothes-docs', phase: 'saida' },
];

type PrepPhaseFilter = 'all' | '48h' | 'dia' | 'saida';

const STORAGE_KEY = 'schullz_prep_checklist_v1';

interface PrepGuideProps {
  onNavigateTab?: (tab: NavigateTarget) => void;
}

export const PrepGuide: React.FC<PrepGuideProps> = ({ onNavigateTab }) => {
  const { domain } = useLanguage();
  const prep = domain.prep;

  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [phaseFilter, setPhaseFilter] = useState<PrepPhaseFilter>('all');

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
      ? PREP_STEPS_META
      : PREP_STEPS_META.filter((s) => s.phase === phaseFilter);

  const completedCount = PREP_STEPS_META.filter((s) => checkedIds.includes(s.id)).length;
  const progressPct = Math.round((completedCount / PREP_STEPS_META.length) * 100);

  return (
    <section className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <div
          className="text-sm font-bold tracking-widest uppercase"
          style={{ color: 'var(--accent-gold)' }}
        >
          {prep.kicker}
        </div>
        <h2>{prep.title}</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {prep.lead}
        </p>
      </div>

      {/* Hydration & Nutrition Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="si-card flex items-start gap-3.5">
          <span
            className="p-2.5 rounded border shrink-0"
            style={{
              background: 'var(--card-alt)',
              borderColor: 'var(--border-strong)',
              color: 'var(--accent-gold)',
            }}
          >
            <Droplets size={22} />
          </span>
          <div className="space-y-1">
            <h3 style={{ color: 'var(--accent-gold)' }}>{prep.pillar1Title}</h3>
            <p className="text-base" style={{ color: 'var(--text)' }}>
              {prep.pillar1Body}
            </p>
          </div>
        </div>

        <div className="si-card flex items-start gap-3.5">
          <span
            className="p-2.5 rounded border shrink-0"
            style={{
              background: 'var(--card-alt)',
              borderColor: 'var(--border-strong)',
              color: 'var(--pain-low-text)',
            }}
          >
            <Utensils size={22} />
          </span>
          <div className="space-y-1">
            <h3 style={{ color: 'var(--pain-low-text)' }}>{prep.pillar2Title}</h3>
            <p className="text-base" style={{ color: 'var(--text)' }}>
              {prep.pillar2Body}
            </p>
          </div>
        </div>
      </div>

      {/* Checklist Card */}
      <div className="si-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="text-xl tabular-nums" style={{ color: 'var(--accent-gold)' }}>
              {fmt(prep.progressLabel, {
                done: completedCount,
                total: PREP_STEPS_META.length,
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
              {prep.resetBtn}
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

        <div className="flex flex-wrap gap-2" role="group" aria-label={prep.filterAria}>
          {(
            [
              ['all', prep.filters.all],
              ['48h', prep.filters['48h']],
              ['dia', prep.filters.dia],
              ['saida', prep.filters.saida],
            ] as [PrepPhaseFilter, string][]
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
                  minHeight: '44px',
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
            const localized = prep.steps[step.id];
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
                        ? fmt(prep.doneBadge, { phase: localized.phaseLabel })
                        : `${localized.categoryTag} · ${localized.phaseLabel}`}
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

        {onNavigateTab && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>
              {prep.nextHint}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="si-btn si-btn-sm"
                onClick={() => onNavigateTab('loja')}
              >
                {prep.aftercareBtn}
              </button>
              <button
                type="button"
                className="si-btn si-btn-outline si-btn-sm"
                onClick={() => onNavigateTab('orcamento')}
              >
                {prep.quoteBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
