/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { ArrowUp, ChevronLeft, ChevronRight, Lock, Menu, RefreshCw, Settings, Share2, X } from 'lucide-react';
import {
  ANAMNESE_QUESTIONS,
  APP_VERSION,
  CATEGORIES,
  FolderId,
  formatBRL,
  NavigateTarget,
  PORTFOLIO_WORKS,
  PortfolioWork,
  PRICE_GROUPS,
  TabId,
  TABS,
  TUTORIAL_VERSION_KEY,
} from './data/studioData';
import { AuthGateTab, ClientUser, SavedQuote } from './components/AuthGateTab';
import { PainMap3D } from './components/PainMap3D';
import { QuoteSection } from './components/QuoteSection';
import { FontScale, SettingsDrawer } from './components/SettingsDrawer';
import { GuestInstallModal, ShareInstallPanel } from './components/ShareInstallModal';
import { IntroLoader } from './components/IntroLoader';
import { SideScrollBar } from './components/SideScrollBar';
import { OfflineGlitchScreen } from './components/OfflineGlitchScreen';
import { InstagramFeed } from './components/InstagramFeed';
import { PortfolioGallery } from './components/PortfolioGallery';
import { StudioFoldersHub } from './components/StudioFoldersHub';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { AdminPanelModal, AdminSectionTab } from './components/AdminPanelModal';
import { ErrorNotificationBar } from './components/ErrorNotificationBar';
import { MonthlyPromoBanner } from './components/MonthlyPromoBanner';
import { ScheduleTab } from './components/ScheduleTab';
import { STUDIO_LOGO_URI } from './assets/studioMedia';
import { fmt, LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { DEFAULT_LANGUAGE, isValidLanguageCode, LanguageCode } from './i18n/types';
import { UI_TRANSLATIONS } from './i18n/uiTranslations';
import { auth } from './firebase';
import { clearAppIssuesByCategory, setMonitorLogoUrl } from './services/appMonitor';
import { readVerifiedStorage, writeSignedStorage } from './services/securityGuard';
import {
  FaqItemRecord,
  fetchFaqItemsOnce,
  getCachedFaqItems,
  subscribeToFaqItems,
} from './services/faqService';
import {
  fetchScheduleSlotsOnce,
  ScheduleSlotRecord,
  subscribeToScheduleSlots,
} from './services/scheduleService';
import {
  applyRemoteThemeAndLogo,
  DEFAULT_FULL_SLEEVE_NOTE,
  DEFAULT_REMOTE_CONFIG,
  EditablePriceItem,
  fetchStudioConfigOnce,
  hydrateCachedRemoteConfig,
  isAuthorizedAdminUser,
  RemoteStudioConfig,
  subscribeToStudioConfig,
} from './services/studioSync';

const SESSION_KEY = 'schullz_active_client_v1';
const QUOTES_KEY = 'schullz_saved_quotes_v1';
const SETTINGS_KEY = 'schullz_studio_settings_v1';
const PREFS_KEY = 'schullz_a11y_prefs_v1';

interface A11yPrefs {
  isDark: boolean;
  fontScale: FontScale;
  highContrast: boolean;
  language: LanguageCode;
}

function readLocalPrefs(): A11yPrefs {
  const raw = readVerifiedStorage<Partial<A11yPrefs>>(PREFS_KEY, {});
  return {
    isDark: typeof raw.isDark === 'boolean' ? raw.isDark : true,
    fontScale:
      raw.fontScale === 'large' || raw.fontScale === 'xlarge' ? raw.fontScale : 'normal',
    highContrast: Boolean(raw.highContrast),
    language: isValidLanguageCode(raw.language) ? raw.language : DEFAULT_LANGUAGE,
  };
}

function generatePublicCoupon(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SCHULLZ20-${suffix}`;
}

interface AppContentProps {
  prefs: A11yPrefs;
  setPrefs: React.Dispatch<React.SetStateAction<A11yPrefs>>;
  onChangeLanguage: (lang: LanguageCode) => void;
  toastMsg: string | null;
  showToast: (msg: string) => void;
}

const AppContent: React.FC<AppContentProps> = ({
  prefs,
  setPrefs,
  onChangeLanguage,
  toastMsg,
  showToast,
}) => {
  const { lang, ui, domain, tCategory, tWorkTitle } = useLanguage();
  const prefersReduced = useReducedMotion();

  // Remote-synced studio config (cached securely locally + live Firestore listener)
  const [remoteConfig, setRemoteConfig] = useState<RemoteStudioConfig>(() => {
    const cached = readVerifiedStorage<Record<string, unknown>>(SETTINGS_KEY, {});
    return hydrateCachedRemoteConfig(cached, generatePublicCoupon());
  });

  // Firebase Admin Auth user (for verified andreschullz1313@gmail.com admin session)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);

  // Client Session & Saved Quotes (integrity-protected against localStorage tampering)
  const [clientUser, setClientUser] = useState<ClientUser | null>(() =>
    readVerifiedStorage<ClientUser | null>(SESSION_KEY, null)
  );
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>(() =>
    readVerifiedStorage<SavedQuote[]>(QUOTES_KEY, [])
  );

  // Tab Navigation with Instant Render + Subtle 120fps Slide Transition (Início is ALWAYS default tab unless ?tab=...)
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [tabAnimTick, setTabAnimTick] = useState<number>(0);
  const [tabDirection, setTabDirection] = useState<'forward' | 'backward'>('forward');

  // Portfolio Sub-state
  const [portfolioView, setPortfolioView] = useState<'works' | 'instagram'>('works');
  const [portfolioCategory, setPortfolioCategory] = useState<string>('Todos');
  const [lightboxWork, setLightboxWork] = useState<PortfolioWork | null>(null);

  // Global Schedule Slots & Editable FAQ Items (real-time everywhere in the app)
  const [scheduleSlotsById, setScheduleSlotsById] = useState<Record<string, ScheduleSlotRecord>>({});
  const [scheduleSlotsLoaded, setScheduleSlotsLoaded] = useState(false);
  const [faqItems, setFaqItems] = useState<FaqItemRecord[]>(() => getCachedFaqItems());

  // Pull-to-refresh & center-zone tab swipe state (120fps direct DOM refs)
  const [pullPhase, setPullPhase] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  const pullPhaseRef = useRef<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  pullPhaseRef.current = pullPhase;
  const pullBannerRef = useRef<HTMLDivElement | null>(null);
  const pullIconRef = useRef<SVGSVGElement | null>(null);
  const pullDistanceRef = useRef(0);
  const swipeStageRef = useRef<HTMLElement | null>(null);
  const swipeHintRef = useRef<HTMLDivElement | null>(null);
  const swipeHintLabelRef = useRef<HTMLSpanElement | null>(null);
  const activeTabRef = useRef<TabId>(activeTab);
  activeTabRef.current = activeTab;
  const uiTabsRef = useRef(ui.tabs);
  uiTabsRef.current = ui.tabs;

  // Pain Map, Quote & Booking Synced Documentation State
  const [selectedBodyZone, setSelectedBodyZone] = useState<string>('Antebraço externo');
  const [quoteStyle, setQuoteStyle] = useState<string>('Realismo');
  const [quoteSizeIdx, setQuoteSizeIdx] = useState<number>(0);
  const [quoteCouponInput, setQuoteCouponInput] = useState<string>(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      return ref ? ref.toUpperCase().slice(0, 32) : '';
    } catch {
      return '';
    }
  });
  const [quoteIdea, setQuoteIdea] = useState<string>('');
  const [quoteAnamnese, setQuoteAnamnese] = useState<boolean[]>(() =>
    ANAMNESE_QUESTIONS.map(() => false)
  );
  const [quoteAcceptedTerms, setQuoteAcceptedTerms] = useState<boolean>(false);
  const [quoteSignatureDataUrl, setQuoteSignatureDataUrl] = useState<string>('');

  // Drawers, Modals
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminInitialSection, setAdminInitialSection] = useState<AdminSectionTab>('agenda');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [guestInstallOpen, setGuestInstallOpen] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('instalar') === '1';
    } catch {
      return false;
    }
  });
  const [guestInviteCoupon] = useState<string | null>(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      return ref ? ref.toUpperCase().slice(0, 32) : null;
    } catch {
      return null;
    }
  });
  const [activeFolder, setActiveFolder] = useState<FolderId>('contato');
  const [connPhase, setConnPhase] = useState<'online' | 'offline' | 'welcoming'>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialReason, setTutorialReason] = useState<'first' | 'update' | 'manual'>('first');
  const lastRemoteVersionRef = useRef<number>(remoteConfig.configVersion);
  const lastPromoBannerRef = useRef<string>(remoteConfig.promoBannerDataUrl);

  // Subscribe to Firebase Auth changes
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setFirebaseUser(u));
  }, []);

  // Real-time Firestore listener: pushes admin updates (banner, prices, logo, colors, info) to ALL user apps automatically
  useEffect(() => {
    const unsub = subscribeToStudioConfig((incoming) => {
      setRemoteConfig(incoming);
      writeSignedStorage(SETTINGS_KEY, incoming);
      const promoChanged =
        Boolean(incoming.promoBannerDataUrl) &&
        incoming.promoBannerDataUrl !== lastPromoBannerRef.current;
      lastPromoBannerRef.current = incoming.promoBannerDataUrl;

      if (incoming.configVersion > lastRemoteVersionRef.current) {
        lastRemoteVersionRef.current = incoming.configVersion;
        if (promoChanged) {
          showToast('Novo banner promocional disponível na tela Início!');
        } else {
          showToast(`${incoming.studioName} atualizado automaticamente.`);
        }
      }
    });
    return () => unsub();
  }, [showToast]);

  // Global real-time listener for schedule slots & editable FAQ items
  useEffect(() => {
    const unsubSlots = subscribeToScheduleSlots((slots) => {
      setScheduleSlotsById(slots);
      setScheduleSlotsLoaded(true);
    });
    const unsubFaqs = subscribeToFaqItems((items) => {
      setFaqItems(items);
    });
    return () => {
      unsubSlots();
      unsubFaqs();
    };
  }, []);

  // Automatic cross-tab localStorage sync (client account, saved quotes, studio config)
  useEffect(() => {
    const onStorageSync = (e: StorageEvent) => {
      if (!e.key || e.key === SESSION_KEY) {
        setClientUser(readVerifiedStorage<ClientUser | null>(SESSION_KEY, null));
      }
      if (!e.key || e.key === QUOTES_KEY) {
        setSavedQuotes(readVerifiedStorage<SavedQuote[]>(QUOTES_KEY, []));
      }
      if (!e.key || e.key === SETTINGS_KEY) {
        const cached = readVerifiedStorage<Partial<RemoteStudioConfig>>(SETTINGS_KEY, {});
        setRemoteConfig((prev) => ({ ...prev, ...cached }));
      }
    };
    window.addEventListener('storage', onStorageSync);
    return () => window.removeEventListener('storage', onStorageSync);
  }, []);

  // Full pull-to-refresh across ALL tabs (server config, schedule slots, FAQ items, local account/quotes, SW update)
  const refreshAllAppData = useCallback(async () => {
    if (pullPhaseRef.current === 'refreshing') return;
    pullPhaseRef.current = 'refreshing';
    setPullPhase('refreshing');
    try {
      const [freshConfig, freshSlots, freshFaqs] = await Promise.all([
        fetchStudioConfigOnce(),
        fetchScheduleSlotsOnce(),
        fetchFaqItemsOnce(),
      ]);

      if (freshConfig) {
        setRemoteConfig(freshConfig);
        writeSignedStorage(SETTINGS_KEY, freshConfig);
        lastRemoteVersionRef.current = freshConfig.configVersion;
        lastPromoBannerRef.current = freshConfig.promoBannerDataUrl;
      }

      if (freshSlots) {
        setScheduleSlotsById(freshSlots);
        setScheduleSlotsLoaded(true);
      }

      if (freshFaqs) {
        setFaqItems(freshFaqs);
      }

      setClientUser(readVerifiedStorage<ClientUser | null>(SESSION_KEY, null));
      setSavedQuotes(readVerifiedStorage<SavedQuote[]>(QUOTES_KEY, []));
      window.dispatchEvent(new Event('schullz-pull-refresh'));

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .getRegistration()
          .then((reg) => reg?.update())
          .catch(() => {});
      }

      showToast(
        navigator.onLine
          ? 'Todas as abas atualizadas com as informações mais recentes!'
          : 'Dados locais atualizados (conecte-se à internet para sincronizar alterações novas).'
      );
    } catch {
      setClientUser(readVerifiedStorage<ClientUser | null>(SESSION_KEY, null));
      setSavedQuotes(readVerifiedStorage<SavedQuote[]>(QUOTES_KEY, []));
      window.dispatchEvent(new Event('schullz-pull-refresh'));
      showToast('Dados locais atualizados.');
    } finally {
      window.setTimeout(() => {
        pullDistanceRef.current = 0;
        pullPhaseRef.current = 'idle';
        setPullPhase('idle');
      }, 280);
    }
  }, [showToast]);

  // Apply remote theme colors + logo URL to document & app monitor
  useEffect(() => {
    applyRemoteThemeAndLogo(remoteConfig, prefs, STUDIO_LOGO_URI);
    setMonitorLogoUrl(remoteConfig.logoDataUrl || STUDIO_LOGO_URI);
  }, [remoteConfig, prefs.isDark, prefs.highContrast]);

  useEffect(() => {
    const onOnline = () => {
      clearAppIssuesByCategory('connection');
      setConnPhase((prev) => (prev === 'offline' ? 'welcoming' : 'online'));
    };
    const onOffline = () => setConnPhase('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Show onboarding tutorial once on first access, or again if app version updated
  useEffect(() => {
    if (!introDone || guestInstallOpen) return;
    try {
      const seenVersion = localStorage.getItem(TUTORIAL_VERSION_KEY);
      if (!seenVersion) {
        setTutorialReason('first');
        setTutorialOpen(true);
      } else if (seenVersion !== APP_VERSION) {
        setTutorialReason('update');
        setTutorialOpen(true);
      }
    } catch {
      // ignore storage errors
    }
  }, [introDone, guestInstallOpen]);

  useEffect(() => {
    const onAppUpdated = () => {
      try {
        localStorage.removeItem(TUTORIAL_VERSION_KEY);
      } catch {
        // ignore
      }
      if (introDone) {
        setTutorialReason('update');
        setTutorialOpen(true);
      }
    };
    window.addEventListener('schullz-app-updated', onAppUpdated);
    return () => window.removeEventListener('schullz-app-updated', onAppUpdated);
  }, [introDone]);

  useEffect(() => {
    let rafId = 0;
    const syncTopBtn = () => {
      const next = window.scrollY > 280;
      setShowBackToTop((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        syncTopBtn();
      });
    };
    syncTopBtn();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, [activeTab]);

  useEffect(() => {
    if (!lightboxWork) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxWork(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxWork]);

  const scrollToTop = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  const switchTab = useCallback(
    (rawNextTab: TabId) => {
      const nextTab: TabId = rawNextTab === 'login' ? 'indicacao' : rawNextTab;
      if (nextTab === activeTab) return;
      const curIdx = TABS.findIndex((t) => t.id === activeTab);
      const nextIdx = TABS.findIndex((t) => t.id === nextTab);
      setTabDirection(nextIdx >= curIdx ? 'forward' : 'backward');
      setTabAnimTick((n) => n + 1);
      setActiveTab(nextTab);

      if ((window.scrollY || document.documentElement.scrollTop || 0) > 0) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }

      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      requestAnimationFrame(() => {
        const nav = document.getElementById('tabs');
        const activeBtn = nav?.querySelector<HTMLElement>(`[data-tab-id="${nextTab}"]`);
        if (nav && activeBtn) {
          const targetLeft = Math.max(
            0,
            activeBtn.offsetLeft - nav.clientWidth / 2 + activeBtn.clientWidth / 2
          );
          nav.scrollTo({ left: targetLeft, behavior: reduced ? 'auto' : 'smooth' });
        }
      });
    },
    [activeTab]
  );

  const switchTabRef = useRef(switchTab);
  switchTabRef.current = switchTab;

  // 120fps Center-Screen Horizontal Touch Swipe (between tabs w/ vertical transition) + Pull-to-Refresh
  useEffect(() => {
    const EXCLUDED_SELECTOR =
      'canvas, #tabs, .tabs-bar, input, textarea, select, [role="slider"], [role="dialog"], .no-tab-swipe';

    const getScrollTop = () =>
      window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

    const isInsideHorizontalScroller = (startEl: HTMLElement | null): boolean => {
      let node: HTMLElement | null = startEl;
      while (node && node !== document.body && node !== document.documentElement) {
        if (node.scrollWidth > node.clientWidth + 8) {
          const style = window.getComputedStyle(node);
          if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
            return true;
          }
        }
        node = node.parentElement;
      }
      return false;
    };

    let activeTouch = false;
    let pullTracking = false;
    let canTabSwipe = false;
    let gestureMode: 'pending' | 'tabSwipe' | 'pullRefresh' | 'verticalScroll' = 'pending';
    let startY = 0;
    let startX = 0;
    let startTime = 0;
    let totalDx = 0;
    let curPull = 0;
    let rafId = 0;

    const hideSwipeHint = () => {
      if (swipeHintRef.current) {
        swipeHintRef.current.style.opacity = '0';
        swipeHintRef.current.style.transform = 'translate3d(-50%, 14px, 0) scale(0.96)';
      }
    };

    const resetSwipeStage = (animate: boolean) => {
      const stage = swipeStageRef.current;
      if (!stage) return;
      if (animate) {
        stage.style.transition =
          'transform 150ms cubic-bezier(0.2, 0.9, 0.25, 1), opacity 130ms ease-out';
        stage.style.transform = 'translate3d(0, 0, 0)';
        stage.style.opacity = '1';
        window.setTimeout(() => {
          if (swipeStageRef.current) {
            swipeStageRef.current.style.willChange = '';
            swipeStageRef.current.style.transition = '';
            swipeStageRef.current.style.transform = '';
            swipeStageRef.current.style.opacity = '';
          }
        }, 160);
      } else {
        stage.style.transition = '';
        stage.style.willChange = '';
        stage.style.transform = '';
        stage.style.opacity = '';
      }
    };

    const flushVisual = () => {
      rafId = 0;
      if (gestureMode === 'pullRefresh') {
        const dist = pullDistanceRef.current;
        if (pullBannerRef.current) {
          pullBannerRef.current.style.height = `${Math.max(32, Math.min(54, Math.round(dist * 0.6)))}px`;
        }
        if (pullIconRef.current) {
          pullIconRef.current.style.transform = `rotate(${dist * 3}deg)`;
        }
        return;
      }

      if (gestureMode === 'tabSwipe') {
        const curIdx = TABS.findIndex((t) => t.id === activeTabRef.current);
        const goNext = totalDx < 0;
        const targetIdx = goNext ? curIdx + 1 : curIdx - 1;
        const targetTab = targetIdx >= 0 && targetIdx < TABS.length ? TABS[targetIdx] : null;
        const hasNeighbor = Boolean(targetTab);

        // Subtle, lag-free lateral drag tracking on touch
        const resistance = hasNeighbor ? 0.24 : 0.1;
        const clampedDragX = Math.max(-48, Math.min(48, Math.round(totalDx * resistance)));
        if (swipeStageRef.current) {
          swipeStageRef.current.style.willChange = 'transform, opacity';
          swipeStageRef.current.style.transition = 'none';
          swipeStageRef.current.style.transform = `translate3d(${clampedDragX}px, 0, 0)`;
          swipeStageRef.current.style.opacity = String(
            hasNeighbor ? Math.max(0.88, 1 - Math.abs(clampedDragX) / 380) : 1
          );
        }

        if (swipeHintRef.current && swipeHintLabelRef.current) {
          if (!targetTab) {
            hideSwipeHint();
            return;
          }
          const label = uiTabsRef.current[targetTab.id] || targetTab.label;
          const absDx = Math.abs(totalDx);
          const ready = absDx >= 52;
          swipeHintLabelRef.current.textContent = goNext
            ? `${ready ? 'Solte →' : 'Deslize →'} ${label}`
            : `← ${ready ? 'Solte' : 'Deslize'} ${label}`;
          const shiftX = Math.max(-22, Math.min(22, Math.round(totalDx * 0.16)));
          swipeHintRef.current.style.opacity = ready ? '1' : '0.9';
          swipeHintRef.current.style.borderColor = ready ? 'var(--r)' : 'var(--border-strong)';
          swipeHintRef.current.style.transform = `translate3d(calc(-50% + ${shiftX}px), 0, 0) scale(${
            ready ? 1.04 : 0.98
          })`;
        }
      }
    };

    const setPhaseSafe = (next: 'idle' | 'pulling' | 'ready') => {
      if (pullPhaseRef.current === 'refreshing' || pullPhaseRef.current === next) return;
      pullPhaseRef.current = next;
      setPullPhase(next);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || pullPhaseRef.current === 'refreshing') {
        activeTouch = false;
        pullTracking = false;
        canTabSwipe = false;
        gestureMode = 'pending';
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest(EXCLUDED_SELECTOR)) {
        activeTouch = false;
        pullTracking = false;
        canTabSwipe = false;
        gestureMode = 'pending';
        return;
      }

      const touch = e.touches[0];
      activeTouch = true;
      gestureMode = 'pending';
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = performance.now();
      totalDx = 0;
      curPull = 0;
      pullDistanceRef.current = 0;
      pullTracking = getScrollTop() <= 4;

      const vh = window.innerHeight || 800;
      const vw = window.innerWidth || 400;
      const inCenterTouchZone =
        !target?.closest('#top, footer') &&
        startY >= 80 &&
        startY <= vh - 16 &&
        startX >= 18 &&
        startX <= vw - 18 &&
        !isInsideHorizontalScroller(target);
      canTabSwipe = inCenterTouchZone;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!activeTouch || e.touches.length !== 1 || pullPhaseRef.current === 'refreshing') return;
      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;
      totalDx = curX - startX;
      const totalDy = curY - startY;

      if (gestureMode === 'pending') {
        const absDx = Math.abs(totalDx);
        const absDy = Math.abs(totalDy);
        if (absDx < 12 && absDy < 12) return;

        if (canTabSwipe && absDx > absDy * 1.2) {
          gestureMode = 'tabSwipe';
        } else if (pullTracking && getScrollTop() <= 4 && totalDy > 10 && totalDy > absDx * 1.15) {
          gestureMode = 'pullRefresh';
        } else {
          gestureMode = 'verticalScroll';
          return;
        }
      }

      if (gestureMode === 'tabSwipe') {
        if (!rafId) rafId = requestAnimationFrame(flushVisual);
        return;
      }

      if (gestureMode === 'pullRefresh') {
        if (totalDy <= 0) {
          curPull = 0;
          pullDistanceRef.current = 0;
          setPhaseSafe('idle');
          return;
        }
        const damped = Math.min(92, Math.round((totalDy - 10) * 0.58));
        curPull = damped;
        pullDistanceRef.current = damped;
        const nextPhase = damped >= 52 ? 'ready' : damped > 8 ? 'pulling' : 'idle';
        setPhaseSafe(nextPhase);
        if (!rafId) rafId = requestAnimationFrame(flushVisual);
      }
    };

    const onTouchEnd = () => {
      if (!activeTouch) return;
      const endedMode = gestureMode;
      const finalDx = totalDx;
      const elapsed = performance.now() - startTime;

      activeTouch = false;
      pullTracking = false;
      canTabSwipe = false;
      gestureMode = 'pending';
      cancelAnimationFrame(rafId);
      rafId = 0;
      hideSwipeHint();

      if (endedMode === 'tabSwipe') {
        const isQuickFlick = elapsed < 260 && Math.abs(finalDx) >= 36;
        const isLongSwipe = Math.abs(finalDx) >= 52;
        const curIdx = TABS.findIndex((t) => t.id === activeTabRef.current);
        const nextIdx = finalDx < 0 ? curIdx + 1 : curIdx - 1;
        const canMove = (isQuickFlick || isLongSwipe) && nextIdx >= 0 && nextIdx < TABS.length;
        if (canMove) {
          resetSwipeStage(false);
          switchTabRef.current(TABS[nextIdx].id);
        } else {
          resetSwipeStage(true);
        }
        return;
      }

      if (endedMode === 'pullRefresh') {
        const shouldRefresh = curPull >= 52 && pullPhaseRef.current !== 'refreshing';
        curPull = 0;
        pullDistanceRef.current = 0;
        if (shouldRefresh) {
          void refreshAllAppData();
        } else {
          setPhaseSafe('idle');
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      hideSwipeHint();
      resetSwipeStage(false);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [refreshAllAppData]);

  // Keyboard Left/Right lateral tab switching when no modal or input is focused
  useEffect(() => {
    const anyModalOpen =
      Boolean(lightboxWork) ||
      adminOpen ||
      drawerOpen ||
      shareModalOpen ||
      guestInstallOpen ||
      tutorialOpen;
    if (anyModalOpen) return;

    const onKeyNav = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="dialog"]')) {
        return;
      }
      const curIdx = TABS.findIndex((t) => t.id === activeTabRef.current);
      const nextIdx = e.key === 'ArrowRight' ? curIdx + 1 : curIdx - 1;
      if (nextIdx >= 0 && nextIdx < TABS.length) {
        switchTabRef.current(TABS[nextIdx].id);
      }
    };

    window.addEventListener('keydown', onKeyNav);
    return () => window.removeEventListener('keydown', onKeyNav);
  }, [lightboxWork, adminOpen, drawerOpen, shareModalOpen, guestInstallOpen, tutorialOpen]);

  // Support Play Store / PWA shortcut deep link ?tab=...
  useEffect(() => {
    try {
      const tabParam = new URLSearchParams(window.location.search).get('tab') as TabId | null;
      if (tabParam === 'login') {
        switchTab('indicacao');
      } else if (tabParam && TABS.some((t) => t.id === tabParam)) {
        switchTab(tabParam);
      }
    } catch {
      // ignore
    }
  }, [switchTab]);

  const navigateToTarget = useCallback(
    (target: NavigateTarget) => {
      if (
        target === 'contato' ||
        target === 'faq' ||
        target === 'preparacao' ||
        target === 'pos-tattoo' ||
        target === 'loja'
      ) {
        const mappedFolder: FolderId = target === 'loja' ? 'pos-tattoo' : target;
        setActiveFolder(mappedFolder);
        switchTab('central');
        return;
      }
      switchTab(target);
    },
    [switchTab]
  );

  const handleCloseTutorial = useCallback(() => {
    try {
      localStorage.setItem(TUTORIAL_VERSION_KEY, APP_VERSION);
    } catch {
      // ignore storage errors
    }
    setTutorialOpen(false);
  }, []);

  const handleLoginSuccess = (u: ClientUser) => {
    setClientUser(u);
    writeSignedStorage(SESSION_KEY, u);
    showToast(fmt(ui.toasts.welcomeUser, { name: u.name }));
  };

  const handleLogout = () => {
    setClientUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(`schullz_sig_v1_${SESSION_KEY}`);
    } catch {
      // ignore
    }
    showToast(ui.toasts.loggedOut);
    switchTab('indicacao');
  };

  const handleSaveQuote = (q: SavedQuote) => {
    const next = [q, ...savedQuotes];
    setSavedQuotes(next);
    writeSignedStorage(QUOTES_KEY, next);
  };

  const handleUseZoneInQuote = (zoneName: string) => {
    setSelectedBodyZone(zoneName);
    switchTab('orcamento');
    if (!clientUser) {
      showToast(ui.toasts.loginToQuoteZone);
    } else {
      showToast(fmt(ui.toasts.zoneSelected, { zone: zoneName }));
    }
  };

  const handleWantStyle = (category: string) => {
    const styleToSet = category === 'Todos' ? 'Realismo' : category;
    setQuoteStyle(styleToSet);
    setLightboxWork(null);
    switchTab('orcamento');
    if (!clientUser) {
      showToast(ui.toasts.loginToQuoteStyle);
    }
  };

  const isAdminVerified = isAuthorizedAdminUser(firebaseUser);
  const activeLogo = remoteConfig.logoDataUrl || STUDIO_LOGO_URI;
  const igClean = remoteConfig.instagram.replace(/^@/, '');
  const igUrl = `https://instagram.com/${igClean}/`;
  const waUrl = `https://wa.me/${remoteConfig.whatsapp.replace(/\D/g, '')}`;

  const tabPanelClass =
    tabAnimTick > 0
      ? `tab-panel ${tabDirection === 'forward' ? 'tab-enter-forward' : 'tab-enter-backward'}`
      : 'tab-panel';

  return (
    <>
      {!introDone && (
        <IntroLoader
          studioName={remoteConfig.studioName}
          logoUrl={activeLogo}
          onComplete={() => setIntroDone(true)}
        />
      )}
      <div className="min-h-screen flex flex-col app-shell" aria-hidden={!introDone}>
        {/* Sticky Top Header, Error Notification Bar & Tab Bar */}
        <div
          id="top"
          className="sticky top-0 z-30 border-b"
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <ErrorNotificationBar
            logoUrl={activeLogo}
            studioName={remoteConfig.studioName}
            onRetryConnection={() => {
              if (navigator.onLine) {
                clearAppIssuesByCategory('connection');
                showToast('Conexão restabelecida!');
              } else {
                showToast('Sem conexão no momento.');
              }
            }}
          />

          <header className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 py-2.5">
            <button
              type="button"
              onClick={() => switchTab('inicio')}
              className="flex items-center gap-3 text-left cursor-pointer bg-transparent border-0 p-0"
            >
              <img
                src={activeLogo}
                alt={`Logo ${remoteConfig.studioName}`}
                className="w-12 h-12 rounded-full object-cover border-2 shrink-0"
                style={{ borderColor: 'var(--r)' }}
              />
              <div>
                <div className="f text-2xl leading-none" style={{ color: 'var(--r)' }}>
                  {remoteConfig.studioName}
                </div>
                <small
                  className="block text-xs font-bold tracking-[0.22em] uppercase mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {ui.header.subtitle}
                </small>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void refreshAllAppData()}
                disabled={pullPhase === 'refreshing'}
                aria-label="Atualizar informações de todas as abas"
                title="Atualizar todas as abas"
                className="flex items-center justify-center rounded border cursor-pointer transition-colors"
                style={{
                  borderColor: 'var(--border-strong)',
                  color: pullPhase === 'refreshing' ? 'var(--accent-gold)' : 'var(--text)',
                  background: 'var(--card)',
                  width: '44px',
                  height: '44px',
                }}
              >
                <RefreshCw
                  size={19}
                  className={pullPhase === 'refreshing' ? 'animate-spin' : ''}
                  aria-hidden="true"
                />
              </button>

              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram ${remoteConfig.studioName}`}
                className="flex items-center justify-center rounded border transition-colors"
                style={{
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text)',
                  width: '44px',
                  height: '44px',
                }}
              >
                <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={ui.header.settingsAria}
                className="flex items-center gap-2 px-3 rounded border font-bold cursor-pointer transition-colors"
                style={{
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text)',
                  background: 'var(--card)',
                  minHeight: '44px',
                }}
              >
                <Settings size={18} />
                <span className="hidden sm:inline text-sm uppercase tracking-wider">
                  {ui.header.settingsBtn}
                </span>
                <Menu size={18} />
              </button>
            </div>
          </header>

          {/* High-Contrast Horizontal Tab Navigation (Full Red Tabs + Black Text + Sliding Indicator) */}
          <nav
            id="tabs"
            aria-label={ui.header.navAria}
            className="tabs-bar border-t border-b overflow-x-auto"
            style={{
              background: '#F22929',
              borderColor: '#000000',
            }}
          >
            <LayoutGroup id="top-red-tabs">
              <div className="max-w-6xl mx-auto flex items-center gap-1.5 px-3 py-1.5">
                {TABS.map((t) => {
                  const isSelected = activeTab === t.id;
                  const isLocked = Boolean(t.requiresAuth && !clientUser);
                  return (
                    <button
                      key={t.id}
                      data-tab-id={t.id}
                      type="button"
                      onClick={() => switchTab(t.id)}
                      aria-current={isSelected ? 'page' : undefined}
                      className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-base font-extrabold uppercase tracking-wider whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      style={{
                        background: isSelected ? '#c91414' : '#F22929',
                        color: '#000000',
                        border: isSelected ? '2px solid #000000' : '1px solid rgba(0,0,0,0.3)',
                        minHeight: '42px',
                      }}
                    >
                      {isLocked && <Lock size={14} color="#000000" aria-hidden="true" />}
                      <span className="relative z-10">{ui.tabs[t.id]}</span>
                      {isSelected && (
                        <motion.span
                          layoutId="top-red-tab-slider"
                          transition={{ type: 'spring', stiffness: 560, damping: 38, mass: 0.55 }}
                          aria-hidden="true"
                          className="absolute left-1 right-1 bottom-0.5 h-[3px] rounded-full bg-black"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </nav>

          {/* Pull-to-Refresh Indicator Banner (120fps direct ref updates) */}
          {pullPhase !== 'idle' && (
            <div
              ref={pullBannerRef}
              className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-bold uppercase tracking-wider border-b"
              style={{
                background: 'var(--card-alt)',
                borderColor: 'var(--border-strong)',
                color: 'var(--accent-gold)',
                height: pullPhase === 'refreshing' ? '44px' : '36px',
              }}
            >
              <RefreshCw
                ref={pullIconRef}
                size={16}
                className={pullPhase === 'refreshing' ? 'animate-spin' : ''}
              />
              <span>
                {pullPhase === 'refreshing'
                  ? 'Atualizando informações de todas as abas...'
                  : pullPhase === 'ready'
                    ? 'Solte para atualizar o app agora'
                    : 'Puxe para baixo para atualizar todas as abas'}
              </span>
            </div>
          )}
        </div>

        {/* Main Single-Tab Stage + Shared Element Lightbox Group */}
        <LayoutGroup>
          <main ref={swipeStageRef} className="flex-1 tab-stage">
          <div key={activeTab} className={tabPanelClass}>
            {/* TAB 1 (DEFAULT): PÁGINA INICIAL */}
            {activeTab === 'inicio' && (
              <div>
                <section className="max-w-5xl mx-auto px-4 py-10 space-y-6">
                  <MonthlyPromoBanner
                    remoteConfig={remoteConfig}
                    isAdmin={isAdminVerified}
                    isClientLoggedIn={Boolean(clientUser)}
                    whatsappUrl={waUrl}
                    onRequestQuote={() => switchTab(clientUser ? 'orcamento' : 'indicacao')}
                    onOpenAdminPanel={() => setAdminOpen(true)}
                    onToast={showToast}
                  />
                  <div
                    className="tab-stagger-kicker text-sm font-bold tracking-[0.25em] uppercase"
                    style={{ color: 'var(--accent-gold)' }}
                  >
                    {ui.home.kicker}
                  </div>
                  <h1 className="tab-stagger-title" style={{ color: 'var(--r)' }}>
                    {ui.home.title}
                  </h1>
                  <p className="tab-stagger-lead max-w-2xl text-xl" style={{ color: 'var(--text)' }}>
                    {ui.home.lead}
                  </p>
                  <div className="tab-stagger-actions flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      className="si-btn"
                      onClick={() => switchTab(clientUser ? 'orcamento' : 'indicacao')}
                    >
                      {clientUser ? ui.home.ctaQuoteLoggedIn : ui.home.ctaQuoteLoggedOut}
                    </button>
                    <button
                      type="button"
                      className="si-btn si-btn-outline"
                      onClick={() => switchTab('agendamento')}
                    >
                      {ui.tabs.agendamento}
                    </button>
                    <button type="button" className="si-btn si-btn-outline" onClick={() => switchTab('portfolio')}>
                      {ui.home.ctaWorks}
                    </button>
                    <button type="button" className="si-btn si-btn-outline" onClick={() => switchTab('mapa')}>
                      {ui.home.ctaPainMap}
                    </button>
                  </div>

                  <div className="tab-stagger-block">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block font-bold tracking-[0.16em] uppercase underline underline-offset-4 py-2"
                      style={{ color: 'var(--accent-gold)' }}
                    >
                      {ui.home.ctaWhatsapp}
                    </a>
                  </div>

                  <div className="tab-stagger-grid grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="si-card si-card-interactive" tabIndex={0}>
                      <div className="f text-5xl" style={{ color: 'var(--r)' }}>
                        20%
                      </div>
                      <p className="mt-1 font-semibold">{ui.home.stat1Text}</p>
                    </div>
                    <div className="si-card si-card-interactive" tabIndex={0}>
                      <div className="f text-5xl" style={{ color: 'var(--r)' }}>
                        100%
                      </div>
                      <p className="mt-1 font-semibold">{ui.home.stat2Text}</p>
                    </div>
                    <div className="si-card si-card-interactive" tabIndex={0}>
                      <div className="f text-5xl" style={{ color: 'var(--r)' }}>
                        1:1
                      </div>
                      <p className="mt-1 font-semibold">{ui.home.stat3Text}</p>
                    </div>
                  </div>
                </section>

                <div className="torn" />

                <section className="max-w-5xl mx-auto px-4 py-10 space-y-5">
                  <div
                    className="tab-stagger-kicker text-sm font-bold tracking-[0.25em] uppercase"
                    style={{ color: 'var(--accent-gold)' }}
                  >
                    {ui.home.studioKicker}
                  </div>
                  <h2 className="tab-stagger-title">{ui.home.studioTitle}</h2>
                  <p className="tab-stagger-lead max-w-3xl text-lg" style={{ color: 'var(--text)' }}>
                    {ui.home.studioLead}
                  </p>

                  <div className="tab-stagger-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    {ui.home.process.map(([num, title, desc]) => (
                      <div key={num} className="si-card si-card-interactive space-y-1.5" tabIndex={0}>
                        <span className="f text-3xl block" style={{ color: 'var(--r)' }}>
                          {num}
                        </span>
                        <h3>{title}</h3>
                        <p style={{ color: 'var(--text-muted)' }}>{desc}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* TAB 3: TRABALHOS REALIZADOS E INSTAGRAM OFICIAL */}
            {activeTab === 'portfolio' && (
              <section className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                <div>
                  <div
                    className="tab-stagger-kicker text-sm font-bold tracking-widest uppercase"
                    style={{ color: 'var(--accent-gold)' }}
                  >
                    {ui.portfolio.kicker}
                  </div>
                  <h2 className="tab-stagger-title">{ui.portfolio.title}</h2>
                </div>

                <div className="tab-stagger-actions flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPortfolioView('works')}
                    className="px-4 py-2 rounded font-bold uppercase tracking-wider border cursor-pointer"
                    style={{
                      background: portfolioView === 'works' ? 'var(--r)' : 'transparent',
                      color: portfolioView === 'works' ? 'var(--btn-text)' : 'var(--text)',
                      borderColor: portfolioView === 'works' ? 'var(--r)' : 'var(--border-strong)',
                      minHeight: '44px',
                    }}
                  >
                    {ui.portfolio.tabWorks}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioView('instagram')}
                    className="px-4 py-2 rounded font-bold uppercase tracking-wider border cursor-pointer"
                    style={{
                      background: portfolioView === 'instagram' ? 'var(--r)' : 'transparent',
                      color: portfolioView === 'instagram' ? 'var(--btn-text)' : 'var(--text)',
                      borderColor: portfolioView === 'instagram' ? 'var(--r)' : 'var(--border-strong)',
                      minHeight: '44px',
                    }}
                  >
                    {ui.portfolio.tabInstagram} @{igClean}
                  </button>
                </div>

                {portfolioView === 'works' && (
                  <LayoutGroup id="portfolio-category-filters">
                    <div
                      className="tab-stagger-lead flex flex-wrap gap-2"
                      role="group"
                      aria-label={ui.portfolio.filterAria}
                    >
                      {CATEGORIES.map((cat) => {
                        const active = portfolioCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setPortfolioCategory(cat)}
                            aria-pressed={active}
                            className="relative px-3.5 py-1.5 rounded border text-sm font-bold uppercase tracking-wider cursor-pointer transition-colors duration-200 overflow-hidden"
                            style={{
                              background: 'transparent',
                              color: active ? 'var(--accent-gold)' : 'var(--text)',
                              borderColor: active ? 'var(--accent-gold)' : 'var(--border-subtle)',
                              minHeight: '40px',
                            }}
                          >
                            {active && (
                              <motion.span
                                layoutId="portfolio-category-active"
                                transition={{
                                  type: 'spring',
                                  stiffness: 380,
                                  damping: 30,
                                }}
                                aria-hidden="true"
                                className="absolute inset-0 rounded-[3px]"
                                style={{ background: 'var(--card-alt)' }}
                              />
                            )}
                            <span className="relative z-10">{tCategory(cat)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </LayoutGroup>
                )}

                {portfolioView === 'works' ? (
                  <PortfolioGallery
                    works={PORTFOLIO_WORKS.filter(
                      (w) => portfolioCategory === 'Todos' || w.category === portfolioCategory
                    )}
                    category={portfolioCategory}
                    onSelectWork={(work) => setLightboxWork(work)}
                    onWantStyle={handleWantStyle}
                    onResetCategory={() => setPortfolioCategory('Todos')}
                  />
                ) : (
                  <InstagramFeed
                    username={igClean}
                    studioName={remoteConfig.studioName}
                    onViewPortfolioWorks={() => setPortfolioView('works')}
                    onSelectWork={(work) => setLightboxWork(work)}
                  />
                )}
              </section>
            )}

            {/* TAB 4: MAPA CORPORAL 3D DA DOR */}
            {activeTab === 'mapa' && (
              <section className="max-w-5xl mx-auto px-4 py-8 space-y-5">
                <div>
                  <div
                    className="tab-stagger-kicker text-sm font-bold tracking-widest uppercase"
                    style={{ color: 'var(--accent-gold)' }}
                  >
                    {domain.painMap.hudTitle}
                  </div>
                  <h2 className="tab-stagger-title">{ui.tabs.mapa}</h2>
                  <p className="tab-stagger-lead" style={{ color: 'var(--text-muted)' }}>
                    {domain.painMap.hudHint}
                  </p>
                </div>

                <div className="tab-stagger-block">
                  <PainMap3D
                    isDark={prefs.isDark}
                    selectedZone={selectedBodyZone}
                    onSelectZone={(z) => setSelectedBodyZone(z)}
                    onUseInQuote={handleUseZoneInQuote}
                  />
                </div>
              </section>
            )}

            {/* TAB 5: TABELA DE PREÇOS (PROTEGIDA POR LOGIN, PREÇOS EM TEMPO REAL) */}
            {activeTab === 'precos' && (
              <section className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                {!clientUser ? (
                  <div className="si-card tab-stagger-block max-w-2xl mx-auto text-center py-10 space-y-4">
                    <div className="text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--accent-gold)' }}>
                      {ui.prices.restrictedKicker}
                    </div>
                    <h2>{ui.prices.restrictedTitle}</h2>
                    <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
                      {ui.prices.restrictedBody}
                    </p>
                    <button type="button" className="si-btn" onClick={() => switchTab('indicacao')}>
                      {ui.prices.goToLogin}
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <div
                        className="tab-stagger-kicker text-sm font-bold tracking-widest uppercase"
                        style={{ color: 'var(--accent-gold)' }}
                      >
                        {ui.prices.kicker}
                      </div>
                      <h2 className="tab-stagger-title">{ui.prices.title}</h2>
                      <p className="tab-stagger-lead" style={{ color: 'var(--text)' }}>
                        {ui.prices.lead}
                      </p>
                    </div>

                    {(() => {
                      const groupedEntries: { group: string; items: EditablePriceItem[] }[] = [];
                      const groupLookup = new Map<string, EditablePriceItem[]>();
                      remoteConfig.priceItems.forEach((entry) => {
                        const key = entry.group;
                        const existingList = groupLookup.get(key);
                        if (existingList) {
                          existingList.push(entry);
                        } else {
                          const list = [entry];
                          groupLookup.set(key, list);
                          groupedEntries.push({ group: key, items: list });
                        }
                      });

                      if (groupedEntries.length === 0) {
                        return (
                          <div className="si-card text-center py-8" style={{ color: 'var(--text-muted)' }}>
                            Nenhum item cadastrado na tabela de preços no momento.
                          </div>
                        );
                      }

                      return groupedEntries.map((grp, grpIdx) => {
                        const defaultGrp = PRICE_GROUPS[grpIdx];
                        const localizedGrp =
                          lang !== 'pt-BR' && defaultGrp && defaultGrp.group === grp.group
                            ? domain.priceGroups[grpIdx]
                            : undefined;

                        return (
                          <div key={`${grp.group}-${grpIdx}`} className="space-y-3">
                            <h3 className="tab-stagger-title text-2xl" style={{ color: 'var(--accent-gold)' }}>
                              {localizedGrp?.group || grp.group}
                            </h3>
                            <div className="tab-stagger-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {grp.items.map((item, itemIdx) => {
                                const defaultItem = defaultGrp?.items[itemIdx];
                                const localizedItem =
                                  localizedGrp?.items[itemIdx];
                                const displayTitle =
                                  lang !== 'pt-BR' &&
                                  defaultItem &&
                                  defaultItem.title === item.title &&
                                  localizedItem
                                    ? localizedItem.title
                                    : item.title;
                                const displayDesc =
                                  lang !== 'pt-BR' &&
                                  defaultItem &&
                                  defaultItem.description === item.description &&
                                  localizedItem
                                    ? localizedItem.description
                                    : item.description;

                                return (
                                  <div
                                    key={`${grp.group}-${item.title}-${itemIdx}`}
                                    className="si-card si-card-interactive flex flex-col justify-between gap-3"
                                    tabIndex={0}
                                  >
                                    <div className="space-y-1.5">
                                      <h3>{displayTitle}</h3>
                                      {displayDesc && (
                                        <p className="text-base" style={{ color: 'var(--text-muted)' }}>
                                          {displayDesc}
                                        </p>
                                      )}
                                    </div>
                                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                      <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--r)' }}>
                                        {item.min === item.max
                                          ? formatBRL(item.min)
                                          : `${formatBRL(item.min)} – ${formatBRL(item.max)}`}
                                      </div>
                                      <div className="text-sm font-semibold tabular-nums" style={{ color: 'var(--pain-low-text)' }}>
                                        {fmt(ui.prices.withReferral, {
                                          min: formatBRL(item.min * 0.8),
                                          max: formatBRL(item.max * 0.8),
                                        })}
                                      </div>
                                      <button
                                        type="button"
                                        className="si-btn si-btn-outline si-btn-sm w-full mt-2"
                                        onClick={() => switchTab('orcamento')}
                                      >
                                        {ui.prices.requestQuote}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}

                    {remoteConfig.fullSleeveNote && (
                      <p className="tab-stagger-block text-base font-semibold pt-2" style={{ color: 'var(--accent-gold)' }}>
                        {lang !== 'pt-BR' && remoteConfig.fullSleeveNote === DEFAULT_FULL_SLEEVE_NOTE
                          ? remoteConfig.fullSleeveMin === 2500
                            ? ui.prices.fullSleeveNote
                            : ui.prices.fullSleeveNote.replace(/R\$ 2\.500|\$2,500/, formatBRL(remoteConfig.fullSleeveMin))
                          : remoteConfig.fullSleeveMin !== 2500 && /R\$\s*2\.500/.test(remoteConfig.fullSleeveNote)
                            ? remoteConfig.fullSleeveNote.replace(/R\$\s*2\.500/, formatBRL(remoteConfig.fullSleeveMin))
                            : remoteConfig.fullSleeveNote}
                      </p>
                    )}
                  </>
                )}
              </section>
            )}

            {/* TAB 6: ORÇAMENTO AUTOMÁTICO */}
            {activeTab === 'orcamento' && (
              <QuoteSection
                user={clientUser}
                selectedStyle={quoteStyle}
                onChangeStyle={setQuoteStyle}
                selectedZone={selectedBodyZone}
                onChangeZone={setSelectedBodyZone}
                sizeIdx={quoteSizeIdx}
                onChangeSizeIdx={setQuoteSizeIdx}
                couponInput={quoteCouponInput}
                onChangeCouponInput={setQuoteCouponInput}
                idea={quoteIdea}
                onChangeIdea={setQuoteIdea}
                anamnese={quoteAnamnese}
                onChangeAnamnese={setQuoteAnamnese}
                acceptedTerms={quoteAcceptedTerms}
                onChangeAcceptedTerms={setQuoteAcceptedTerms}
                signatureDataUrl={quoteSignatureDataUrl}
                onChangeSignatureDataUrl={setQuoteSignatureDataUrl}
                publicCoupon={remoteConfig.publicCoupon}
                studioWhatsapp={remoteConfig.whatsapp}
                studioInstagram={remoteConfig.instagram}
                studioName={remoteConfig.studioName}
                logoUrl={activeLogo}
                sizeTierPrices={remoteConfig.sizeTiers}
                onSaveQuote={handleSaveQuote}
                onGoToLogin={() => switchTab('indicacao')}
                onProceedToSchedule={() => switchTab('agendamento')}
                onToast={showToast}
              />
            )}

            {/* TAB 7: AGENDAMENTO ONLINE + WHATSAPP */}
            {activeTab === 'agendamento' && (
              <ScheduleTab
                user={clientUser}
                slotsById={scheduleSlotsById}
                slotsLoaded={scheduleSlotsLoaded}
                selectedStyle={quoteStyle}
                onChangeStyle={setQuoteStyle}
                selectedZone={selectedBodyZone}
                onChangeZone={setSelectedBodyZone}
                sizeIdx={quoteSizeIdx}
                onChangeSizeIdx={setQuoteSizeIdx}
                couponInput={quoteCouponInput}
                onChangeCouponInput={setQuoteCouponInput}
                notes={quoteIdea}
                onChangeNotes={setQuoteIdea}
                anamnese={quoteAnamnese}
                onChangeAnamnese={setQuoteAnamnese}
                acceptedTerms={quoteAcceptedTerms}
                onChangeAcceptedTerms={setQuoteAcceptedTerms}
                signatureDataUrl={quoteSignatureDataUrl}
                onChangeSignatureDataUrl={setQuoteSignatureDataUrl}
                sizeTierPrices={remoteConfig.sizeTiers}
                studioName={remoteConfig.studioName}
                studioWhatsapp={remoteConfig.whatsapp}
                studioInstagram={remoteConfig.instagram}
                logoUrl={activeLogo}
                publicCoupon={remoteConfig.publicCoupon}
                isAdmin={isAdminVerified}
                onToast={showToast}
              />
            )}

            {/* TAB 8: CENTRAL DE GUIAS */}
            {activeTab === 'central' && (
              <StudioFoldersHub
                activeFolder={activeFolder}
                onSelectFolder={setActiveFolder}
                onNavigate={navigateToTarget}
                studioName={remoteConfig.studioName}
                studioWhatsapp={remoteConfig.whatsapp}
                studioInstagram={remoteConfig.instagram}
                onSelectPortfolioWork={(work) => setLightboxWork(work)}
                faqItems={faqItems}
                isAdmin={isAdminVerified}
                onOpenFaqAdmin={() => {
                  setAdminInitialSection('faq');
                  setAdminOpen(true);
                }}
              />
            )}

            {/* TAB FINAL: CLUBE DE INDICAÇÃO & CADASTRO (CUPONS LIBERADOS APÓS LOGIN/CADASTRO) */}
            {activeTab === 'indicacao' && (
              <section className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                <div className="space-y-2">
                  <div
                    className="tab-stagger-kicker text-sm font-bold tracking-widest uppercase"
                    style={{ color: 'var(--accent-gold)' }}
                  >
                    {ui.referral.kicker}
                  </div>
                  <h2 className="tab-stagger-title">{ui.referral.title}</h2>
                  {clientUser ? (
                    <p className="tab-stagger-lead" style={{ color: 'var(--text)' }}>
                      {ui.referral.leadBefore}{' '}
                      <strong className="tracking-wider" style={{ color: 'var(--r)' }}>
                        {clientUser.coupon || remoteConfig.publicCoupon}
                      </strong>
                      {ui.referral.leadAfter}
                    </p>
                  ) : (
                    <p className="tab-stagger-lead" style={{ color: 'var(--text-muted)' }}>
                      Faça seu cadastro ou login abaixo para liberar seu cupom pessoal de 20% OFF, copiar seu código e enviar convites para seus amigos.
                    </p>
                  )}
                </div>

                {clientUser ? (
                  <div className="tab-stagger-actions flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="si-btn"
                      onClick={() => {
                        const code = clientUser.coupon || remoteConfig.publicCoupon;
                        navigator.clipboard?.writeText(code).catch(() => {});
                        showToast(fmt(ui.toasts.codeCopied, { code }));
                      }}
                    >
                      {ui.referral.copyCode}
                    </button>
                  </div>
                ) : (
                  <div
                    className="p-4 rounded border-2 flex flex-wrap items-center justify-between gap-3"
                    style={{ borderColor: 'var(--accent-gold)', background: 'var(--card-alt)' }}
                  >
                    <div className="space-y-0.5">
                      <div className="inline-flex items-center gap-1.5 font-bold" style={{ color: 'var(--accent-gold)' }}>
                        <Lock size={16} />
                        Cupons de Indicação Bloqueados
                      </div>
                      <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>
                        Cadastre-se ou entre com sua conta logo abaixo para desbloquear e enviar seu cupom exclusivo de 20% OFF.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="si-btn si-btn-sm"
                      onClick={() => {
                        document.getElementById('client-auth-box')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Ir para Cadastro / Login
                    </button>
                  </div>
                )}

                <div className="tab-stagger-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {ui.referral.steps.map(([num, title, desc]) => (
                    <div key={num} className="si-card si-card-interactive space-y-1.5" tabIndex={0}>
                      <span className="f text-3xl block" style={{ color: 'var(--r)' }}>
                        {num}
                      </span>
                      <h3>{title}</h3>
                      <p style={{ color: 'var(--text-muted)' }}>{desc}</p>
                    </div>
                  ))}
                </div>

                {/* Cadastro & Login (or Logged-in Client Account & Saved Quotes) */}
                <AuthGateTab
                  embeddedInReferral
                  user={clientUser}
                  savedQuotes={savedQuotes}
                  onLoginSuccess={handleLoginSuccess}
                  onLogout={handleLogout}
                  onNavigateTab={switchTab}
                  onToast={showToast}
                  publicCoupon={remoteConfig.publicCoupon}
                  isFirebaseAdmin={isAdminVerified}
                  onOpenAdminPanel={() => setAdminOpen(true)}
                />

                {/* Invite / QR / APK Download Panel (coupons gated until registered) */}
                <div className="tab-stagger-block">
                  <ShareInstallPanel
                    couponCode={clientUser?.coupon || remoteConfig.publicCoupon}
                    couponsUnlocked={Boolean(clientUser)}
                    onGoToRegister={() => {
                      document.getElementById('client-auth-box')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    onToast={showToast}
                    logoUrl={activeLogo}
                    studioName={remoteConfig.studioName}
                    apkDownloadUrl={remoteConfig.apkDownloadUrl}
                  />
                </div>
              </section>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer
          className="border-t py-6 px-4 text-center space-y-2"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text)',
          }}
        >
          <div className="f text-2xl" style={{ color: 'var(--r)' }}>
            {remoteConfig.studioName}
          </div>
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>
            {ui.footer.info}
          </p>
          <div className="pt-1">
            <button
              type="button"
              className="si-btn si-btn-outline si-btn-sm"
              onClick={() => setShareModalOpen(true)}
            >
              <Share2 size={16} />
              {ui.footer.inviteDownload}
            </button>
          </div>
          <div>
            <button
              type="button"
              className="text-sm underline cursor-pointer bg-transparent border-0"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setAdminOpen(true)}
            >
              {ui.footer.artistArea}
            </button>
          </div>
        </footer>

        <SideScrollBar activeTab={activeTab} />

        {/* Back to Top */}
        <button
          type="button"
          onClick={scrollToTop}
          aria-label={ui.header.backToTop}
          title={ui.header.backToTop}
          aria-hidden={!showBackToTop}
          tabIndex={showBackToTop ? 0 : -1}
          className={`fixed right-4 bottom-20 z-20 inline-flex items-center gap-1.5 px-3.5 h-12 rounded-full border-2 font-bold text-sm uppercase tracking-wider shadow-lg cursor-pointer transition-all duration-200 hover:scale-105 ${
            showBackToTop
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3 pointer-events-none'
          }`}
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border-strong)',
            color: 'var(--accent-gold)',
          }}
        >
          <ArrowUp size={18} strokeWidth={2.5} aria-hidden="true" />
          <span className="hidden sm:inline">{ui.header.backToTopShort}</span>
        </button>

        {/* Floating WhatsApp Action */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="fixed right-4 bottom-4 z-20 w-14 h-14 rounded-full grid place-items-center shadow-lg transition-transform hover:scale-105"
          style={{
            background: 'var(--r)',
            color: 'var(--btn-text)',
          }}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
            <path d="M20.5 3.5A11.8 11.8 0 0 0 2 17.7L.5 23.5l6-1.6A11.8 11.8 0 0 0 20.5 3.5ZM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-3.5.9.9-3.4-.2-.4A9 9 0 1 1 12 21Zm5-6.7c-.3-.2-1.7-.9-2-.9s-.5-.2-.7.2-.8.9-1 1.1-.4.2-.7.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.5.2-.7l.5-.6c.2-.2.2-.4.3-.6s0-.4 0-.6-.7-1.7-.9-2.3c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.2 1.4 3.4a11.4 11.4 0 0 0 4.4 3.9c.6.3 1.1.5 1.5.6.6.2 1.2.2 1.7.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.1-1.4s-.2-.2-.5-.4Z" />
          </svg>
        </a>

        {/* Lightbox Modal for Portfolio Photos (Shared Element Transition) */}
        <AnimatePresence>
          {lightboxWork && (
            <motion.div
              key="portfolio-lightbox-backdrop"
              initial={prefersReduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReduced ? undefined : { opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.84)', backdropFilter: 'blur(6px)' }}
              onClick={() => setLightboxWork(null)}
              role="dialog"
              aria-modal="true"
              aria-label={tWorkTitle(lightboxWork.title)}
            >
              <motion.div
                initial={prefersReduced ? false : { opacity: 0.94, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReduced ? undefined : { opacity: 0, scale: 0.96, transition: { duration: 0.14 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.7 }}
                className="si-card max-w-lg w-full space-y-3 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  layoutId={prefersReduced ? undefined : `work-media-${lightboxWork.title}`}
                  transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.7 }}
                  className="w-full overflow-hidden rounded bg-black"
                >
                  <img
                    src={lightboxWork.src}
                    alt={tWorkTitle(lightboxWork.title)}
                    decoding="async"
                    className="w-full max-h-[58vh] object-contain mx-auto block"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
                <div>
                  <motion.h3
                    layoutId={prefersReduced ? undefined : `work-title-${lightboxWork.title}`}
                    layout="position"
                    transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.7 }}
                    className="text-2xl"
                  >
                    {tWorkTitle(lightboxWork.title)}
                  </motion.h3>
                  <motion.span
                    layoutId={prefersReduced ? undefined : `work-category-${lightboxWork.title}`}
                    layout="position"
                    transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.7 }}
                    className="inline-block font-semibold uppercase tracking-wider mt-0.5"
                    style={{ color: 'var(--accent-gold)' }}
                  >
                    {tCategory(lightboxWork.category)}
                  </motion.span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="si-btn"
                    onClick={() => handleWantStyle(lightboxWork.category)}
                  >
                    {ui.common.wantThisStyle}
                  </button>
                  <button type="button" className="si-btn si-btn-outline" onClick={() => setLightboxWork(null)}>
                    {ui.common.close}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </LayoutGroup>

        {/* Artist / Verified Firebase Admin Modal */}
        <AdminPanelModal
          open={adminOpen}
          onClose={() => {
            setAdminOpen(false);
            setAdminInitialSection('agenda');
          }}
          firebaseAdminUser={firebaseUser}
          remoteConfig={remoteConfig}
          savedQuotes={savedQuotes}
          faqItems={faqItems}
          initialSection={adminInitialSection}
          onToast={showToast}
        />

        {/* Slide-over Settings & Navigation Drawer */}
        <SettingsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          isDark={prefs.isDark}
          onToggleTheme={(dark) => setPrefs((p) => ({ ...p, isDark: dark }))}
          fontScale={prefs.fontScale}
          onChangeFontScale={(fontScale) => setPrefs((p) => ({ ...p, fontScale }))}
          highContrast={prefs.highContrast}
          onToggleHighContrast={(highContrast) => setPrefs((p) => ({ ...p, highContrast }))}
          language={prefs.language}
          onChangeLanguage={onChangeLanguage}
          activeTab={activeTab}
          onSelectTab={switchTab}
          isLoggedIn={Boolean(clientUser)}
          onOpenAdmin={() => setAdminOpen(true)}
          onOpenShareInstall={() => setShareModalOpen(true)}
          onOpenTutorial={() => {
            setTutorialReason('manual');
            setTutorialOpen(true);
          }}
        />

        {/* Share & QR Code Modal */}
        {shareModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.82)' }}
            onClick={() => setShareModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={ui.share.title}
          >
            <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end">
                <button
                  type="button"
                  aria-label={ui.common.close}
                  onClick={() => setShareModalOpen(false)}
                  className="si-btn si-btn-outline si-btn-sm"
                  style={{ background: 'var(--card)' }}
                >
                  <X size={18} />
                  {ui.common.close}
                </button>
              </div>
              <ShareInstallPanel
                couponCode={clientUser?.coupon || remoteConfig.publicCoupon}
                couponsUnlocked={Boolean(clientUser)}
                onGoToRegister={() => {
                  setShareModalOpen(false);
                  switchTab('indicacao');
                }}
                onToast={showToast}
                logoUrl={activeLogo}
                studioName={remoteConfig.studioName}
                apkDownloadUrl={remoteConfig.apkDownloadUrl}
              />
            </div>
          </div>
        )}

        {/* Automatic Guest Install Modal */}
        <GuestInstallModal
          open={guestInstallOpen}
          onClose={() => setGuestInstallOpen(false)}
          couponCode={guestInviteCoupon}
          onToast={showToast}
          logoUrl={activeLogo}
          studioName={remoteConfig.studioName}
          apkDownloadUrl={remoteConfig.apkDownloadUrl}
        />

        {/* Interactive Tutorial */}
        <OnboardingTutorial
          open={tutorialOpen && connPhase === 'online'}
          reason={tutorialReason}
          onClose={handleCloseTutorial}
          onNavigate={(target) => {
            handleCloseTutorial();
            navigateToTarget(target);
          }}
        />

        {/* Offline Glitch Screen */}
        {connPhase !== 'online' && (
          <OfflineGlitchScreen
            phase={connPhase}
            onReconnect={() => setConnPhase('welcoming')}
            onWelcomeComplete={() => setConnPhase('online')}
          />
        )}

        {/* Desktop Interactive Side Edge Slide Arrows */}
        {(() => {
          const curIdx = TABS.findIndex((t) => t.id === activeTab);
          const prevTab = curIdx > 0 ? TABS[curIdx - 1] : null;
          const nextTab = curIdx >= 0 && curIdx < TABS.length - 1 ? TABS[curIdx + 1] : null;
          const modalBlocking =
            Boolean(lightboxWork) ||
            adminOpen ||
            drawerOpen ||
            shareModalOpen ||
            guestInstallOpen ||
            tutorialOpen ||
            connPhase !== 'online';
          if (modalBlocking) return null;

          return (
            <>
              {prevTab && (
                <button
                  type="button"
                  onClick={() => switchTab(prevTab.id)}
                  aria-label={`Aba anterior: ${ui.tabs[prevTab.id]}`}
                  title={`← ${ui.tabs[prevTab.id]}`}
                  className="hidden lg:flex fixed left-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-11 h-11 rounded-full border-2 shadow-lg cursor-pointer transition-transform duration-150 hover:scale-105 hover:-translate-x-0.5"
                  style={{
                    background: 'var(--card)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--accent-gold)',
                  }}
                >
                  <ChevronLeft size={22} strokeWidth={2.5} aria-hidden="true" />
                </button>
              )}

              {nextTab && (
                <button
                  type="button"
                  onClick={() => switchTab(nextTab.id)}
                  aria-label={`Próxima aba: ${ui.tabs[nextTab.id]}`}
                  title={`${ui.tabs[nextTab.id]} →`}
                  className="hidden lg:flex fixed right-7 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-11 h-11 rounded-full border-2 shadow-lg cursor-pointer transition-transform duration-150 hover:scale-105 hover:translate-x-0.5"
                  style={{
                    background: 'var(--card)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--accent-gold)',
                  }}
                >
                  <ChevronRight size={22} strokeWidth={2.5} aria-hidden="true" />
                </button>
              )}
            </>
          );
        })()}

        {/* 120fps Center-Swipe Tab Preview Indicator (direct DOM transform, no re-renders) */}
        <div
          ref={swipeHintRef}
          aria-hidden="true"
          className="fixed left-1/2 bottom-6 z-40 pointer-events-none px-4 py-2 rounded-full border-2 shadow-xl text-sm font-extrabold uppercase tracking-wider whitespace-nowrap will-change-transform"
          style={{
            opacity: 0,
            transform: 'translate3d(-50%, 14px, 0) scale(0.96)',
            transition: 'opacity 120ms ease-out',
            background: 'var(--card)',
            borderColor: 'var(--border-strong)',
            color: 'var(--accent-gold)',
          }}
        >
          <span ref={swipeHintLabelRef} />
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div
            role="status"
            aria-live="polite"
            className="fixed left-1/2 bottom-20 -translate-x-1/2 z-50 px-5 py-2.5 rounded font-bold shadow-xl"
            style={{
              background: 'var(--r)',
              color: 'var(--btn-text)',
            }}
          >
            {toastMsg}
          </div>
        )}
      </div>
    </>
  );
};

export default function App() {
  const [prefs, setPrefs] = useState<A11yPrefs>(readLocalPrefs);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Sync theme, font scale, contrast, and <html lang>
  useEffect(() => {
    const root = document.documentElement;
    root.lang = prefs.language;
    if (prefs.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const scaleMap: Record<FontScale, string> = {
      normal: '1',
      large: '1.14',
      xlarge: '1.26',
    };
    root.style.setProperty('--font-scale', scaleMap[prefs.fontScale]);
    if (prefs.highContrast) {
      root.setAttribute('data-contrast', 'high');
    } else {
      root.removeAttribute('data-contrast');
    }
    writeSignedStorage(PREFS_KEY, prefs);
  }, [prefs]);

  const handleChangeLanguage = useCallback(
    (nextLang: LanguageCode) => {
      setPrefs((p) => ({ ...p, language: nextLang }));
      showToast(UI_TRANSLATIONS[nextLang].settings.languageChangedToast);
    },
    [showToast]
  );

  return (
    <MotionConfig reducedMotion="user">
      <LanguageProvider lang={prefs.language} onChangeLang={handleChangeLanguage}>
        <AppContent
          prefs={prefs}
          setPrefs={setPrefs}
          onChangeLanguage={handleChangeLanguage}
          toastMsg={toastMsg}
          showToast={showToast}
        />
      </LanguageProvider>
    </MotionConfig>
  );
}
