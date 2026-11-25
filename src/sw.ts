import { clientsClaim } from 'workbox-core';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

interface PrecacheEntry {
  url: string;
  revision: string | null;
}

interface SwWindowClient {
  url: string;
  focused?: boolean;
  focus(): Promise<SwWindowClient>;
}

interface SwClients {
  matchAll(options?: { type?: 'window' | 'worker' | 'sharedworker' | 'all'; includeUncontrolled?: boolean }): Promise<SwWindowClient[]>;
  openWindow(url: string): Promise<SwWindowClient | null>;
}

interface SwNotificationAction {
  action: string;
  title: string;
}

interface SwNotificationOptions extends NotificationOptions {
  renotify?: boolean;
  actions?: SwNotificationAction[];
  data?: {
    url?: string;
    whatsappUrl?: string;
    bookingId?: string;
    date?: string;
    time?: string;
  };
}

interface SwNotificationInstance {
  data?: {
    url?: string;
    whatsappUrl?: string;
    bookingId?: string;
    date?: string;
    time?: string;
  };
  close(): void;
}

interface SwRegistration extends ServiceWorkerRegistration {
  showNotification(title: string, options?: SwNotificationOptions): Promise<void>;
}

interface SwExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface SwPushEvent extends SwExtendableEvent {
  data: {
    json(): unknown;
    text(): string;
  } | null;
}

interface SwNotificationEvent extends SwExtendableEvent {
  action: string;
  notification: SwNotificationInstance;
}

interface SwMessageEvent extends SwExtendableEvent {
  data: { type?: string } | null;
}

interface SwGlobalScope {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
  location: Location;
  clients: SwClients;
  registration: SwRegistration;
  skipWaiting(): Promise<void>;
  addEventListener(type: 'push', listener: (event: SwPushEvent) => void): void;
  addEventListener(type: 'notificationclick', listener: (event: SwNotificationEvent) => void): void;
  addEventListener(type: 'message', listener: (event: SwMessageEvent) => void): void;
}

declare const self: SwGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);
void self.skipWaiting();
clientsClaim();

registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

interface IncomingPushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  whatsappUrl?: string;
  bookingId?: string;
  date?: string;
  time?: string;
  actions?: SwNotificationAction[];
}

function safeRelativeAppUrl(raw?: string): string {
  if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }
  return '/?tab=agendamento';
}

function safeWhatsAppUrl(raw?: string): string | undefined {
  if (typeof raw === 'string' && /^https:\/\/wa\.me\/[0-9]{8,16}(\?.*)?$/i.test(raw)) {
    return raw;
  }
  return undefined;
}

self.addEventListener('push', (event: SwPushEvent) => {
  let payload: IncomingPushPayload = {};
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        payload = parsed as IncomingPushPayload;
      }
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) payload = { body: text };
    } catch {
      payload = {};
    }
  }

  const title = payload.title || 'Lembrete de Sessão · Schullz Ink';
  const body =
    payload.body ||
    'Sua sessão de tatuagem está marcada para daqui a 24 horas. Confira os detalhes na aba Agendar.';
  const safeWa = safeWhatsAppUrl(payload.whatsappUrl);
  const actions: SwNotificationAction[] = Array.isArray(payload.actions) && payload.actions.length > 0
    ? payload.actions.slice(0, 2)
    : [
        { action: 'open-app', title: 'Ver Agendamento' },
        ...(safeWa ? [{ action: 'open-whatsapp', title: 'Abrir WhatsApp' }] : []),
      ];

  const options: SwNotificationOptions = {
    body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag || (payload.bookingId ? `schullz-reminder-${payload.bookingId}` : 'schullz-reminder'),
    renotify: true,
    requireInteraction: true,
    actions,
    data: {
      url: safeRelativeAppUrl(payload.url),
      whatsappUrl: safeWa,
      bookingId: payload.bookingId,
      date: payload.date,
      time: payload.time,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: SwNotificationEvent) => {
  event.notification.close();
  const data = event.notification.data || {};
  const whatsappUrl = safeWhatsAppUrl(data.whatsappUrl);
  const appUrl = safeRelativeAppUrl(data.url);

  event.waitUntil(
    (async () => {
      if (event.action === 'open-whatsapp' && whatsappUrl) {
        await self.clients.openWindow(whatsappUrl);
        return;
      }

      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      const targetHref = new URL(appUrl, self.location.origin).href;
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(targetHref);
    })()
  );
});

self.addEventListener('message', (event: SwMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
