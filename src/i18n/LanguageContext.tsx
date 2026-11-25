import React, { createContext, useContext, useMemo } from 'react';
import { DOMAIN_TRANSLATIONS, DomainTranslations } from './domainTranslations';
import { DEFAULT_LANGUAGE, getLocaleForLanguage, LanguageCode } from './types';
import { UI_TRANSLATIONS, UITranslations } from './uiTranslations';

export interface LanguageContextValue {
  lang: LanguageCode;
  locale: string;
  setLang: (lang: LanguageCode) => void;
  ui: UITranslations;
  domain: DomainTranslations;
  tZoneName: (zoneKey: string) => string;
  tZoneDetail: (zoneKey: string, fallback: string) => string;
  tCategory: (catKey: string) => string;
  tWorkTitle: (titleKey: string) => string;
  tQuoteStyle: (styleKey: string) => string;
}

const defaultUi = UI_TRANSLATIONS[DEFAULT_LANGUAGE];
const defaultDomain = DOMAIN_TRANSLATIONS[DEFAULT_LANGUAGE];

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANGUAGE,
  locale: getLocaleForLanguage(DEFAULT_LANGUAGE),
  setLang: () => {},
  ui: defaultUi,
  domain: defaultDomain,
  tZoneName: (k) => k,
  tZoneDetail: (_k, fallback) => fallback,
  tCategory: (k) => k,
  tWorkTitle: (k) => k,
  tQuoteStyle: (k) => k,
});

interface LanguageProviderProps {
  lang: LanguageCode;
  onChangeLang: (next: LanguageCode) => void;
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  lang,
  onChangeLang,
  children,
}) => {
  const value = useMemo<LanguageContextValue>(() => {
    const ui = UI_TRANSLATIONS[lang] ?? UI_TRANSLATIONS[DEFAULT_LANGUAGE];
    const domain = DOMAIN_TRANSLATIONS[lang] ?? DOMAIN_TRANSLATIONS[DEFAULT_LANGUAGE];
    const locale = getLocaleForLanguage(lang);

    return {
      lang,
      locale,
      setLang: onChangeLang,
      ui,
      domain,
      tZoneName: (zoneKey: string) => {
        if (zoneKey === 'Outra região') return domain.otherZone;
        return domain.bodyZones[zoneKey]?.name ?? zoneKey;
      },
      tZoneDetail: (zoneKey: string, fallback: string) =>
        domain.bodyZones[zoneKey]?.detail ?? fallback,
      tCategory: (catKey: string) => domain.categories[catKey] ?? catKey,
      tWorkTitle: (titleKey: string) => domain.workTitles[titleKey] ?? titleKey,
      tQuoteStyle: (styleKey: string) => domain.quoteStyles[styleKey] ?? styleKey,
    };
  }, [lang, onChangeLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

export function fmt(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.replaceAll(`{${key}}`, String(val)),
    template
  );
}
