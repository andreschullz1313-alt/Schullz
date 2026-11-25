import { notifyAppIssue } from './appMonitor';

const SIG_PREFIX = 'schullz_sig_v1_';
const ADMIN_LOCK_KEY = 'schullz_admin_guard_v1';
const SALT = 'SCHULLZ_INK_2026_INTEGRITY_LAYER';

const THREAT_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'Script/HTML Injection', regex: /<\s*script|javascript:|vbscript:|data:text\/html/i },
  { name: 'Inline Event Handler', regex: /\bon(error|load|click|mouseover|focus)\s*=/i },
  { name: 'Prototype Pollution', regex: /(__proto__|constructor\.prototype|Object\.prototype)/i },
  { name: 'Query Operator Tampering', regex: /(\$where|\$ne|\$gt|\$regex|\beval\s*\(|\bnew\s+Function\s*\()/i },
];

export function inspectForThreats(value: string, contextLabel: string): { safe: boolean; reason?: string } {
  if (!value) return { safe: true };
  for (const rule of THREAT_PATTERNS) {
    if (rule.regex.test(value)) {
      notifyAppIssue({
        category: 'security',
        title: 'Schullz Ink · Proteção de Segurança',
        message: `Tentativa suspeita bloqueada (${rule.name}) em ${contextLabel}.`,
      });
      return { safe: false, reason: rule.name };
    }
  }
  return { safe: true };
}

export function sanitizeCleanText(value: string, maxLen = 400): string {
  return value.replace(/[<>]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

export function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function computeDigestSync(payload: string): string {
  // Fast deterministic FNV-1a + salted fold for synchronous localStorage integrity verification
  const origin = typeof window !== 'undefined' ? window.location.origin : 'app';
  const input = `${SALT}::${origin}::${payload}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + (i & 255);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(36)}-${(h2 >>> 0).toString(36)}-${input.length.toString(36)}`;
}

export function writeSignedStorage<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    const sig = computeDigestSync(serialized);
    localStorage.setItem(key, serialized);
    localStorage.setItem(`${SIG_PREFIX}${key}`, sig);
  } catch {
    // ignore storage quota errors
  }
}

export function readVerifiedStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const threatCheck = inspectForThreats(raw, `armazenamento (${key})`);
    if (!threatCheck.safe) {
      localStorage.removeItem(key);
      localStorage.removeItem(`${SIG_PREFIX}${key}`);
      return fallback;
    }

    const expectedSig = computeDigestSync(raw);
    const storedSig = localStorage.getItem(`${SIG_PREFIX}${key}`);

    if (!storedSig) {
      // Legacy storage created before signing layer: parse cleanly and seal with signature
      const parsed = JSON.parse(raw) as T;
      localStorage.setItem(`${SIG_PREFIX}${key}`, expectedSig);
      return parsed;
    }

    if (storedSig !== expectedSig) {
      notifyAppIssue({
        category: 'security',
        title: 'Schullz Ink · Alerta de Integridade',
        message: 'Alteração externa não autorizada detectada nos dados locais. Sessão protegida foi redefinida.',
      });
      localStorage.removeItem(key);
      localStorage.removeItem(`${SIG_PREFIX}${key}`);
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface AdminGuardState {
  failedAttempts: number;
  lockedUntil: number;
}

export function checkAdminLockout(): { locked: boolean; remainingSec: number } {
  try {
    const raw = localStorage.getItem(ADMIN_LOCK_KEY);
    if (!raw) return { locked: false, remainingSec: 0 };
    const state = JSON.parse(raw) as AdminGuardState;
    const now = Date.now();
    if (state.lockedUntil && state.lockedUntil > now) {
      return { locked: true, remainingSec: Math.ceil((state.lockedUntil - now) / 1000) };
    }
    return { locked: false, remainingSec: 0 };
  } catch {
    return { locked: false, remainingSec: 0 };
  }
}

export function recordUnauthorizedAdminAttempt(attemptedEmail?: string | null): {
  locked: boolean;
  remainingSec: number;
} {
  let state: AdminGuardState = { failedAttempts: 0, lockedUntil: 0 };
  try {
    const raw = localStorage.getItem(ADMIN_LOCK_KEY);
    if (raw) state = JSON.parse(raw) as AdminGuardState;
  } catch {
    // reset cleanly
  }

  const nextAttempts = (state.failedAttempts || 0) + 1;
  const shouldLock = nextAttempts >= 3;
  const lockedUntil = shouldLock ? Date.now() + 60_000 : 0;

  try {
    localStorage.setItem(
      ADMIN_LOCK_KEY,
      JSON.stringify({ failedAttempts: shouldLock ? 0 : nextAttempts, lockedUntil })
    );
  } catch {
    // ignore
  }

  notifyAppIssue({
    category: 'security',
    title: 'Schullz Ink · Tentativa de Acesso Admin',
    message: attemptedEmail
      ? `Conta não autorizada (${attemptedEmail}) tentou acessar o painel administrativo.`
      : 'Tentativa não autorizada de burlar o acesso administrativo bloqueada.',
  });

  return {
    locked: shouldLock,
    remainingSec: shouldLock ? 60 : 0,
  };
}

export function resetAdminLockout(): void {
  try {
    localStorage.removeItem(ADMIN_LOCK_KEY);
  } catch {
    // ignore
  }
}
