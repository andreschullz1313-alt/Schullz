export type LanguageCode = 'pt-BR' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'zh';

export interface LanguageOption {
  code: LanguageCode;
  nativeName: string;
  shortCode: string;
  locale: string;
  isOriginal?: boolean;
}

export const DEFAULT_LANGUAGE: LanguageCode = 'pt-BR';

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'pt-BR', nativeName: 'Português (BR)', shortCode: 'PT', locale: 'pt-BR', isOriginal: true },
  { code: 'en', nativeName: 'English', shortCode: 'EN', locale: 'en-US' },
  { code: 'es', nativeName: 'Español', shortCode: 'ES', locale: 'es-ES' },
  { code: 'fr', nativeName: 'Français', shortCode: 'FR', locale: 'fr-FR' },
  { code: 'de', nativeName: 'Deutsch', shortCode: 'DE', locale: 'de-DE' },
  { code: 'it', nativeName: 'Italiano', shortCode: 'IT', locale: 'it-IT' },
  { code: 'ja', nativeName: '日本語', shortCode: 'JA', locale: 'ja-JP' },
  { code: 'zh', nativeName: '中文 (简体)', shortCode: 'ZH', locale: 'zh-CN' },
];

export function isValidLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && LANGUAGE_OPTIONS.some((opt) => opt.code === value);
}

export function getLocaleForLanguage(lang: LanguageCode): string {
  return LANGUAGE_OPTIONS.find((opt) => opt.code === lang)?.locale ?? 'pt-BR';
}
