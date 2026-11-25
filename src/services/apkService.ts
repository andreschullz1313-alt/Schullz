import { STUDIO_DEFAULTS } from '../data/studioData';

export const DEFAULT_APK_PUBLIC_PATH = '/downloads/SchullzInkTattoo.apk';
export const DEFAULT_APK_FILENAME = 'SchullzInkTattoo.apk';

export function isValidApkSourceUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (/^\/downloads\/[a-zA-Z0-9._-]+\.apk$/i.test(trimmed)) return true;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function checkApkAvailability(
  configuredApkUrl?: string
): Promise<{ available: boolean; url: string | null }> {
  const trimmed = (configuredApkUrl || '').trim();
  if (trimmed && isValidApkSourceUrl(trimmed)) {
    if (trimmed.startsWith('/')) {
      const ok = await probeLocalBinaryApk(trimmed);
      return ok ? { available: true, url: trimmed } : { available: false, url: null };
    }
    return { available: true, url: trimmed };
  }

  const localOk = await probeLocalBinaryApk(DEFAULT_APK_PUBLIC_PATH);
  return localOk
    ? { available: true, url: DEFAULT_APK_PUBLIC_PATH }
    : { available: false, url: null };
}

async function probeLocalBinaryApk(path: string): Promise<boolean> {
  try {
    const res = await fetch(path, { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) return false;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    // Vite dev/preview returns index.html (text/html) for missing files — reject HTML fallbacks
    if (ct.includes('text/html') || ct.includes('application/javascript')) {
      return false;
    }
    const size = Number(res.headers.get('content-length') || 0);
    return Number.isFinite(size) && size > 10000;
  } catch {
    return false;
  }
}

/**
 * Triggers a direct APK download in the current mobile/desktop browser without opening a new tab.
 */
export async function triggerDirectApkDownload(
  apkUrl: string,
  filename: string = DEFAULT_APK_FILENAME
): Promise<void> {
  if (typeof document === 'undefined') return;

  // Attempt Blob download first when same-origin or CORS permits, guaranteeing a pure file save without tab navigation
  if (apkUrl.startsWith('/')) {
    const response = await fetch(apkUrl, { cache: 'no-store' });
    const ct = (response.headers.get('content-type') || '').toLowerCase();
    if (!response.ok || ct.includes('text/html')) {
      throw new Error('Arquivo APK ainda não publicado neste endereço.');
    }
    const rawBlob = await response.blob();
    const apkBlob = new Blob([rawBlob], {
      type: 'application/vnd.android.package-archive',
    });
    const blobUrl = URL.createObjectURL(apkBlob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
    return;
  }

  // External HTTPS APK host: use same-window direct download anchor (no target="_blank")
  const a = document.createElement('a');
  a.href = apkUrl;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function downloadTwaManifestTemplate(params: {
  studioName: string;
  primaryColor: string;
  bgDarkColor: string;
}): void {
  const origin =
    typeof window !== 'undefined' && window.location.origin.startsWith('https://')
      ? window.location.origin
      : 'https://seu-dominio-publicado.web.app';
  const host = origin.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  const manifest = {
    packageId: 'app.schullzink.twa',
    host,
    name: params.studioName || STUDIO_DEFAULTS.studioName,
    launcherName: 'Schullz Ink',
    display: 'standalone',
    themeColor: params.primaryColor || '#F22929',
    themeColorDark: params.bgDarkColor || '#090909',
    navigationColor: params.bgDarkColor || '#090909',
    navigationColorDark: params.bgDarkColor || '#090909',
    backgroundColor: params.bgDarkColor || '#090909',
    enableNotifications: true,
    startUrl: '/',
    iconUrl: `${origin}/pwa-512x512.png`,
    maskableIconUrl: `${origin}/pwa-maskable-512x512.png`,
    shortcuts: [
      {
        name: 'Agendar',
        shortName: 'Agendar',
        url: `${origin}/?tab=agendamento`,
        chosenIconUrl: `${origin}/pwa-192x192.png`,
      },
      {
        name: 'Orçamento',
        shortName: 'Orçamento',
        url: `${origin}/?tab=orcamento`,
        chosenIconUrl: `${origin}/pwa-192x192.png`,
      },
    ],
    generatorApp: 'bubblewrap-cli',
    webManifestUrl: `${origin}/manifest.webmanifest`,
    fallbackType: 'customtabs',
    appVersionName: '2.0.0',
    appVersionCode: 2,
  };

  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'twa-manifest.json';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
