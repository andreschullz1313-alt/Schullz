import { PWA_ICON_URI, STUDIO_LOGO_URI } from '../assets/studioMedia';

export type AppIssueCategory = 'connection' | 'security' | 'bug' | 'update';

export interface AppIssueEvent {
  id: string;
  category: AppIssueCategory;
  title: string;
  message: string;
  timestamp: string;
  count: number;
}

type Listener = (events: AppIssueEvent[]) => void;

const MAX_EVENTS = 15;
let activeEvents: AppIssueEvent[] = [];
const listeners = new Set<Listener>();
let currentLogoUrl: string = STUDIO_LOGO_URI || PWA_ICON_URI;
let globalHooksInstalled = false;

function emit() {
  const snapshot = [...activeEvents];
  listeners.forEach((fn) => fn(snapshot));
}

export function setMonitorLogoUrl(url?: string | null): void {
  if (url && typeof url === 'string' && url.trim().length > 0) {
    currentLogoUrl = url;
  } else {
    currentLogoUrl = STUDIO_LOGO_URI || PWA_ICON_URI;
  }
}

export function getMonitorLogoUrl(): string {
  return currentLogoUrl;
}

export function getAppIssues(): AppIssueEvent[] {
  return [...activeEvents];
}

export function subscribeAppIssues(fn: Listener): () => void {
  listeners.add(fn);
  fn([...activeEvents]);
  return () => {
    listeners.delete(fn);
  };
}

export function dismissAppIssue(id: string): void {
  activeEvents = activeEvents.filter((ev) => ev.id !== id);
  emit();
}

export function clearAppIssuesByCategory(category: AppIssueCategory): void {
  activeEvents = activeEvents.filter((ev) => ev.category !== category);
  emit();
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    if (Notification.permission === 'granted') return 'granted';
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

async function dispatchSystemBarNotification(event: AppIssueEvent): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const iconUrl = currentLogoUrl || '/pwa-192x192.png';
  const badgeUrl = '/pwa-192x192.png';
  const options: NotificationOptions = {
    body: event.message,
    icon: iconUrl,
    badge: badgeUrl,
    tag: `schullz-alert-${event.category}`,
    silent: false,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(event.title, options);
        return;
      }
    }
    new Notification(event.title, options);
  } catch {
    // Fallback if OS/iframe blocks system notification
    try {
      new Notification(event.title, options);
    } catch {
      // ignore cleanly; in-app notification bar still displays with logo
    }
  }
}

export function notifyAppIssue(input: {
  category: AppIssueCategory;
  title: string;
  message: string;
  silentSystem?: boolean;
}): void {
  const now = new Date().toISOString();
  const cleanMsg = input.message.slice(0, 260);
  const existingIdx = activeEvents.findIndex(
    (e) => e.category === input.category && e.message === cleanMsg
  );

  let targetEvent: AppIssueEvent;
  if (existingIdx >= 0) {
    targetEvent = {
      ...activeEvents[existingIdx],
      timestamp: now,
      count: activeEvents[existingIdx].count + 1,
    };
    activeEvents = [
      targetEvent,
      ...activeEvents.filter((_, idx) => idx !== existingIdx),
    ];
  } else {
    targetEvent = {
      id: `${input.category}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: input.category,
      title: input.title.slice(0, 90),
      message: cleanMsg,
      timestamp: now,
      count: 1,
    };
    activeEvents = [targetEvent, ...activeEvents].slice(0, MAX_EVENTS);
  }

  emit();

  if (!input.silentSystem) {
    void dispatchSystemBarNotification(targetEvent);
  }
}

export function installGlobalErrorMonitor(): void {
  if (globalHooksInstalled || typeof window === 'undefined') return;
  globalHooksInstalled = true;

  window.addEventListener('error', (ev) => {
    // Ignore benign WebSocket HMR errors in preview or ResizeObserver noise
    const msg = ev.message || 'Erro inesperado no aplicativo.';
    if (/ResizeObserver|WebSocket/i.test(msg)) return;
    notifyAppIssue({
      category: 'bug',
      title: 'Schullz Ink · Alerta de Erro',
      message: msg,
    });
  });

  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev.reason instanceof Error ? ev.reason.message : String(ev.reason || '');
    if (!reason || /WebSocket|AbortError/i.test(reason)) return;
    notifyAppIssue({
      category: 'bug',
      title: 'Schullz Ink · Falha Assíncrona',
      message: reason,
    });
  });

  window.addEventListener('offline', () => {
    notifyAppIssue({
      category: 'connection',
      title: 'Schullz Ink · Sem Conexão',
      message: 'Conexão com a internet perdida. Recursos em cache permanecem disponíveis.',
    });
  });

  window.addEventListener('online', () => {
    clearAppIssuesByCategory('connection');
  });
}
