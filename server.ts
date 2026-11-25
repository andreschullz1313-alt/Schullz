import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { isIP } from 'node:net';
import path from 'node:path';
import express from 'express';
import type { Request, Response } from 'express';
import { generateVAPIDKeys, sendNotification, setVapidDetails } from 'web-push';

interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface StoredPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: PushSubscriptionKeys;
}

type ReminderJobStatus = 'pending' | 'sent' | 'cancelled' | 'failed';
type TriggerMode = '24h_before' | 'immediate_upcoming';

interface ReminderJob {
  id: string;
  bookingId: string;
  date: string;
  time: string;
  appointmentAtMs: number;
  triggerAtMs: number;
  triggerMode: TriggerMode;
  clientName: string;
  studioName: string;
  style: string;
  bodyZone: string;
  size: string;
  whatsappUrl?: string;
  subscription: StoredPushSubscription;
  cancelTokenHash: string;
  status: ReminderJobStatus;
  attempts: number;
  createdAtIso: string;
  sentAtIso?: string;
  lastError?: string;
}

interface PushStoreData {
  vapid?: {
    publicKey: string;
    privateKey: string;
    subject: string;
  };
  jobs: ReminderJob[];
}

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ROOT_DIR = import.meta.dirname;
const DATA_DIR = path.resolve(ROOT_DIR, '.data');
const STORE_PATH = path.resolve(DATA_DIR, 'webpush-store.json');
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const DISPATCH_INTERVAL_MS = 20_000;

const DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const TIME_RE = /^[0-9]{2}:[0-9]{2}$/;
const BASE64URL_RE = /^[A-Za-z0-9\-_]+={0,2}$/;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

function readStore(): PushStoreData {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) {
    return { jobs: [] };
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PushStoreData>;
    return {
      vapid:
        parsed.vapid &&
        typeof parsed.vapid.publicKey === 'string' &&
        typeof parsed.vapid.privateKey === 'string'
          ? {
              publicKey: parsed.vapid.publicKey,
              privateKey: parsed.vapid.privateKey,
              subject:
                typeof parsed.vapid.subject === 'string'
                  ? parsed.vapid.subject
                  : 'mailto:andreschullz1313@gmail.com',
            }
          : undefined,
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    };
  } catch {
    return { jobs: [] };
  }
}

function writeStore(data: PushStoreData): void {
  ensureDataDir();
  const tmpPath = `${STORE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmpPath, STORE_PATH);
}

let store: PushStoreData = readStore();

function initVapid(): { publicKey: string; privateKey: string; subject: string } {
  const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  const envSubject =
    process.env.VAPID_SUBJECT?.trim() || 'mailto:andreschullz1313@gmail.com';

  if (envPub && envPriv) {
    setVapidDetails(envSubject, envPub, envPriv);
    return { publicKey: envPub, privateKey: envPriv, subject: envSubject };
  }

  if (store.vapid?.publicKey && store.vapid?.privateKey) {
    setVapidDetails(
      store.vapid.subject,
      store.vapid.publicKey,
      store.vapid.privateKey
    );
    return store.vapid;
  }

  const generated = generateVAPIDKeys();
  const vapid = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: envSubject,
  };
  store.vapid = vapid;
  writeStore(store);
  setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  return vapid;
}

const activeVapid = initVapid();

function isPrivateOrBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === 'metadata.google.internal'
  ) {
    return true;
  }

  const ipType = isIP(lower);
  if (ipType === 4) {
    const parts = lower.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }

  if (ipType === 6) {
    if (
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('::ffff:127.') ||
      lower.startsWith('::ffff:10.') ||
      lower.startsWith('::ffff:192.168.') ||
      lower.startsWith('::ffff:169.254.')
    ) {
      return true;
    }
    return false;
  }

  return false;
}

function validatePushSubscription(raw: unknown): StoredPushSubscription | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.endpoint !== 'string') return null;
  const endpointStr = candidate.endpoint.trim();
  if (endpointStr.length < 16 || endpointStr.length > 2048) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(endpointStr);
  } catch {
    return null;
  }
  if (parsedUrl.protocol !== 'https:' || isPrivateOrBlockedHost(parsedUrl.hostname)) {
    return null;
  }

  if (!candidate.keys || typeof candidate.keys !== 'object') return null;
  const keys = candidate.keys as Record<string, unknown>;
  if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return null;
  const p256dh = keys.p256dh.trim();
  const authKey = keys.auth.trim();
  if (
    p256dh.length < 32 ||
    p256dh.length > 512 ||
    authKey.length < 16 ||
    authKey.length > 256 ||
    !BASE64URL_RE.test(p256dh) ||
    !BASE64URL_RE.test(authKey)
  ) {
    return null;
  }

  return {
    endpoint: parsedUrl.toString(),
    expirationTime:
      typeof candidate.expirationTime === 'number' || candidate.expirationTime === null
        ? candidate.expirationTime
        : null,
    keys: {
      p256dh,
      auth: authKey,
    },
  };
}

function sanitizeText(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  const clean = val.replace(/[<>]/g, '').trim().slice(0, maxLen);
  return clean || fallback;
}

function sanitizeWhatsAppUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (trimmed.length > 2000) return undefined;
  if (/^https:\/\/wa\.me\/[0-9]{8,16}(\?.*)?$/i.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function verifyTokenHash(rawToken: string, expectedHexHash: string): boolean {
  const actualBuf = Buffer.from(hashToken(rawToken), 'hex');
  const expectedBuf = Buffer.from(expectedHexHash, 'hex');
  if (actualBuf.length !== expectedBuf.length || actualBuf.length === 0) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function formatDateBr(dateIso: string): string {
  if (!DATE_RE.test(dateIso)) return dateIso;
  const [y, m, d] = dateIso.split('-');
  return `${d}/${m}/${y}`;
}

function buildReminderNotificationPayload(job: ReminderJob): string {
  const dateBr = formatDateBr(job.date);
  const title =
    job.triggerMode === 'immediate_upcoming'
      ? `Lembrete de Sessão · ${job.studioName}`
      : `Faltam 24h para sua Tattoo · ${job.studioName}`;

  const body =
    job.triggerMode === 'immediate_upcoming'
      ? `${job.clientName}, sua sessão (${job.style} · ${job.bodyZone}) está marcada para ${dateBr} às ${job.time}. Lembre-se de confirmar o sinal de 50% via WhatsApp.`
      : `Olá ${job.clientName}! Amanhã (${dateBr}) às ${job.time} é sua sessão de ${job.style} (${job.bodyZone}). Hidrate a pele, descanse bem e confirme os detalhes no WhatsApp.`;

  return JSON.stringify({
    title,
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `schullz-reminder-${job.bookingId}`,
    url: '/?tab=agendamento',
    whatsappUrl: job.whatsappUrl,
    bookingId: job.bookingId,
    date: job.date,
    time: job.time,
  });
}

let sweepRunning = false;

async function processDuePushJobs(): Promise<void> {
  if (sweepRunning) return;
  sweepRunning = true;
  try {
    const now = Date.now();
    let changed = false;

    for (const job of store.jobs) {
      if (job.status !== 'pending') continue;
      if (job.triggerAtMs > now) continue;

      // Drop extremely stale reminders (> 12h past appointment)
      if (now > job.appointmentAtMs + 12 * 60 * 60 * 1000) {
        job.status = 'failed';
        job.lastError = 'Horário da sessão expirado antes do envio.';
        changed = true;
        continue;
      }

      job.attempts += 1;
      try {
        await sendNotification(
          job.subscription,
          buildReminderNotificationPayload(job),
          { TTL: 60 * 60 * 6 }
        );
        job.status = 'sent';
        job.sentAtIso = new Date().toISOString();
        job.lastError = undefined;
        changed = true;
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410 || job.attempts >= 3) {
          job.status = 'failed';
          job.lastError =
            statusCode === 404 || statusCode === 410
              ? 'Assinatura push expirada no navegador.'
              : 'Falha ao entregar notificação após múltiplas tentativas.';
        } else {
          // Retry in 60s
          job.triggerAtMs = Date.now() + 60_000;
          job.lastError = 'Tentativa adiada temporariamente.';
        }
        changed = true;
      }
    }

    if (changed) {
      // Prune completed/cancelled jobs older than 45 days
      const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
      store.jobs = store.jobs.filter((j) => {
        if (j.status === 'pending') return true;
        return j.appointmentAtMs >= cutoff;
      });
      writeStore(store);
    }
  } finally {
    sweepRunning = false;
  }
}

async function createServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/push/vapid-public-key', (_req: Request, res: Response) => {
    res.json({ publicKey: activeVapid.publicKey });
  });

  app.post('/api/push/schedule', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Corpo da requisição inválido.' });
      return;
    }

    const subscription = validatePushSubscription(body.subscription);
    if (!subscription) {
      res.status(400).json({ error: 'Assinatura Web Push inválida ou não permitida.' });
      return;
    }

    const bookingId = sanitizeText(body.bookingId, 64);
    const date = sanitizeText(body.date, 16);
    const time = sanitizeText(body.time, 8);
    if (!bookingId || !DATE_RE.test(date) || !TIME_RE.test(time)) {
      res.status(400).json({ error: 'Dados do agendamento incompletos ou inválidos.' });
      return;
    }

    let appointmentAtMs = Number.NaN;
    if (typeof body.appointmentIso === 'string') {
      const parsed = Date.parse(body.appointmentIso);
      if (Number.isFinite(parsed)) {
        appointmentAtMs = parsed;
      }
    }
    if (!Number.isFinite(appointmentAtMs)) {
      appointmentAtMs = Date.parse(`${date}T${time}:00-03:00`);
    }

    const now = Date.now();
    if (!Number.isFinite(appointmentAtMs) || appointmentAtMs <= now) {
      res.status(400).json({ error: 'O horário selecionado já passou.' });
      return;
    }

    let triggerAtMs = appointmentAtMs - TWENTY_FOUR_HOURS_MS;
    let triggerMode: TriggerMode = '24h_before';
    if (triggerAtMs <= now) {
      // Appointment is within the next 24h: dispatch reminder shortly (~8s)
      triggerAtMs = now + 8_000;
      triggerMode = 'immediate_upcoming';
    }

    const clientName = sanitizeText(body.clientName, 60, 'Cliente');
    const studioName = sanitizeText(body.studioName, 60, 'Schullz Ink Tattoo');
    const style = sanitizeText(body.style, 40, 'Tatuagem');
    const bodyZone = sanitizeText(body.bodyZone, 50, 'A definir');
    const size = sanitizeText(body.size, 60, 'Sessão');
    const whatsappUrl = sanitizeWhatsAppUrl(body.whatsappUrl);

    const cancelToken = crypto.randomBytes(24).toString('hex');
    const reminderId = `push_${crypto.randomUUID()}`;

    // Replace any existing pending reminder for the same bookingId
    store.jobs = store.jobs.filter(
      (j) => !(j.bookingId === bookingId && j.status === 'pending')
    );

    const job: ReminderJob = {
      id: reminderId,
      bookingId,
      date,
      time,
      appointmentAtMs,
      triggerAtMs,
      triggerMode,
      clientName,
      studioName,
      style,
      bodyZone,
      size,
      whatsappUrl,
      subscription,
      cancelTokenHash: hashToken(cancelToken),
      status: 'pending',
      attempts: 0,
      createdAtIso: new Date().toISOString(),
    };

    store.jobs.push(job);
    writeStore(store);

    if (triggerMode === 'immediate_upcoming') {
      setTimeout(() => {
        void processDuePushJobs();
      }, 8_200);
    }

    res.status(201).json({
      reminderId,
      bookingId,
      triggerAtIso: new Date(triggerAtMs).toISOString(),
      triggerMode,
      cancelToken,
    });
  });

  app.post('/api/push/cancel', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    const reminderId = sanitizeText(body?.reminderId, 80);
    const cancelToken = typeof body?.cancelToken === 'string' ? body.cancelToken.trim() : '';

    if (!reminderId || !cancelToken) {
      res.status(400).json({ error: 'Identificador e token de cancelamento são obrigatórios.' });
      return;
    }

    const job = store.jobs.find((j) => j.id === reminderId);
    if (!job || !verifyTokenHash(cancelToken, job.cancelTokenHash)) {
      res.status(404).json({ error: 'Lembrete não encontrado ou token inválido.' });
      return;
    }

    if (job.status === 'pending') {
      job.status = 'cancelled';
      writeStore(store);
    }

    res.json({ ok: true, status: job.status });
  });

  app.post('/api/push/test', async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    const subscription = validatePushSubscription(body?.subscription);
    if (!subscription) {
      res.status(400).json({ error: 'Assinatura Web Push inválida.' });
      return;
    }

    const studioName = sanitizeText(body?.studioName, 60, 'Schullz Ink Tattoo');
    const whatsappUrl = sanitizeWhatsAppUrl(body?.whatsappUrl);

    try {
      await sendNotification(
        subscription,
        JSON.stringify({
          title: `Lembretes Ativos · ${studioName}`,
          body: 'Tudo certo! Você receberá uma notificação automática 24h antes da sua sessão agendada via WhatsApp.',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'schullz-push-test',
          url: '/?tab=agendamento',
          whatsappUrl,
        }),
        { TTL: 300 }
      );
      res.json({ ok: true });
    } catch {
      res.status(502).json({
        error: 'Não foi possível enviar a notificação push neste navegador.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Schullz Ink server running on http://${HOST}:${PORT}`);
  });

  void processDuePushJobs();
  setInterval(() => {
    void processDuePushJobs();
  }, DISPATCH_INTERVAL_MS);
}

void createServer();
