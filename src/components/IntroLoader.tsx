import React, { useEffect, useRef, useState } from 'react';
import { STUDIO_LOGO_URI } from '../assets/studioMedia';
import introBgUrl from '../assets/intro-collage-bg.webp';
import { useLanguage } from '../i18n/LanguageContext';

interface IntroLoaderProps {
  studioName?: string;
  logoUrl?: string;
  onComplete: () => void;
}

export const IntroLoader: React.FC<IntroLoaderProps> = ({
  studioName = 'Schullz',
  logoUrl,
  onComplete,
}) => {
  const { ui } = useLanguage();
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const barFillRef = useRef<HTMLDivElement | null>(null);
  const lastPctRef = useRef(-1);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 450 : 1850;
    const startTime = performance.now();
    let rafId = 0;
    let exitTimer = 0;
    let doneTimer = 0;

    const triggerExit = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (barFillRef.current) {
        barFillRef.current.style.transform = 'scaleX(1)';
      }
      setProgress(100);
      exitTimer = window.setTimeout(() => {
        setIsExiting(true);
        doneTimer = window.setTimeout(() => {
          onCompleteRef.current();
        }, reducedMotion ? 80 : 340);
      }, reducedMotion ? 60 : 180);
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Smooth cubic ease-out running at native display refresh rate (60/120Hz)
      const eased = 1 - Math.pow(1 - t, 2.4);
      if (barFillRef.current) {
        barFillRef.current.style.transform = `scaleX(${eased})`;
      }
      const pct = Math.min(100, Math.round(eased * 100));
      if (pct !== lastPctRef.current) {
        lastPctRef.current = pct;
        setProgress(pct);
      }

      if (t < 1 && !finishedRef.current) {
        rafId = requestAnimationFrame(tick);
      } else {
        triggerExit();
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(rafId);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  const handleSkip = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setProgress(100);
    setIsExiting(true);
    window.setTimeout(() => {
      onCompleteRef.current();
    }, 280);
  };

  const displayWordmark = studioName.trim().toLowerCase().startsWith('schullz')
    ? 'Schullz'
    : studioName;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ui.intro.dialogAria}
      className={`intro-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6 py-8 ${
        isExiting ? 'is-exiting' : ''
      }`}
      style={{
        backgroundColor: '#090909',
        color: '#f7f4ee',
      }}
    >
      {/* Background Collage Image behind Logo & Loading Bar */}
      <img
        src={introBgUrl}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center select-none"
      />

      {/* Contrast Scrim & Subtle Radial Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(9, 9, 9, 0.72) 0%, rgba(9, 9, 9, 0.52) 45%, rgba(9, 9, 9, 0.80) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(242, 41, 41, 0.16) 0%, rgba(255, 210, 122, 0.06) 38%, transparent 72%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center space-y-6">
        {/* Studio Logo inside Dual Ring */}
        <div className="intro-logo-wrap relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute -inset-2.5 rounded-full border-2 opacity-75"
            style={{ borderColor: '#ffd27a' }}
          />
          <img
            src={logoUrl || STUDIO_LOGO_URI}
            alt="Logo Schullz Ink Tattoo"
            className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover border-[3px] shadow-2xl"
            style={{
              borderColor: 'var(--r)',
              boxShadow: '0 16px 42px rgba(0, 0, 0, 0.78)',
            }}
          />
        </div>

        {/* Schullz Wordmark & Studio Tagline */}
        <div className="intro-text-wrap space-y-1.5">
          <h1
            className="f text-5xl sm:text-6xl leading-none tracking-wide drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)]"
            style={{ color: 'var(--r)' }}
          >
            {displayWordmark}
          </h1>
          <p
            className="text-sm sm:text-base font-bold tracking-[0.28em] uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
            style={{ color: '#ffd27a' }}
          >
            {ui.intro.tagline}
          </p>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-full space-y-2.5 pt-1">
          <div
            role="progressbar"
            aria-label={ui.intro.progressAria}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="w-full h-4 rounded-full overflow-hidden border p-0.5 backdrop-blur-sm shadow-xl"
            style={{
              backgroundColor: 'rgba(14, 14, 16, 0.88)',
              borderColor: 'rgba(255, 210, 122, 0.45)',
            }}
          >
            <div
              ref={barFillRef}
              className="w-full h-full rounded-full origin-left will-change-transform"
              style={{
                transform: 'scaleX(0)',
                background: 'linear-gradient(90deg, var(--r) 0%, #ffd27a 100%)',
              }}
            />
          </div>

          <div
            className="flex items-center justify-between px-2.5 py-1 rounded-md text-sm font-bold uppercase tracking-wider backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(9, 9, 9, 0.72)' }}
          >
            <span style={{ color: '#f7f4ee' }}>
              {progress < 100 ? ui.intro.loading : ui.intro.ready}
            </span>
            <span className="tabular-nums" style={{ color: '#ffd27a' }}>
              {progress}%
            </span>
          </div>
        </div>

        {/* Optional Quick Skip */}
        <button
          type="button"
          onClick={handleSkip}
          className="si-btn si-btn-sm mt-2 border-2 font-bold uppercase tracking-wider backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(12, 12, 14, 0.85)',
            borderColor: '#ffd27a',
            color: '#f7f4ee',
          }}
        >
          {ui.intro.enterNow}
        </button>
      </div>
    </div>
  );
};
