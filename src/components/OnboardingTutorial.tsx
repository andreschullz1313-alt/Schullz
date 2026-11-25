import React, { useState } from 'react';
import {
  ArrowRight,
  Box,
  Calculator,
  Compass,
  FolderKanban,
  Instagram,
  SkipForward,
  UserCheck,
  X,
} from 'lucide-react';
import { APP_VERSION, NavigateTarget } from '../data/studioData';
import { fmt, useLanguage } from '../i18n/LanguageContext';

const STEP_META: { id: string; target: NavigateTarget; icon: React.ReactNode }[] = [
  { id: 'login', target: 'indicacao', icon: <UserCheck size={24} aria-hidden="true" /> },
  { id: 'portfolio', target: 'portfolio', icon: <Instagram size={24} aria-hidden="true" /> },
  { id: 'mapa3d', target: 'mapa', icon: <Box size={24} aria-hidden="true" /> },
  { id: 'orcamento', target: 'orcamento', icon: <Calculator size={24} aria-hidden="true" /> },
  { id: 'central', target: 'central', icon: <FolderKanban size={24} aria-hidden="true" /> },
];

interface OnboardingTutorialProps {
  open: boolean;
  reason: 'first' | 'update' | 'manual';
  onClose: () => void;
  onNavigate: (target: NavigateTarget) => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  open,
  reason,
  onClose,
  onNavigate,
}) => {
  const { ui } = useLanguage();
  const [stepIdx, setStepIdx] = useState(0);

  if (!open) return null;

  const steps = ui.tutorial.steps;
  const step = steps[stepIdx] ?? steps[0];
  const meta = STEP_META[stepIdx] ?? STEP_META[0];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;

  const handleGoToStepTab = () => {
    onNavigate(meta.target);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: 'rgba(6, 6, 8, 0.84)' }}
    >
      <div
        className="si-card w-full max-w-xl space-y-5 shadow-2xl tab-stagger-block"
        style={{
          borderColor: 'var(--r)',
          background: 'var(--card)',
        }}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between gap-3 pb-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center border shrink-0"
              style={{
                borderColor: 'var(--r)',
                background: 'var(--card-alt)',
                color: 'var(--r)',
              }}
            >
              <Compass size={19} aria-hidden="true" />
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)' }}>
                {reason === 'update'
                  ? fmt(ui.tutorial.updateBadge, { version: APP_VERSION })
                  : reason === 'manual'
                  ? ui.tutorial.manualBadge
                  : ui.tutorial.firstBadge}
              </div>
              <div className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                {step.stepNum} · {step.routeTag}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={ui.tutorial.skipAria}
            className="p-2 rounded border cursor-pointer"
            style={{
              borderColor: 'var(--border-strong)',
              color: 'var(--text)',
              minWidth: '40px',
              minHeight: '40px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Indicator Dots/Segments */}
        <div className="grid grid-cols-5 gap-2" aria-hidden="true">
          {steps.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStepIdx(idx)}
              className="h-2 rounded-full cursor-pointer border-0 transition-all"
              style={{
                background:
                  idx === stepIdx
                    ? 'var(--r)'
                    : idx < stepIdx
                    ? 'var(--accent-gold)'
                    : 'var(--border-subtle)',
              }}
              aria-label={fmt(ui.tutorial.goToStepPrefix, { step: item.stepNum })}
            />
          ))}
        </div>

        {/* Active Step Content */}
        <div key={step.id} className="space-y-4 tab-stagger-block">
          <div className="flex items-start gap-3.5">
            <span
              className="p-3 rounded-lg border shrink-0"
              style={{
                background: 'var(--card-alt)',
                borderColor: 'var(--r)',
                color: 'var(--r)',
              }}
            >
              {meta.icon}
            </span>
            <div className="space-y-1.5">
              <h2 id="tutorial-modal-title" className="text-2xl sm:text-3xl m-0" style={{ color: 'var(--text)' }}>
                {step.title}
              </h2>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {step.description}
              </p>
            </div>
          </div>

          {/* Direction Hint Box */}
          <div
            className="p-3.5 rounded-md border space-y-2"
            style={{
              background: 'var(--card-alt)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <p className="text-sm sm:text-base font-semibold m-0" style={{ color: 'var(--text)' }}>
              {step.nextHint}
            </p>
            <button
              type="button"
              onClick={handleGoToStepTab}
              className="si-btn si-btn-outline si-btn-sm"
            >
              {step.targetLabel}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Footer Controls with Skip option */}
        <div
          className="pt-3 border-t flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded font-bold text-sm uppercase tracking-wider cursor-pointer bg-transparent border"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
              minHeight: '44px',
            }}
          >
            <SkipForward size={16} aria-hidden="true" />
            {ui.tutorial.skipBtn}
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                className="si-btn si-btn-outline si-btn-sm"
              >
                {ui.tutorial.prevBtn}
              </button>
            )}
            {!isLast ? (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
                className="si-btn si-btn-sm"
              >
                {ui.tutorial.nextBtn}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" onClick={onClose} className="si-btn si-btn-sm">
                {ui.tutorial.finishBtn}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
