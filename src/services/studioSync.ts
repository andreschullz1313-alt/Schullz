import { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { PRICE_GROUPS, SIZE_TIERS, STUDIO_DEFAULTS } from '../data/studioData';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { notifyAppIssue, setMonitorLogoUrl } from './appMonitor';
import { inspectForThreats } from './securityGuard';

export interface PriceRange {
  min: number;
  max: number;
}

export interface EditableSizeTier {
  label: string;
  min: number;
  max: number;
  startingFrom: boolean;
}

export interface EditablePriceItem {
  group: string;
  title: string;
  description: string;
  min: number;
  max: number;
}

export interface RemoteStudioConfig {
  studioName: string;
  whatsapp: string;
  instagram: string;
  publicCoupon: string;
  logoDataUrl: string;
  promoBannerDataUrl: string;
  promoBannerTitle: string;
  promoBannerMonth: string;
  apkDownloadUrl: string;
  primaryColor: string;
  accentGoldColor: string;
  bgDarkColor: string;
  fullSleeveMin: number;
  fullSleeveNote: string;
  sizeTiers: EditableSizeTier[];
  priceItems: EditablePriceItem[];
  configVersion: number;
  updatedByUid: string;
}

export const DEFAULT_PRIMARY_COLOR = '#F22929';
export const DEFAULT_ACCENT_GOLD_COLOR = '#ffd27a';
export const DEFAULT_BG_DARK_COLOR = '#090909';
export const DEFAULT_FULL_SLEEVE_NOTE =
  'Fechamento de membro completo (braço, perna ou costas) a partir de R$ 2.500, dividido em sessões.';

export const DEFAULT_REMOTE_CONFIG: RemoteStudioConfig = {
  studioName: STUDIO_DEFAULTS.studioName,
  whatsapp: STUDIO_DEFAULTS.whatsapp,
  instagram: STUDIO_DEFAULTS.instagram,
  publicCoupon: 'SCHULLZ20-OFICIAL',
  logoDataUrl: '',
  promoBannerDataUrl: '',
  promoBannerTitle: '',
  promoBannerMonth: '',
  apkDownloadUrl: '',
  primaryColor: DEFAULT_PRIMARY_COLOR,
  accentGoldColor: DEFAULT_ACCENT_GOLD_COLOR,
  bgDarkColor: DEFAULT_BG_DARK_COLOR,
  fullSleeveMin: 2500,
  fullSleeveNote: DEFAULT_FULL_SLEEVE_NOTE,
  sizeTiers: SIZE_TIERS.map((s) => ({
    label: s.label,
    min: s.min,
    max: s.max,
    startingFrom: Boolean(s.startingFrom),
  })),
  priceItems: PRICE_GROUPS.flatMap((g) =>
    g.items.map((i) => ({
      group: g.group,
      title: i.title,
      description: i.description,
      min: i.min,
      max: i.max,
    }))
  ),
  configVersion: 1,
  updatedByUid: '',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isAuthorizedAdminUser(user: User | null): boolean {
  if (!user || !user.emailVerified || !user.email) return false;
  return user.email.trim().toLowerCase() === STUDIO_DEFAULTS.adminEmail.toLowerCase();
}

function clampPrice(val: unknown, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.min(100000, Math.round(num));
}

function cleanPlainText(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

function normalizeSizeTiers(raw: unknown): EditableSizeTier[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_REMOTE_CONFIG.sizeTiers.map((t) => ({ ...t }));
  }
  return raw.slice(0, 12).map((entry, idx) => {
    const def =
      DEFAULT_REMOTE_CONFIG.sizeTiers[idx] ||
      DEFAULT_REMOTE_CONFIG.sizeTiers[DEFAULT_REMOTE_CONFIG.sizeTiers.length - 1];
    const item = entry as Partial<EditableSizeTier> | undefined;
    const rawLabel = cleanPlainText(item?.label, 80);
    const label =
      rawLabel && inspectForThreats(rawLabel, 'Faixa de tamanho').safe ? rawLabel : def.label;
    const min = clampPrice(item?.min, def.min);
    const max = Math.max(min, clampPrice(item?.max, def.max));
    const startingFrom =
      typeof item?.startingFrom === 'boolean' ? item.startingFrom : def.startingFrom;
    return { label, min, max, startingFrom };
  });
}

function normalizePriceItems(raw: unknown): EditablePriceItem[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_REMOTE_CONFIG.priceItems.map((i) => ({ ...i }));
  }
  if (raw.length === 0) {
    return [];
  }
  return raw.slice(0, 24).map((entry, idx) => {
    const def = DEFAULT_REMOTE_CONFIG.priceItems[idx] || {
      group: 'Serviços',
      title: `Item ${idx + 1}`,
      description: '',
      min: 0,
      max: 0,
    };
    const item = entry as Partial<EditablePriceItem> | undefined;
    const rawGroup = cleanPlainText(item?.group, 60);
    const group =
      rawGroup && inspectForThreats(rawGroup, 'Grupo da tabela de preços').safe
        ? rawGroup
        : def.group;
    const rawTitle = cleanPlainText(item?.title, 80);
    const title =
      rawTitle && inspectForThreats(rawTitle, 'Título da tabela de preços').safe
        ? rawTitle
        : def.title;
    const description =
      typeof item?.description === 'string'
        ? (() => {
            const cleanDesc = cleanPlainText(item.description, 240);
            return inspectForThreats(cleanDesc, 'Descrição de preço').safe ? cleanDesc : '';
          })()
        : def.description;
    const min = clampPrice(item?.min, def.min);
    const max = Math.max(min, clampPrice(item?.max, def.max));
    return { group, title, description, min, max };
  });
}

function sanitizeIncomingConfig(raw: Record<string, unknown>): RemoteStudioConfig {
  const studioNameRaw = typeof raw.studioName === 'string' ? raw.studioName.trim().slice(0, 60) : '';
  const studioName =
    studioNameRaw.length >= 2 && inspectForThreats(studioNameRaw, 'studioName').safe
      ? studioNameRaw
      : DEFAULT_REMOTE_CONFIG.studioName;

  const waRaw = typeof raw.whatsapp === 'string' ? raw.whatsapp.replace(/\D/g, '').slice(0, 15) : '';
  const whatsapp = waRaw.length >= 10 ? waRaw : DEFAULT_REMOTE_CONFIG.whatsapp;

  const igRaw = typeof raw.instagram === 'string' ? raw.instagram.replace(/^@/, '').trim().slice(0, 40) : '';
  const instagram =
    /^[a-zA-Z0-9._]{1,40}$/.test(igRaw) ? igRaw : DEFAULT_REMOTE_CONFIG.instagram;

  const couponRaw =
    typeof raw.publicCoupon === 'string' ? raw.publicCoupon.trim().toUpperCase().slice(0, 32) : '';
  const publicCoupon =
    /^[A-Z0-9_-]{3,32}$/.test(couponRaw) ? couponRaw : DEFAULT_REMOTE_CONFIG.publicCoupon;

  const logoRaw = typeof raw.logoDataUrl === 'string' ? raw.logoDataUrl : '';
  const logoDataUrl =
    logoRaw.length <= 350000 &&
    (logoRaw === '' || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logoRaw))
      ? logoRaw
      : '';

  const promoRaw = typeof raw.promoBannerDataUrl === 'string' ? raw.promoBannerDataUrl : '';
  const promoBannerDataUrl =
    promoRaw.length <= 420000 &&
    (promoRaw === '' || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(promoRaw))
      ? promoRaw
      : '';

  const promoTitleRaw =
    typeof raw.promoBannerTitle === 'string' ? raw.promoBannerTitle.replace(/[<>]/g, '').trim().slice(0, 80) : '';
  const promoBannerTitle =
    promoTitleRaw && inspectForThreats(promoTitleRaw, 'promoBannerTitle').safe ? promoTitleRaw : '';

  const promoMonthRaw =
    typeof raw.promoBannerMonth === 'string' ? raw.promoBannerMonth.replace(/[<>]/g, '').trim().slice(0, 32) : '';
  const promoBannerMonth =
    promoMonthRaw && inspectForThreats(promoMonthRaw, 'promoBannerMonth').safe ? promoMonthRaw : '';

  const apkRaw = typeof raw.apkDownloadUrl === 'string' ? raw.apkDownloadUrl.trim().slice(0, 500) : '';
  const apkDownloadUrl =
    apkRaw === '' ||
    ((/^(https:\/\/[^\s<>"]+|\/downloads\/[a-zA-Z0-9._-]+\.apk)$/i.test(apkRaw)) &&
      inspectForThreats(apkRaw, 'apkDownloadUrl').safe)
      ? apkRaw
      : '';

  const primaryColor =
    typeof raw.primaryColor === 'string' && HEX_RE.test(raw.primaryColor)
      ? raw.primaryColor
      : DEFAULT_PRIMARY_COLOR;
  const accentGoldColor =
    typeof raw.accentGoldColor === 'string' && HEX_RE.test(raw.accentGoldColor)
      ? raw.accentGoldColor
      : DEFAULT_ACCENT_GOLD_COLOR;
  const bgDarkColor =
    typeof raw.bgDarkColor === 'string' && HEX_RE.test(raw.bgDarkColor)
      ? raw.bgDarkColor
      : DEFAULT_BG_DARK_COLOR;

  const fullSleeveMin = clampPrice(raw.fullSleeveMin, DEFAULT_REMOTE_CONFIG.fullSleeveMin);
  const fullSleeveNote =
    typeof raw.fullSleeveNote === 'string'
      ? (() => {
          const cleanNote = cleanPlainText(raw.fullSleeveNote, 220);
          return inspectForThreats(cleanNote, 'fullSleeveNote').safe ? cleanNote : '';
        })()
      : DEFAULT_FULL_SLEEVE_NOTE;

  const sizeTiers = normalizeSizeTiers(raw.sizeTiers);
  const priceItems = normalizePriceItems(raw.priceItems);
  const configVersion =
    typeof raw.configVersion === 'number' && raw.configVersion >= 1
      ? Math.floor(raw.configVersion)
      : 1;
  const updatedByUid = typeof raw.updatedByUid === 'string' ? raw.updatedByUid : '';

  return {
    studioName,
    whatsapp,
    instagram,
    publicCoupon,
    logoDataUrl,
    promoBannerDataUrl,
    promoBannerTitle,
    promoBannerMonth,
    apkDownloadUrl,
    primaryColor,
    accentGoldColor,
    bgDarkColor,
    fullSleeveMin,
    fullSleeveNote,
    sizeTiers,
    priceItems,
    configVersion,
    updatedByUid,
  };
}

export function hydrateCachedRemoteConfig(
  cached: Record<string, unknown>,
  fallbackCoupon: string
): RemoteStudioConfig {
  const sanitized = sanitizeIncomingConfig(cached);
  return {
    ...sanitized,
    publicCoupon:
      typeof cached.publicCoupon === 'string' && cached.publicCoupon.trim()
        ? sanitized.publicCoupon
        : fallbackCoupon,
  };
}

function darkenHex(hex: string, ratio = 0.25): string {
  const clean = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * (1 - ratio)));
  const g = Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * (1 - ratio)));
  const b = Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * (1 - ratio)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function applyRemoteThemeAndLogo(
  config: Pick<RemoteStudioConfig, 'primaryColor' | 'accentGoldColor' | 'bgDarkColor' | 'logoDataUrl'>,
  prefs: { isDark: boolean; highContrast: boolean },
  fallbackLogo: string
): void {
  const root = document.documentElement;
  const activeLogo = config.logoDataUrl || fallbackLogo;
  setMonitorLogoUrl(activeLogo);

  // Respect high-contrast mode overrides while syncing custom brand colors otherwise
  if (prefs.highContrast) {
    root.style.removeProperty('--r');
    root.style.removeProperty('--rd');
    root.style.removeProperty('--accent-gold');
    root.style.removeProperty('--bg');
    return;
  }

  const primary = HEX_RE.test(config.primaryColor) ? config.primaryColor : DEFAULT_PRIMARY_COLOR;
  const gold = HEX_RE.test(config.accentGoldColor) ? config.accentGoldColor : DEFAULT_ACCENT_GOLD_COLOR;
  const darkBg = HEX_RE.test(config.bgDarkColor) ? config.bgDarkColor : DEFAULT_BG_DARK_COLOR;

  if (prefs.isDark) {
    root.style.setProperty('--r', primary);
    root.style.setProperty('--rd', darkenHex(primary, 0.22));
    root.style.setProperty('--accent-gold', gold);
    root.style.setProperty('--bg', darkBg);
  } else {
    root.style.setProperty('--r', primary === DEFAULT_PRIMARY_COLOR ? '#c41818' : darkenHex(primary, 0.12));
    root.style.setProperty('--rd', darkenHex(primary, 0.34));
    root.style.setProperty('--accent-gold', gold === DEFAULT_ACCENT_GOLD_COLOR ? '#7e542c' : darkenHex(gold, 0.38));
    root.style.removeProperty('--bg');
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', prefs.isDark ? darkBg : '#f7f4ee');
  }
}

export function subscribeToStudioConfig(
  onUpdate: (config: RemoteStudioConfig) => void
): () => void {
  const docRef = doc(db, 'app_config', 'studio');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as Record<string, unknown>;
      onUpdate(sanitizeIncomingConfig(data));
    },
    (error) => {
      if (/permission|insufficient/i.test(error.message)) {
        handleFirestoreError(error, OperationType.GET, 'app_config/studio');
      } else {
        notifyAppIssue({
          category: 'connection',
          title: 'Schullz Ink · Sincronização Offline',
          message: 'Usando configurações salvas localmente enquanto a conexão sincroniza.',
          silentSystem: true,
        });
      }
    }
  );
}

export async function fetchStudioConfigOnce(): Promise<RemoteStudioConfig | null> {
  const docRef = doc(db, 'app_config', 'studio');
  try {
    let snapshot;
    try {
      snapshot = await getDocFromServer(docRef);
    } catch {
      snapshot = await getDoc(docRef);
    }
    if (!snapshot.exists()) return null;
    return sanitizeIncomingConfig(snapshot.data() as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function publishStudioConfig(
  draft: Omit<RemoteStudioConfig, 'configVersion' | 'updatedByUid'>,
  currentVersion: number
): Promise<number> {
  const user = auth.currentUser;
  if (!isAuthorizedAdminUser(user) || !user) {
    notifyAppIssue({
      category: 'security',
      title: 'Schullz Ink · Acesso Negado',
      message: 'Somente a conta administradora verificada pode publicar alterações globais.',
    });
    throw new Error('Unauthorized admin publish attempt.');
  }

  const cleanStudioName = draft.studioName.replace(/[<>]/g, '').trim().slice(0, 60);
  if (cleanStudioName.length < 2) {
    throw new Error('Nome do estúdio deve ter pelo menos 2 caracteres.');
  }

  const cleanWa = draft.whatsapp.replace(/\D/g, '').slice(0, 15);
  if (cleanWa.length < 10) {
    throw new Error('WhatsApp deve ter entre 10 e 15 dígitos.');
  }

  const cleanIg = draft.instagram.replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, '').slice(0, 40);
  if (!cleanIg) {
    throw new Error('Informe um usuário do Instagram válido.');
  }

  const cleanCoupon = draft.publicCoupon.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
  if (cleanCoupon.length < 3) {
    throw new Error('Cupom público inválido.');
  }

  const nextVersion = Math.max(1, Math.floor(currentVersion) + 1);

  if (!Array.isArray(draft.sizeTiers) || draft.sizeTiers.length < 1 || draft.sizeTiers.length > 12) {
    throw new Error('O simulador precisa ter entre 1 e 12 faixas de tamanho.');
  }
  const sizeTiers: EditableSizeTier[] = draft.sizeTiers.map((tier, idx) => {
    const label = cleanPlainText(tier.label, 80);
    if (!label) {
      throw new Error(`Preencha o nome da faixa #${idx + 1} do simulador (ou remova a faixa).`);
    }
    if (!inspectForThreats(label, `Faixa #${idx + 1}`).safe) {
      throw new Error(`Texto inválido detectado na faixa #${idx + 1}.`);
    }
    const min = clampPrice(tier.min, 0);
    const max = Math.max(min, clampPrice(tier.max, min));
    return {
      label,
      min,
      max,
      startingFrom: Boolean(tier.startingFrom),
    };
  });

  if (!Array.isArray(draft.priceItems) || draft.priceItems.length > 24) {
    throw new Error('A tabela de preços aceita até 24 linhas.');
  }
  const priceItems: EditablePriceItem[] = draft.priceItems.map((item, idx) => {
    const group = cleanPlainText(item.group, 60);
    const title = cleanPlainText(item.title, 80);
    const description = cleanPlainText(item.description, 240);
    if (!group) {
      throw new Error(`Preencha a categoria/tabela da linha #${idx + 1} de preços (ou apague a linha).`);
    }
    if (!title) {
      throw new Error(`Preencha o título/tamanho da linha #${idx + 1} de preços (ou apague a linha).`);
    }
    if (
      !inspectForThreats(group, `Categoria #${idx + 1}`).safe ||
      !inspectForThreats(title, `Título #${idx + 1}`).safe ||
      !inspectForThreats(description, `Descrição #${idx + 1}`).safe
    ) {
      throw new Error(`Texto inválido detectado na linha #${idx + 1} da tabela de preços.`);
    }
    const min = clampPrice(item.min, 0);
    const max = Math.max(min, clampPrice(item.max, min));
    return { group, title, description, min, max };
  });

  const cleanSleeveNote = cleanPlainText(draft.fullSleeveNote, 220);
  if (cleanSleeveNote && !inspectForThreats(cleanSleeveNote, 'Nota de fechamento').safe) {
    throw new Error('Texto inválido na observação de fechamento completo.');
  }

  const cleanPromoTitle = (draft.promoBannerTitle || '').replace(/[<>]/g, '').trim().slice(0, 80);
  const cleanPromoMonth = (draft.promoBannerMonth || '').replace(/[<>]/g, '').trim().slice(0, 32);
  const cleanPromoDataUrl =
    typeof draft.promoBannerDataUrl === 'string' &&
    draft.promoBannerDataUrl.length <= 420000 &&
    (draft.promoBannerDataUrl === '' ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(draft.promoBannerDataUrl))
      ? draft.promoBannerDataUrl
      : '';

  const cleanApkUrl = (draft.apkDownloadUrl || '').trim().slice(0, 500);
  if (
    cleanApkUrl &&
    !/^(https:\/\/[^\s<>"]+|\/downloads\/[a-zA-Z0-9._-]+\.apk)$/i.test(cleanApkUrl)
  ) {
    throw new Error('URL do arquivo APK deve usar HTTPS (https://...) ou /downloads/SchullzInkTattoo.apk.');
  }

  const payload = {
    studioName: cleanStudioName,
    whatsapp: cleanWa,
    instagram: cleanIg,
    publicCoupon: cleanCoupon,
    logoDataUrl: draft.logoDataUrl.slice(0, 350000),
    promoBannerDataUrl: cleanPromoDataUrl,
    promoBannerTitle: cleanPromoTitle,
    promoBannerMonth: cleanPromoMonth,
    apkDownloadUrl: cleanApkUrl,
    primaryColor: HEX_RE.test(draft.primaryColor) ? draft.primaryColor : DEFAULT_PRIMARY_COLOR,
    accentGoldColor: HEX_RE.test(draft.accentGoldColor) ? draft.accentGoldColor : DEFAULT_ACCENT_GOLD_COLOR,
    bgDarkColor: HEX_RE.test(draft.bgDarkColor) ? draft.bgDarkColor : DEFAULT_BG_DARK_COLOR,
    fullSleeveMin: clampPrice(draft.fullSleeveMin, 2500),
    fullSleeveNote: cleanSleeveNote,
    sizeTiers,
    priceItems,
    configVersion: nextVersion,
    updatedByUid: user.uid,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'app_config', 'studio'), payload);
    return nextVersion;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'app_config/studio');
  }
}

export async function compressLogoImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido (PNG, JPG ou WebP).');
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível carregar a imagem selecionada.'));
      el.src = objectUrl;
    });

    const maxSize = 240;
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível neste navegador.');
    ctx.drawImage(img, 0, 0, width, height);

    let result = canvas.toDataURL('image/webp', 0.86);
    if (result.length > 280000 || !result.startsWith('data:image/')) {
      result = canvas.toDataURL('image/jpeg', 0.8);
    }
    if (result.length > 340000) {
      throw new Error('Imagem muito grande mesmo após compressão. Escolha outra foto.');
    }
    return result;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function getCurrentPromoMonthLabel(): string {
  try {
    const label = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date());
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return 'Promoção do Mês';
  }
}

export async function compressBannerImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido (PNG, JPG ou WebP).');
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível carregar o banner selecionado.'));
      el.src = objectUrl;
    });

    const attempts: [number, number][] = [
      [1080, 0.84],
      [920, 0.78],
      [780, 0.72],
      [640, 0.65],
    ];

    for (const [maxDim, quality] of attempts) {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível neste navegador.');
      ctx.drawImage(img, 0, 0, width, height);

      let result = canvas.toDataURL('image/webp', quality);
      if (!result.startsWith('data:image/webp') || result.length > 395000) {
        const jpg = canvas.toDataURL('image/jpeg', quality);
        if (jpg.length < result.length || !result.startsWith('data:image/webp')) {
          result = jpg;
        }
      }

      if (result.length <= 405000) {
        return result;
      }
    }

    throw new Error('Banner muito pesado mesmo após otimização. Escolha outra imagem.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
