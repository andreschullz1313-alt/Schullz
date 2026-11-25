import React, { useEffect, useState } from 'react';
import { RefreshCw, Wifi } from 'lucide-react';
import griffinLogoDataUri from '../assets/schullz-griffin-logo.jpg?inline';
import { useLanguage } from '../i18n/LanguageContext';

interface OfflineGlitchScreenProps {
  phase: 'offline' | 'welcoming';
  onReconnect: () => void;
  onWelcomeComplete: () => void;
}

export const OfflineGlitchScreen: React.FC<OfflineGlitchScreenProps> = ({
  phase,
  onReconnect,
  onWelcomeComplete,
}) => {
  const { ui } = useLanguage();
  const [checking, setChecking] = useState(false);
  const [stillOfflineMsg, setStillOfflineMsg] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (phase !== 'welcoming') {
      setShowWelcome(false);
      setExiting(false);
      return;
    }

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const showTimer = window.setTimeout(() => {
      setShowWelcome(true);
    }, reduced ? 20 : 360);

    const exitTimer = window.setTimeout(() => {
      setExiting(true);
    }, reduced ? 700 : 2150);

    const doneTimer = window.setTimeout(() => {
      onWelcomeComplete();
    }, reduced ? 900 : 2520);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [phase, onWelcomeComplete]);

  const handleRetry = async () => {
    setChecking(true);
    setStillOfflineMsg(false);
    try {
      if (navigator.onLine) {
        const res = await fetch('/manifest.webmanifest', {
          method: 'HEAD',
          cache: 'no-store',
        });
        if (res.ok) {
          onReconnect();
          return;
        }
      }
      setStillOfflineMsg(true);
    } catch {
      if (navigator.onLine) {
        onReconnect();
        return;
      }
      setStillOfflineMsg(true);
    } finally {
      setChecking(false);
    }
  };

  const handleEnterNow = () => {
    setExiting(true);
    window.setTimeout(() => {
      onWelcomeComplete();
    }, 240);
  };

  const isWelcoming = phase === 'welcoming';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={isWelcoming ? 'reconnect-welcome-title' : 'offline-glitch-title'}
      aria-describedby={isWelcoming ? 'reconnect-welcome-desc' : 'offline-glitch-desc'}
      className={`offline-screen-overlay fixed inset-0 z-[110] flex flex-col items-center justify-center px-5 py-6 overflow-hidden select-none ${
        exiting ? 'is-exiting' : ''
      }`}
      style={{
        backgroundColor: '#171717',
        color: '#f7f4ee',
      }}
    >
      {/* Subtle CRT / scanline texture overlay */}
      <div aria-hidden="true" className="glitch-crt-overlay pointer-events-none absolute inset-0" />

      {/* OFFLINE GLITCH STAGE — smoothly vanishes when connection returns */}
      {!showWelcome && (
        <div
          className={`glitch-offline-stage relative z-10 w-full max-w-md flex flex-col items-center text-center space-y-5 ${
            isWelcoming ? 'is-vanishing' : ''
          }`}
        >
          {/* Glitched Complete Schullz Griffin Logo (inline data URI — zero network dependency) */}
          <div
            className="glitch-logo-stage relative w-72 sm:w-80 aspect-[520/493] flex items-center justify-center overflow-hidden"
            style={{
              WebkitMaskImage: 'radial-gradient(ellipse 96% 96% at 50% 50%, #000 84%, transparent 100%)',
              maskImage: 'radial-gradient(ellipse 96% 96% at 50% 50%, #000 84%, transparent 100%)',
            }}
          >
            <img
              src={griffinLogoDataUri}
              alt="Schullz Ink Tattoo"
              decoding="sync"
              loading="eager"
              className="glitch-logo-base w-full h-full object-contain block"
            />
            <img
              src={griffinLogoDataUri}
              alt=""
              aria-hidden="true"
              decoding="sync"
              loading="eager"
              className="glitch-logo-layer glitch-logo-cyan w-full h-full object-contain block"
            />
            <img
              src={griffinLogoDataUri}
              alt=""
              aria-hidden="true"
              decoding="sync"
              loading="eager"
              className="glitch-logo-layer glitch-logo-gold w-full h-full object-contain block"
            />
            <div aria-hidden="true" className="glitch-slice-bar glitch-slice-1" />
            <div aria-hidden="true" className="glitch-slice-bar glitch-slice-2" />
            <div aria-hidden="true" className="glitch-slice-bar glitch-slice-3" />
          </div>

          {/* Glitched Headline with static glitch bars */}
          <div className="glitch-banner relative w-full py-2 flex items-center justify-center">
            <div aria-hidden="true" className="glitch-noise-strip glitch-noise-top" />
            <div aria-hidden="true" className="glitch-noise-strip glitch-noise-bottom" />
            <h1
              id="offline-glitch-title"
              data-text={ui.offline.headline}
              className="f glitch-headline relative z-10 text-4xl sm:text-5xl tracking-[0.06em] uppercase"
            >
              {ui.offline.headline}
            </h1>
          </div>

          <p
            id="offline-glitch-desc"
            className="text-base sm:text-lg font-semibold tracking-[0.12em] uppercase"
            style={{ color: '#dedbd4' }}
          >
            {ui.offline.subtitle}
          </p>

          {/* Retry action */}
          <div className="pt-1 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleRetry}
              disabled={checking || isWelcoming}
              className="si-btn"
              style={{
                background: '#F22929',
                borderColor: '#F22929',
                color: '#0a0a0a',
              }}
            >
              <RefreshCw size={18} className={checking ? 'animate-spin' : ''} aria-hidden="true" />
              {checking ? ui.offline.checking : ui.offline.retry}
            </button>

            {stillOfflineMsg && (
              <span className="text-sm font-semibold" style={{ color: '#ffd27a' }}>
                {ui.offline.stillOffline}
              </span>
            )}
          </div>
        </div>
      )}

      {/* RECONNECTION WELCOME STAGE — Neon Red greeting after griffin fades out */}
      {isWelcoming && showWelcome && (
        <div
          role="status"
          aria-live="polite"
          className="reconnect-welcome-stage relative z-20 w-full max-w-lg flex flex-col items-center text-center space-y-5 px-4"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center border-2"
            style={{
              borderColor: '#ff3838',
              background: 'rgba(242, 41, 41, 0.14)',
              boxShadow: '0 0 28px rgba(255, 41, 41, 0.55), inset 0 0 14px rgba(255, 41, 41, 0.25)',
              color: '#ff4f4f',
            }}
          >
            <Wifi size={30} aria-hidden="true" />
          </div>

          <div className="space-y-3">
            <h1
              id="reconnect-welcome-title"
              className="f neon-red-title text-4xl sm:text-6xl tracking-[0.08em] uppercase"
            >
              {ui.offline.welcomeTitle}
            </h1>
            <div className="neon-red-divider mx-auto" aria-hidden="true" />
          </div>

          <p
            id="reconnect-welcome-desc"
            className="text-base sm:text-lg font-semibold tracking-[0.14em] uppercase"
            style={{ color: '#f7f4ee' }}
          >
            {ui.offline.welcomeDesc}
          </p>

          <button
            type="button"
            onClick={handleEnterNow}
            className="si-btn si-btn-sm mt-2"
            style={{
              background: 'transparent',
              borderColor: '#ff3838',
              color: '#ff6b6b',
              boxShadow: '0 0 16px rgba(255, 41, 41, 0.35)',
            }}
          >
            {ui.offline.enterApp}
          </button>
        </div>
      )}
    </div>
  );
};
