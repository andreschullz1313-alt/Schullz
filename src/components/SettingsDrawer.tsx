import React from 'react';
import { Moon, Sun, X, Eye, Type, Lock, CheckCircle2, Share2, Compass, Languages } from 'lucide-react';
import { TABS, TabId } from '../data/studioData';
import { LANGUAGE_OPTIONS, LanguageCode } from '../i18n/types';
import { useLanguage } from '../i18n/LanguageContext';

export type FontScale = 'normal' | 'large' | 'xlarge';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: (dark: boolean) => void;
  fontScale: FontScale;
  onChangeFontScale: (scale: FontScale) => void;
  highContrast: boolean;
  onToggleHighContrast: (enabled: boolean) => void;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  isLoggedIn: boolean;
  onOpenAdmin: () => void;
  onOpenShareInstall: () => void;
  onOpenTutorial: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  open,
  onClose,
  isDark,
  onToggleTheme,
  fontScale,
  onChangeFontScale,
  highContrast,
  onToggleHighContrast,
  language,
  onChangeLanguage,
  activeTab,
  onSelectTab,
  isLoggedIn,
  onOpenAdmin,
  onOpenShareInstall,
  onOpenTutorial,
}) => {
  const { ui } = useLanguage();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={ui.settings.dialogAria}
    >
      <aside
        className="w-full max-w-sm h-full overflow-y-auto p-6 space-y-6 border-l"
        style={{
          background: 'var(--card)',
          color: 'var(--text)',
          borderColor: 'var(--border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h2 className="text-2xl m-0" style={{ color: 'var(--r)' }}>
              {ui.settings.title}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {ui.settings.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={ui.settings.closeAria}
            className="p-2 rounded border cursor-pointer"
            style={{
              borderColor: 'var(--border-strong)',
              color: 'var(--text)',
              minWidth: '44px',
              minHeight: '44px',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Language & Locale Settings */}
        <div className="space-y-3 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--accent-gold)' }}>
            <Languages size={17} aria-hidden="true" />
            <span>{ui.settings.languageSection}</span>
          </div>
          <p className="text-sm leading-snug" style={{ color: 'var(--text-muted)' }}>
            {ui.settings.languageHint}
          </p>
          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-label={ui.settings.languageLabel}
          >
            {LANGUAGE_OPTIONS.map((opt) => {
              const isSelected = language === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onChangeLanguage(opt.code)}
                  className="flex flex-col items-start justify-center px-3 py-2 rounded border text-left cursor-pointer transition-colors"
                  style={{
                    background: isSelected ? 'var(--r)' : 'transparent',
                    color: isSelected ? 'var(--btn-text)' : 'var(--text)',
                    borderColor: isSelected ? 'var(--r)' : 'var(--border-strong)',
                    minHeight: '48px',
                  }}
                >
                  <span className="flex items-center justify-between w-full gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-85">
                      {opt.shortCode}
                    </span>
                    {opt.isOriginal && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: isSelected ? 'rgba(0,0,0,0.22)' : 'var(--card-alt)',
                          color: isSelected ? 'var(--btn-text)' : 'var(--accent-gold)',
                        }}
                      >
                        {ui.settings.originalBadge}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-bold leading-tight truncate w-full">
                    {opt.nativeName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reading & Theme Settings */}
        <div className="space-y-4">
          <div className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--accent-gold)' }}>
            {ui.settings.appearanceSection}
          </div>

          {/* Light / Dark Mode Switch */}
          <div className="space-y-2">
            <span className="block font-semibold text-base">{ui.settings.themeLabel}</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onToggleTheme(true)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded border font-bold cursor-pointer"
                style={{
                  background: isDark ? 'var(--r)' : 'transparent',
                  color: isDark ? 'var(--btn-text)' : 'var(--text)',
                  borderColor: isDark ? 'var(--r)' : 'var(--border-strong)',
                  minHeight: '44px',
                }}
              >
                <Moon size={18} />
                {ui.settings.darkMode}
              </button>
              <button
                type="button"
                onClick={() => onToggleTheme(false)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded border font-bold cursor-pointer"
                style={{
                  background: !isDark ? 'var(--r)' : 'transparent',
                  color: !isDark ? 'var(--btn-text)' : 'var(--text)',
                  borderColor: !isDark ? 'var(--r)' : 'var(--border-strong)',
                  minHeight: '44px',
                }}
              >
                <Sun size={18} />
                {ui.settings.lightMode}
              </button>
            </div>
          </div>

          {/* Font Size Scale */}
          <div className="space-y-2">
            <span className="flex items-center gap-2 font-semibold text-base">
              <Type size={18} />
              {ui.settings.fontLabel}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['normal', ui.settings.fontNormal],
                  ['large', ui.settings.fontLarge],
                  ['xlarge', ui.settings.fontXLarge],
                ] as [FontScale, string][]
              ).map(([scale, label]) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => onChangeFontScale(scale)}
                  className="px-2 py-2 rounded border font-bold cursor-pointer text-sm"
                  style={{
                    background: fontScale === scale ? 'var(--card-alt)' : 'transparent',
                    color: fontScale === scale ? 'var(--accent-gold)' : 'var(--text)',
                    borderColor: fontScale === scale ? 'var(--accent-gold)' : 'var(--border-strong)',
                    minHeight: '44px',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* High Contrast Toggle */}
          <button
            type="button"
            onClick={() => onToggleHighContrast(!highContrast)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded border font-bold cursor-pointer"
            style={{
              background: highContrast ? 'var(--card-alt)' : 'transparent',
              color: 'var(--text)',
              borderColor: highContrast ? 'var(--accent-gold)' : 'var(--border-strong)',
              minHeight: '44px',
            }}
          >
            <span className="flex items-center gap-2">
              <Eye size={18} />
              {ui.settings.highContrast}
            </span>
            <span style={{ color: highContrast ? 'var(--pain-low-text)' : 'var(--text-muted)' }}>
              {highContrast ? ui.settings.enabled : ui.settings.disabled}
            </span>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-gold)' }}>
            {ui.settings.navSection}
          </div>
          <div className="flex flex-col gap-1.5">
            {TABS.map((t) => {
              const locked = Boolean(t.requiresAuth && !isLoggedIn);
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(t.id);
                    onClose();
                  }}
                  className="flex items-center justify-between w-full text-left px-3 py-2.5 rounded border font-bold cursor-pointer"
                  style={{
                    background: isActive ? 'var(--r)' : 'transparent',
                    color: isActive ? 'var(--btn-text)' : 'var(--text)',
                    borderColor: isActive ? 'var(--r)' : 'var(--border-subtle)',
                    minHeight: '44px',
                  }}
                >
                  <span>{ui.tabs[t.id]}</span>
                  {locked ? (
                    <Lock size={16} aria-label={ui.settings.requiresLogin} />
                  ) : isActive ? (
                    <CheckCircle2 size={16} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Share & Install / Artist Area */}
        <div className="pt-2 border-t space-y-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            className="si-btn w-full"
            onClick={() => {
              onClose();
              onOpenShareInstall();
            }}
          >
            <Share2 size={18} />
            {ui.settings.shareInstallBtn}
          </button>

          <button
            type="button"
            className="si-btn si-btn-outline w-full"
            onClick={() => {
              onClose();
              onOpenTutorial();
            }}
          >
            <Compass size={18} />
            {ui.settings.tutorialBtn}
          </button>

          <button
            type="button"
            className="si-btn si-btn-outline w-full"
            onClick={() => {
              onClose();
              onOpenAdmin();
            }}
          >
            {ui.settings.artistAreaBtn}
          </button>
        </div>
      </aside>
    </div>
  );
};
