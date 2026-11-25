import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TabId } from '../data/studioData';
import { fmt, useLanguage } from '../i18n/LanguageContext';

interface SideScrollBarProps {
  activeTab: TabId;
}

export const SideScrollBar: React.FC<SideScrollBarProps> = ({ activeTab }) => {
  const { ui } = useLanguage();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const thumbRatioRef = useRef(0.22);
  const rafRef = useRef(0);
  const [isEngaged, setIsEngaged] = useState(false);
  const [hasScroll, setHasScroll] = useState(false);

  const syncThumbDom = useCallback(() => {
    const doc = document.documentElement;
    const scrollHeight = Math.max(doc.scrollHeight, document.body.scrollHeight);
    const clientHeight = window.innerHeight || doc.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 32) {
      setHasScroll((prev) => (prev ? false : prev));
      return;
    }

    setHasScroll((prev) => (prev ? prev : true));

    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
    const thumbRatio = Math.min(0.65, Math.max(0.12, clientHeight / scrollHeight));
    thumbRatioRef.current = thumbRatio;

    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (track && thumb) {
      const trackHeight = track.clientHeight || 1;
      const thumbHeightPx = Math.max(24, trackHeight * thumbRatio);
      const maxOffsetPx = Math.max(0, trackHeight - thumbHeightPx);
      thumb.style.height = `${thumbHeightPx}px`;
      thumb.style.transform = `translate3d(0, ${progress * maxOffsetPx}px, 0)`;
      track.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    }
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      syncThumbDom();
    });
  }, [syncThumbDom]);

  useEffect(() => {
    syncThumbDom();
    const t1 = window.setTimeout(syncThumbDom, 120);
    const t2 = window.setTimeout(syncThumbDom, 320);

    window.addEventListener('scroll', scheduleMeasure, { passive: true });
    window.addEventListener('resize', scheduleMeasure, { passive: true });

    const ro = new ResizeObserver(() => scheduleMeasure());
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('scroll', scheduleMeasure);
      window.removeEventListener('resize', scheduleMeasure);
      ro.disconnect();
    };
  }, [activeTab, scheduleMeasure, syncThumbDom]);

  const scrollToRatio = useCallback((ratio: number) => {
    const clamped = Math.min(1, Math.max(0, ratio));
    const doc = document.documentElement;
    const maxScroll = Math.max(
      0,
      Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight
    );
    window.scrollTo({ top: clamped * maxScroll, behavior: 'auto' });
  }, []);

  const updateFromPointerY = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (rect.height <= 0) return;
      const thumbHeight = rect.height * thumbRatioRef.current;
      const usableSpan = Math.max(1, rect.height - thumbHeight);
      const offset = clientY - rect.top - thumbHeight / 2;
      scrollToRatio(offset / usableSpan);
    },
    [scrollToRatio]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    setIsEngaged(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointerY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromPointerY(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsEngaged(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const step = Math.round(window.innerHeight * 0.4);
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      window.scrollBy({ top: step, behavior: reduced ? 'auto' : 'smooth' });
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      window.scrollBy({ top: -step, behavior: reduced ? 'auto' : 'smooth' });
    } else if (e.key === 'Home') {
      e.preventDefault();
      scrollToRatio(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      scrollToRatio(1);
    }
  };

  if (!hasScroll) return null;

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={ui.scrollbar.ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-valuetext={fmt(ui.scrollbar.pagePct, { pct: 0 })}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => setIsEngaged(true)}
      onPointerLeave={() => {
        if (!draggingRef.current) setIsEngaged(false);
      }}
      onKeyDown={handleKeyDown}
      className="fixed right-0.5 top-[calc(50%+16px)] -translate-y-1/2 z-20 w-5 h-[68vh] max-h-[calc(100vh-195px)] flex justify-end pr-0.5 cursor-grab active:cursor-grabbing touch-none select-none"
    >
      <div
        className={`relative h-full rounded-full transition-[width,opacity] duration-150 ${
          isEngaged ? 'w-[5px] opacity-95' : 'w-[3px] opacity-35'
        }`}
        style={{
          background: 'rgba(128, 128, 128, 0.22)',
        }}
      >
        <div
          ref={thumbRef}
          className="absolute top-0 inset-x-0 rounded-full will-change-transform"
          style={{
            height: '22%',
            transform: 'translate3d(0, 0, 0)',
            background: isEngaged ? 'var(--r)' : 'var(--border-strong)',
          }}
        />
      </div>
    </div>
  );
};
