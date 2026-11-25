import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  EyeOff,
  ImagePlus,
  Maximize2,
  Megaphone,
  Save,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { STUDIO_DEFAULTS } from '../data/studioData';
import { inspectForThreats } from '../services/securityGuard';
import {
  RemoteStudioConfig,
  compressBannerImage,
  getCurrentPromoMonthLabel,
  publishStudioConfig,
} from '../services/studioSync';

interface MonthlyPromoBannerProps {
  remoteConfig: RemoteStudioConfig;
  isAdmin: boolean;
  isClientLoggedIn: boolean;
  whatsappUrl: string;
  onRequestQuote: () => void;
  onOpenAdminPanel: () => void;
  onToast: (msg: string) => void;
}

export const MonthlyPromoBanner: React.FC<MonthlyPromoBannerProps> = ({
  remoteConfig,
  isAdmin,
  isClientLoggedIn,
  whatsappUrl,
  onRequestQuote,
  onOpenAdminPanel,
  onToast,
}) => {
  const prefersReduced = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [monthLabel, setMonthLabel] = useState(
    remoteConfig.promoBannerMonth || getCurrentPromoMonthLabel()
  );
  const [titleText, setTitleText] = useState(remoteConfig.promoBannerTitle);
  const [busy, setBusy] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    setMonthLabel(remoteConfig.promoBannerMonth || getCurrentPromoMonthLabel());
    setTitleText(remoteConfig.promoBannerTitle);
  }, [remoteConfig.promoBannerMonth, remoteConfig.promoBannerTitle]);

  const hasBanner = Boolean(remoteConfig.promoBannerDataUrl);

  // Para clientes normais: só renderiza quando o administrador tiver feito upload do banner
  if (!isAdmin && !hasBanner) {
    return null;
  }

  const publishBannerFields = async (
    nextDataUrl: string,
    nextMonth: string,
    nextTitle: string,
    successMessage: string
  ) => {
    if (!inspectForThreats(nextMonth, 'Mês da promoção').safe) return;
    if (!inspectForThreats(nextTitle, 'Título do banner').safe) return;

    setBusy(true);
    try {
      await publishStudioConfig(
        {
          studioName: remoteConfig.studioName,
          whatsapp: remoteConfig.whatsapp,
          instagram: remoteConfig.instagram,
          publicCoupon: remoteConfig.publicCoupon,
          logoDataUrl: remoteConfig.logoDataUrl,
          promoBannerDataUrl: nextDataUrl,
          promoBannerMonth: nextMonth.trim().slice(0, 32),
          promoBannerTitle: nextTitle.trim().slice(0, 80),
          apkDownloadUrl: remoteConfig.apkDownloadUrl,
          primaryColor: remoteConfig.primaryColor,
          accentGoldColor: remoteConfig.accentGoldColor,
          bgDarkColor: remoteConfig.bgDarkColor,
          fullSleeveMin: remoteConfig.fullSleeveMin,
          fullSleeveNote: remoteConfig.fullSleeveNote,
          sizeTiers: remoteConfig.sizeTiers,
          priceItems: remoteConfig.priceItems,
        },
        remoteConfig.configVersion
      );
      onToast(successMessage);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao atualizar banner promocional.');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    try {
      const compressed = await compressBannerImage(file);
      const effectiveMonth = (monthLabel || getCurrentPromoMonthLabel()).trim().slice(0, 32);
      await publishBannerFields(
        compressed,
        effectiveMonth,
        titleText,
        'Banner promocional publicado! O app dos clientes será atualizado automaticamente.'
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Falha ao processar a imagem do banner.');
      setBusy(false);
    }
  };

  const handleRemoveBanner = async () => {
    await publishBannerFields(
      '',
      '',
      '',
      'Banner removido da tela inicial dos clientes.'
    );
  };

  const handleSaveText = async () => {
    if (!hasBanner) return;
    await publishBannerFields(
      remoteConfig.promoBannerDataUrl,
      monthLabel || getCurrentPromoMonthLabel(),
      titleText,
      'Texto do banner atualizado para todos os clientes!'
    );
  };

  return (
    <>
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-4"
      >
        {/* Painel de Controle Exclusivo do Administrador (visível apenas para andreschullz1313@gmail.com) */}
        {isAdmin && (
          <div
            className="si-card space-y-4 border-2"
            style={{
              borderColor: hasBanner ? 'var(--pain-low)' : 'var(--accent-gold)',
              background: 'var(--card-alt)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Megaphone size={20} style={{ color: 'var(--accent-gold)' }} />
                <div>
                  <div className="font-bold text-base leading-tight" style={{ color: 'var(--accent-gold)' }}>
                    Banner Promocional Mensal (Área do Admin)
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Conectado como {STUDIO_DEFAULTS.adminEmail}
                  </div>
                </div>
              </div>

              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider"
                style={{
                  borderColor: hasBanner ? 'var(--pain-low)' : 'var(--border-strong)',
                  color: hasBanner ? 'var(--pain-low-text)' : 'var(--text-muted)',
                  background: 'var(--card)',
                }}
              >
                {hasBanner ? (
                  <>
                    <CheckCircle2 size={14} />
                    Exposto para clientes
                  </>
                ) : (
                  <>
                    <EyeOff size={14} />
                    Oculto até o upload
                  </>
                )}
              </span>
            </div>

            {!hasBanner && (
              <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>
                Nenhum banner enviado neste mês. Esta área aparece apenas para você enquanto não houver imagem publicada. Assim que você fizer o upload, a tela inicial dos clientes será atualizada automaticamente com o banner.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">
                <span className="inline-flex items-center gap-1.5 mb-1">
                  <Calendar size={14} />
                  Mês / Campanha (opcional)
                </span>
                <input
                  type="text"
                  className="si-input text-sm"
                  maxLength={32}
                  placeholder="Ex: Novembro 2026"
                  value={monthLabel}
                  onChange={(e) => setMonthLabel(e.target.value)}
                />
              </label>

              <label className="block text-sm font-semibold">
                <span className="block mb-1">Título / Chamada curta (opcional)</span>
                <input
                  type="text"
                  className="si-input text-sm"
                  maxLength={80}
                  placeholder="Ex: Flash Day com 20% OFF neste mês"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                />
              </label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleUploadBannerFile}
            />

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="si-btn si-btn-sm"
              >
                <ImagePlus size={16} />
                {busy
                  ? 'Enviando e atualizando clientes...'
                  : hasBanner
                    ? 'Trocar Banner do Mês'
                    : 'Fazer Upload do Banner do Mês'}
              </button>

              {hasBanner && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleSaveText}
                    className="si-btn si-btn-outline si-btn-sm"
                  >
                    <Save size={15} />
                    Atualizar Texto
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleRemoveBanner}
                    className="si-btn si-btn-outline si-btn-sm"
                    style={{ borderColor: 'var(--r)', color: 'var(--pain-ext-text)' }}
                  >
                    <Trash2 size={15} />
                    Remover Banner
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="si-btn si-btn-outline si-btn-sm ml-auto"
              >
                <Settings size={15} />
                Área do Artista
              </button>
            </div>
          </div>
        )}

        {/* Exibição do Banner Promocional na Tela Inicial (clientes + admin quando publicado) */}
        {hasBanner && (
          <article
            aria-label={remoteConfig.promoBannerTitle || 'Banner promocional do mês'}
            className="si-card p-0 overflow-hidden border-2"
            style={{ borderColor: 'var(--r)' }}
          >
            <div
              className="flex items-center justify-between gap-2 px-4 py-2.5 border-b"
              style={{
                background: 'var(--card-alt)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Megaphone size={17} style={{ color: 'var(--r)' }} className="shrink-0" />
                <span
                  className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] truncate"
                  style={{ color: 'var(--accent-gold)' }}
                >
                  {remoteConfig.promoBannerMonth || 'Promoção do Mês'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label="Ampliar banner promocional"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0"
                style={{
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text)',
                  background: 'var(--card)',
                }}
              >
                <Maximize2 size={13} />
                Ampliar
              </button>
            </div>

            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              className="relative block w-full bg-black border-0 p-0 cursor-pointer group overflow-hidden"
            >
              <img
                src={remoteConfig.promoBannerDataUrl}
                alt={remoteConfig.promoBannerTitle || 'Promoção do mês Schullz Ink Tattoo'}
                className="w-full max-h-[460px] object-contain mx-auto transition-transform duration-500 ease-out group-hover:scale-[1.015]"
              />
            </button>

            <div className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                {remoteConfig.promoBannerTitle ? (
                  <h3 className="text-2xl leading-tight" style={{ color: 'var(--text)' }}>
                    {remoteConfig.promoBannerTitle}
                  </h3>
                ) : (
                  <h3 className="text-xl leading-tight" style={{ color: 'var(--text)' }}>
                    Campanha Especial · {remoteConfig.studioName}
                  </h3>
                )}
                <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>
                  Aproveite as condições deste mês diretamente pelo app ou WhatsApp.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <button type="button" className="si-btn si-btn-sm" onClick={onRequestQuote}>
                  {isClientLoggedIn ? 'Garantir no Orçamento' : 'Fazer Login & Orçamento'}
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="si-btn si-btn-outline si-btn-sm"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </article>
        )}
      </motion.div>

      {/* Lightbox para ampliar o banner promocional */}
      {zoomOpen && hasBanner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setZoomOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={remoteConfig.promoBannerTitle || 'Banner promocional ampliado'}
        >
          <div
            className="si-card max-w-4xl w-full p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <span
                  className="text-xs font-bold uppercase tracking-[0.2em] block"
                  style={{ color: 'var(--accent-gold)' }}
                >
                  {remoteConfig.promoBannerMonth || 'Promoção do Mês'}
                </span>
                {remoteConfig.promoBannerTitle && (
                  <h3 className="text-2xl">{remoteConfig.promoBannerTitle}</h3>
                )}
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setZoomOpen(false)}
                className="p-2 rounded border cursor-pointer"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text)' }}
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={remoteConfig.promoBannerDataUrl}
              alt={remoteConfig.promoBannerTitle || 'Banner promocional ampliado'}
              className="w-full max-h-[75vh] object-contain rounded bg-black"
            />
          </div>
        </div>
      )}
    </>
  );
};
