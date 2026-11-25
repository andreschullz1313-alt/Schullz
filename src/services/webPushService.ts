export interface PushReminderMeta {
  reminderId: string;
  triggerAtIso: string;
  triggerMode: '24h_before' | 'immediate_upcoming';
  cancelToken: string;
  status: 'scheduled' | 'cancelled';
}

export interface SchedulePushReminderInput {
  bookingId: string;
  date: string;
  time: string;
  clientName: string;
  studioName: string;
  style: string;
  bodyZone: string;
  size: string;
  whatsappUrl: string;
}

export type PushPermissionStatus = NotificationPermission | 'unsupported';

export function isWebPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function getWebPushPermission(): PushPermissionStatus {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch('/api/push/vapid-public-key', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error('Servidor de notificações push indisponível no momento.');
  }
  const data = (await res.json()) as { publicKey?: string };
  if (!data.publicKey || typeof data.publicKey !== 'string') {
    throw new Error('Chave pública VAPID inválida.');
  }
  return data.publicKey;
}

async function getReadyServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error('Service Worker não ficou ativo a tempo. Recarregue a página e tente novamente.'));
      }, 6000);
    }),
  ]);
  return registration;
}

export async function ensurePushSubscription(): Promise<PushSubscription> {
  if (!isWebPushSupported()) {
    throw new Error('Este navegador não suporta Web Push API.');
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    throw new Error('Permissão de notificações negada no navegador.');
  }

  const registration = await getReadyServiceWorkerRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  const publicKey = await fetchVapidPublicKey();
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

export async function schedule24hPushReminder(
  input: SchedulePushReminderInput
): Promise<PushReminderMeta> {
  const subscription = await ensurePushSubscription();

  // Build local-browser ISO timestamp for exact client timezone 24h offset
  const [y, m, d] = input.date.split('-').map(Number);
  const [hh, mm] = input.time.split(':').map(Number);
  const localAppointmentDate = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);

  const res = await fetch('/api/push/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookingId: input.bookingId,
      date: input.date,
      time: input.time,
      appointmentIso: localAppointmentDate.toISOString(),
      clientName: input.clientName,
      studioName: input.studioName,
      style: input.style,
      bodyZone: input.bodyZone,
      size: input.size,
      whatsappUrl: input.whatsappUrl,
      subscription: subscription.toJSON(),
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    reminderId?: string;
    triggerAtIso?: string;
    triggerMode?: '24h_before' | 'immediate_upcoming';
    cancelToken?: string;
    error?: string;
  };

  if (!res.ok || !payload.reminderId || !payload.triggerAtIso || !payload.cancelToken) {
    throw new Error(payload.error || 'Não foi possível agendar o lembrete push de 24h.');
  }

  return {
    reminderId: payload.reminderId,
    triggerAtIso: payload.triggerAtIso,
    triggerMode: payload.triggerMode || '24h_before',
    cancelToken: payload.cancelToken,
    status: 'scheduled',
  };
}

export async function cancelScheduledPushReminder(
  reminderId: string,
  cancelToken: string
): Promise<void> {
  const res = await fetch('/api/push/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reminderId, cancelToken }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'Não foi possível cancelar o lembrete push.');
  }
}

export async function sendTestWebPush(
  studioName: string,
  whatsappUrl?: string
): Promise<void> {
  const subscription = await ensurePushSubscription();
  const res = await fetch('/api/push/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studioName,
      whatsappUrl,
      subscription: subscription.toJSON(),
    }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'Falha ao disparar notificação de teste.');
  }
}

export function formatReminderDateTimeBR(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
