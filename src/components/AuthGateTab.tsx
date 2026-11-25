import React, { useState } from 'react';
import { Megaphone, ShieldCheck } from 'lucide-react';
import { STUDIO_DEFAULTS, TabId } from '../data/studioData';
import { fmt, useLanguage } from '../i18n/LanguageContext';

export interface ClientUser {
  name: string;
  email: string;
  whatsapp: string;
  coupon: string;
  createdAt: string;
}

export interface SavedQuote {
  id: string;
  date: string;
  style: string;
  place: string;
  size: string;
  estimate: string;
  idea: string;
  couponUsed?: string;
  photosCount: number;
}

interface StoredAccount extends ClientUser {
  password: string;
}

interface AuthGateTabProps {
  user: ClientUser | null;
  savedQuotes: SavedQuote[];
  onLoginSuccess: (user: ClientUser) => void;
  onLogout: () => void;
  onNavigateTab: (tab: TabId) => void;
  onToast: (msg: string) => void;
  publicCoupon: string;
  isFirebaseAdmin?: boolean;
  onOpenAdminPanel?: () => void;
  embeddedInReferral?: boolean;
}

type AuthMode = 'login' | 'register' | 'reset';

const USERS_KEY = 'schullz_client_accounts_v1';

function loadAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function saveAccounts(list: StoredAccount[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  } catch {
    // ignore storage quota errors
  }
}

function generatePersonalCoupon(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SCHULLZ20-${suffix}`;
}

export const AuthGateTab: React.FC<AuthGateTabProps> = ({
  user,
  savedQuotes,
  onLoginSuccess,
  onLogout,
  onNavigateTab,
  onToast,
  publicCoupon,
  isFirebaseAdmin = false,
  onOpenAdminPanel,
  embeddedInReferral = false,
}) => {
  const { ui, locale, tQuoteStyle, tZoneName } = useLanguage();
  const [mode, setMode] = useState<AuthMode>('register');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setStatusMsg({ text: ui.auth.errMissingLogin, isError: true });
      return;
    }

    const accounts = loadAccounts();
    const found = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (!found) {
      setStatusMsg({
        text: ui.auth.errEmailNotFound,
        isError: true,
      });
      return;
    }
    if (found.password !== password) {
      setStatusMsg({ text: ui.auth.errWrongPass, isError: true });
      return;
    }

    const { password: _p, ...clientUser } = found;
    setStatusMsg({ text: ui.auth.okLogin, isError: false });
    onLoginSuccess(clientUser);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.replace(/[<>]/g, '').trim();
    const cleanWa = whatsapp.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setStatusMsg({ text: ui.auth.errName, isError: true });
      return;
    }
    if (cleanWa.length < 10) {
      setStatusMsg({ text: ui.auth.errWa, isError: true });
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setStatusMsg({ text: ui.auth.errEmail, isError: true });
      return;
    }
    if (password.length < 6) {
      setStatusMsg({ text: ui.auth.errPassLen, isError: true });
      return;
    }

    const accounts = loadAccounts();
    if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      setStatusMsg({ text: ui.auth.errEmailExists, isError: true });
      return;
    }

    const newAccount: StoredAccount = {
      name: cleanName,
      email: cleanEmail,
      whatsapp: cleanWa,
      password,
      coupon: generatePersonalCoupon(),
      createdAt: new Date().toISOString(),
    };
    saveAccounts([...accounts, newAccount]);

    const { password: _p, ...clientUser } = newAccount;
    setStatusMsg({ text: ui.auth.okRegister, isError: false });
    onLoginSuccess(clientUser);
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setStatusMsg({ text: ui.auth.errResetEmail, isError: true });
      return;
    }
    const accounts = loadAccounts();
    const found = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (!found) {
      setStatusMsg({ text: ui.auth.errResetNotFound, isError: true });
      return;
    }
    setStatusMsg({
      text: fmt(ui.auth.okReset, { email: cleanEmail }),
      isError: false,
    });
  };

  if (user) {
    return (
      <div className={embeddedInReferral ? 'space-y-6' : 'max-w-4xl mx-auto px-4 py-8 space-y-6'}>
        <div className="space-y-2">
          <div className="tab-stagger-kicker text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--accent-gold)' }}>
            {ui.auth.loggedInKicker}
          </div>
          <h2 className="tab-stagger-title">{fmt(ui.auth.hello, { name: user.name })}</h2>
          <p className="tab-stagger-lead" style={{ color: 'var(--text-muted)' }}>
            {ui.auth.loggedInLead}
          </p>
        </div>

        {isFirebaseAdmin && onOpenAdminPanel && (
          <div
            className="si-card border-2 flex flex-wrap items-center justify-between gap-3"
            style={{ borderColor: 'var(--accent-gold)', background: 'var(--card-alt)' }}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--accent-gold)' }}>
                <ShieldCheck size={18} />
                Sessão Administrativa Ativa ({STUDIO_DEFAULTS.adminEmail})
              </div>
              <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>
                Gerencie o banner promocional do mês na tela Início ou abra o painel administrativo completo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="si-btn si-btn-sm"
                onClick={() => onNavigateTab('inicio')}
              >
                <Megaphone size={15} />
                Banner Mensal (Início)
              </button>
              <button
                type="button"
                className="si-btn si-btn-outline si-btn-sm"
                onClick={onOpenAdminPanel}
              >
                Painel Admin
              </button>
            </div>
          </div>
        )}

        <div className="tab-stagger-grid grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="si-card si-card-interactive space-y-3">
            <h3 style={{ color: 'var(--accent-gold)' }}>{ui.auth.yourDataTitle}</h3>
            <div className="space-y-1 text-base">
              <p>
                <strong>{ui.auth.nameLabel}</strong> {user.name}
              </p>
              <p>
                <strong>{ui.auth.emailLabel}</strong> {user.email}
              </p>
              <p>
                <strong>{ui.auth.waLabel}</strong> {user.whatsapp}
              </p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {ui.auth.lgpdShort}
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              <button type="button" className="si-btn si-btn-sm" onClick={() => onNavigateTab('orcamento')}>
                {ui.auth.buildQuoteBtn}
              </button>
              <button
                type="button"
                className="si-btn si-btn-outline si-btn-sm"
                onClick={() => onNavigateTab('precos')}
              >
                {ui.auth.viewPricesBtn}
              </button>
              <button
                type="button"
                className="si-btn si-btn-outline si-btn-sm"
                onClick={() => onNavigateTab('inicio')}
              >
                {ui.auth.homeBtn}
              </button>
            </div>
          </div>

          <div className="si-card si-card-interactive space-y-3">
            <h3 style={{ color: 'var(--accent-gold)' }}>{ui.auth.referralTitle}</h3>
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>
              {ui.auth.referralBody}
            </p>
            <div
              className="p-3 rounded border flex items-center justify-between gap-2"
              style={{ borderColor: 'var(--border-strong)', background: 'var(--card-alt)' }}
            >
              <strong className="text-xl tracking-wider tabular-nums" style={{ color: 'var(--r)' }}>
                {user.coupon || publicCoupon}
              </strong>
              <button
                type="button"
                className="si-btn si-btn-sm"
                onClick={() => {
                  const code = user.coupon || publicCoupon;
                  navigator.clipboard?.writeText(code).catch(() => {});
                  onToast(fmt(ui.auth.codeCopiedToast, { code }));
                }}
              >
                {ui.common.copy}
              </button>
            </div>
            <div className="pt-1">
              <button type="button" className="si-btn si-btn-outline si-btn-sm" onClick={onLogout}>
                {ui.auth.logoutBtn}
              </button>
            </div>
          </div>
        </div>

        <div className="si-card space-y-3">
          <h3 style={{ color: 'var(--accent-gold)' }}>{ui.auth.savedQuotesTitle}</h3>
          {savedQuotes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>
              {ui.auth.noSavedQuotes}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedQuotes.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded border space-y-1"
                  style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-alt)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong>{tQuoteStyle(q.style)}</strong>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--r)' }}>
                      {q.estimate}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {tZoneName(q.place)} · {q.size}
                  </p>
                  {q.idea && <p className="text-sm">{q.idea}</p>}
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {fmt(ui.auth.registeredOn, { date: new Date(q.date).toLocaleDateString(locale) })} ·{' '}
                    {fmt(ui.auth.photosCountLabel, { count: q.photosCount })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="client-auth-box" className={embeddedInReferral ? 'space-y-6' : 'max-w-4xl mx-auto px-4 py-8 space-y-6'}>
      <div className="space-y-2">
        <div className="tab-stagger-kicker text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--accent-gold)' }}>
          {ui.auth.firstAccessKicker}
        </div>
        <h3 className="tab-stagger-title text-2xl sm:text-3xl">{ui.auth.firstAccessTitle}</h3>
        <p className="tab-stagger-lead max-w-2xl text-base sm:text-lg" style={{ color: 'var(--text)' }}>
          {ui.auth.firstAccessLead}
        </p>
      </div>

      <div className="tab-stagger-grid grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 si-card space-y-4">
          {/* Mode selector */}
          <div
            className="flex flex-wrap gap-2 pb-3 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
            role="tablist"
            aria-label={ui.auth.tabsAria}
          >
            {(
              [
                ['login', ui.auth.modeLogin],
                ['register', ui.auth.modeRegister],
                ['reset', ui.auth.modeReset],
              ] as [AuthMode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setStatusMsg(null);
                }}
                className="px-4 py-2 font-bold rounded border cursor-pointer transition-colors"
                style={{
                  background: mode === m ? 'var(--r)' : 'transparent',
                  color: mode === m ? 'var(--btn-text)' : 'var(--text)',
                  borderColor: mode === m ? 'var(--r)' : 'var(--border-strong)',
                  minHeight: '44px',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block font-semibold mb-1">
                  {ui.auth.emailLabel.replace(':', '')}
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className="si-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="login-pass" className="block font-semibold mb-1">
                  {ui.auth.passwordLabel}
                </label>
                <input
                  id="login-pass"
                  type="password"
                  autoComplete="current-password"
                  className="si-input"
                  placeholder={ui.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button type="submit" className="si-btn">
                  {ui.auth.loginSubmit}
                </button>
                <button
                  type="button"
                  className="si-btn si-btn-outline"
                  onClick={() => {
                    setMode('register');
                    setStatusMsg(null);
                  }}
                >
                  {ui.auth.noAccountBtn}
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className="block font-semibold mb-1">
                  {ui.auth.regNameLabel}
                </label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  className="si-input"
                  placeholder={ui.auth.regNamePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="reg-wa" className="block font-semibold mb-1">
                  {ui.auth.regWaLabel}
                </label>
                <input
                  id="reg-wa"
                  type="tel"
                  inputMode="tel"
                  className="si-input"
                  placeholder="(47) 99999-9999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="reg-email" className="block font-semibold mb-1">
                  {ui.auth.regEmailLabel}
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  className="si-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="reg-pass" className="block font-semibold mb-1">
                  {ui.auth.regPassLabel}
                </label>
                <input
                  id="reg-pass"
                  type="password"
                  autoComplete="new-password"
                  className="si-input"
                  placeholder={ui.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button type="submit" className="si-btn">
                  {ui.auth.regSubmit}
                </button>
                <button
                  type="button"
                  className="si-btn si-btn-outline"
                  onClick={() => {
                    setMode('login');
                    setStatusMsg(null);
                  }}
                >
                  {ui.auth.hasAccountBtn}
                </button>
              </div>

              <p
                className="text-sm pt-3 border-t leading-relaxed"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                {ui.auth.lgpdFull}
              </p>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block font-semibold mb-1">
                  {ui.auth.resetEmailLabel}
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  className="si-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="si-btn">
                {ui.auth.resetSubmit}
              </button>
            </form>
          )}

          {statusMsg && (
            <p
              role="status"
              aria-live="polite"
              className="p-3 rounded border font-semibold text-base"
              style={{
                borderColor: statusMsg.isError ? 'var(--r)' : 'var(--pain-low)',
                background: 'var(--card-alt)',
                color: statusMsg.isError ? 'var(--pain-ext-text)' : 'var(--pain-low-text)',
              }}
            >
              {statusMsg.text}
            </p>
          )}
        </div>

        {/* Helpful side card */}
        <div className="lg:col-span-2 si-card space-y-4">
          <h3 style={{ color: 'var(--accent-gold)' }}>{ui.auth.whyLoginTitle}</h3>
          <ul className="space-y-2.5 text-base" style={{ color: 'var(--text)' }}>
            {ui.auth.whyItems.map(([lead, desc]) => (
              <li key={lead}>
                <strong>{lead}</strong> {desc}
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              className="si-btn si-btn-outline si-btn-sm"
              onClick={() => onNavigateTab('inicio')}
            >
              {ui.auth.knowStudioBtn}
            </button>
            <button
              type="button"
              className="si-btn si-btn-outline si-btn-sm"
              onClick={() => onNavigateTab('portfolio')}
            >
              {ui.auth.seeWorksBtn}
            </button>
            <button
              type="button"
              className="si-btn si-btn-outline si-btn-sm"
              onClick={() => onNavigateTab('mapa')}
            >
              {ui.auth.painMapBtn}
            </button>
          </div>

          {isFirebaseAdmin && onOpenAdminPanel && (
            <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--pain-low-text)' }}>
                <ShieldCheck size={16} />
                Admin conectado: {STUDIO_DEFAULTS.adminEmail}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="si-btn si-btn-sm"
                  onClick={() => onNavigateTab('inicio')}
                >
                  <Megaphone size={15} />
                  Banner do Mês (Início)
                </button>
                <button
                  type="button"
                  className="si-btn si-btn-outline si-btn-sm"
                  onClick={onOpenAdminPanel}
                >
                  Área do Artista
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
