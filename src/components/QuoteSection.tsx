import React, { useEffect, useRef, useState } from 'react';
import { Calendar, FileDown, MessageCircle, Share2 } from 'lucide-react';
import {
  ANAMNESE_QUESTIONS,
  BODY_PAIN_ZONES,
  formatBRL,
  QUOTE_STYLES,
  SIZE_TIERS,
  STUDIO_DEFAULTS,
} from '../data/studioData';
import { ClientUser, SavedQuote } from './AuthGateTab';
import { STUDIO_LOGO_URI } from '../assets/studioMedia';
import { fmt, useLanguage } from '../i18n/LanguageContext';
import { createAppointmentOrderPdf, GeneratedAppointmentPdf } from '../services/bookingPdf';
import {
  buildAppointmentWhatsAppText,
  buildAppointmentWhatsAppUrl,
  buildClientCopyWhatsAppUrl,
} from '../services/scheduleService';
import { inspectForThreats } from '../services/securityGuard';
import { EditableSizeTier } from '../services/studioSync';

interface QuoteSectionProps {
  user: ClientUser | null;
  selectedStyle: string;
  onChangeStyle: (s: string) => void;
  selectedZone: string;
  onChangeZone: (z: string) => void;
  sizeIdx: number;
  onChangeSizeIdx: (idx: number) => void;
  couponInput: string;
  onChangeCouponInput: (val: string) => void;
  idea: string;
  onChangeIdea: (val: string) => void;
  anamnese: boolean[];
  onChangeAnamnese: React.Dispatch<React.SetStateAction<boolean[]>>;
  acceptedTerms: boolean;
  onChangeAcceptedTerms: (accepted: boolean) => void;
  signatureDataUrl: string;
  onChangeSignatureDataUrl: (url: string) => void;
  publicCoupon: string;
  studioWhatsapp: string;
  studioInstagram?: string;
  studioName?: string;
  logoUrl?: string;
  sizeTierPrices?: EditableSizeTier[];
  onSaveQuote: (q: SavedQuote) => void;
  onGoToLogin: () => void;
  onProceedToSchedule?: () => void;
  onToast: (msg: string) => void;
}

export const QuoteSection: React.FC<QuoteSectionProps> = ({
  user,
  selectedStyle,
  onChangeStyle,
  selectedZone,
  onChangeZone,
  sizeIdx,
  onChangeSizeIdx,
  couponInput,
  onChangeCouponInput,
  idea,
  onChangeIdea,
  anamnese,
  onChangeAnamnese,
  acceptedTerms,
  onChangeAcceptedTerms,
  signatureDataUrl,
  onChangeSignatureDataUrl,
  publicCoupon,
  studioWhatsapp,
  studioInstagram = STUDIO_DEFAULTS.instagram,
  studioName = STUDIO_DEFAULTS.studioName,
  logoUrl,
  sizeTierPrices,
  onSaveQuote,
  onGoToLogin,
  onProceedToSchedule,
  onToast,
}) => {
  const { domain, tQuoteStyle, tZoneName } = useLanguage();
  const q = domain.quote;

  const [clientName, setClientName] = useState(user?.name || '');
  const [clientWa, setClientWa] = useState(user?.whatsapp || '');
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [resultModal, setResultModal] = useState<{
    docCode: string;
    coupon: string;
    studioWaUrl: string;
    clientWaUrl: string;
    whatsappText: string;
    pdf: GeneratedAppointmentPdf;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const studioWaAnchorRef = useRef<HTMLAnchorElement | null>(null);

  const signed = Boolean(signatureDataUrl);

  useEffect(() => {
    const uid = user?.email || null;
    if (uid && lastUserIdRef.current !== uid) {
      lastUserIdRef.current = uid;
      setClientName(user?.name || '');
      setClientWa(user?.whatsapp || '');
    } else if (!uid) {
      lastUserIdRef.current = null;
    }
  }, [user]);

  // Fit signature canvas cleanly & restore saved signature bitmap if present
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const fitCanvas = () => {
      const rect = cv.getBoundingClientRect();
      const targetW = Math.round(rect.width);
      const targetH = Math.round(rect.height);
      if (targetW <= 0 || targetH <= 0) return;
      if (cv.width !== targetW || cv.height !== targetH) {
        cv.width = targetW;
        cv.height = targetH;
      }
      if (signatureDataUrl) {
        const img = new Image();
        img.onload = () => {
          const ctx = cv.getContext('2d');
          if (!ctx) return;
          ctx.clearRect(0, 0, cv.width, cv.height);
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
        };
        img.src = signatureDataUrl;
      }
    };
    fitCanvas();
    window.addEventListener('resize', fitCanvas);
    return () => window.removeEventListener('resize', fitCanvas);
  }, [user, signatureDataUrl]);

  if (!user) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-10">
        <div className="si-card tab-stagger-block space-y-4 text-center py-10">
          <div className="tab-stagger-kicker text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--accent-gold)' }}>
            {q.restrictedKicker}
          </div>
          <h2 className="tab-stagger-title">{q.restrictedTitle}</h2>
          <p className="tab-stagger-lead max-w-xl mx-auto text-lg" style={{ color: 'var(--text-muted)' }}>
            {q.restrictedBody}
          </p>
          <div className="tab-stagger-actions pt-2">
            <button type="button" className="si-btn" onClick={onGoToLogin}>
              {q.goToLogin}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const allZoneKeys = Array.from(new Set(BODY_PAIN_ZONES.map((z) => z.name))).concat('Outra região');
  const cleanCoupon = couponInput.trim().toUpperCase();
  const hasDiscount =
    cleanCoupon.length > 0 &&
    (cleanCoupon === publicCoupon.toUpperCase() || cleanCoupon === user.coupon.toUpperCase());

  const tiers: EditableSizeTier[] =
    sizeTierPrices && sizeTierPrices.length > 0
      ? sizeTierPrices
      : SIZE_TIERS.map((s) => ({
          label: s.label,
          min: s.min,
          max: s.max,
          startingFrom: Boolean(s.startingFrom),
        }));
  const safeSizeIdx = Math.min(Math.max(0, sizeIdx), tiers.length - 1);
  const activeTier = tiers[safeSizeIdx] || tiers[0];
  const minVal = activeTier.min;
  const maxVal = activeTier.max;

  const mult = hasDiscount ? 0.8 : 1;
  const estimateText = activeTier.startingFrom
    ? fmt(q.startingFrom, { val: formatBRL(minVal * mult) })
    : `${formatBRL(minVal * mult)} – ${formatBRL(maxVal * mult)}`;

  const getTierDisplayLabel = (tier: EditableSizeTier, idx: number): string => {
    const def = SIZE_TIERS[idx];
    if (def && tier.label === def.label && domain.sizeTiers[idx]) {
      return domain.sizeTiers[idx];
    }
    return tier.label;
  };
  const selectedTierLabel = getTierDisplayLabel(activeTier, safeSizeIdx);
  const localizedStyle = tQuoteStyle(selectedStyle);
  const localizedZone = tZoneName(selectedZone);

  const attentionCount = anamnese.slice(0, 5).filter(Boolean).length;

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const pt = getCanvasPoint(e);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--r').trim() || '#F22929';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const commitSignatureFromCanvas = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const cv = canvasRef.current;
    if (!cv) return;
    try {
      onChangeSignatureDataUrl(cv.toDataURL('image/png'));
    } catch {
      // ignore canvas export issue
    }
  };

  const clearSignature = () => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (cv && ctx) {
      ctx.clearRect(0, 0, cv.width, cv.height);
    }
    onChangeSignatureDataUrl('');
  };

  const createCompleteQuotePdf = async (docCode: string): Promise<GeneratedAppointmentPdf> => {
    const cleanName = clientName.replace(/[<>]/g, '').trim() || user.name;
    const cleanWa = clientWa.replace(/\D/g, '') || user.whatsapp;
    const anamneseQuestionsList = domain.anamneseQuestions.length
      ? domain.anamneseQuestions
      : ANAMNESE_QUESTIONS;
    const anamneseItems = anamneseQuestionsList.map((question, idx) => ({
      question,
      answer: Boolean(anamnese[idx]),
    }));

    return createAppointmentOrderPdf({
      bookingId: docCode,
      date: 'A definir',
      time: 'A definir',
      clientName: cleanName,
      clientWhatsapp: cleanWa,
      clientEmail: user.email,
      style: localizedStyle,
      bodyZone: localizedZone,
      size: selectedTierLabel,
      estimateText,
      notes: idea.trim(),
      couponCode: hasDiscount ? cleanCoupon : user.coupon || undefined,
      anamneseItems,
      acceptedTerms,
      signatureDataUrl,
      isQuoteOnly: true,
      studioName,
      studioWhatsapp,
      studioInstagram,
      logoUrl: logoUrl || STUDIO_LOGO_URI,
    });
  };

  const handleBuildPDF = async () => {
    setGeneratingPdf(true);
    try {
      const docCode = `ORC_${Date.now().toString().slice(-6)}`;
      const pdf = await createCompleteQuotePdf(docCode);
      pdf.download();
      onToast(`PDF ${pdf.filename} baixado neste aparelho!`);
    } catch {
      onToast('Não foi possível gerar o PDF agora.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleFinalize = async () => {
    if (!inspectForThreats(clientName, 'Nome do orçamento').safe) return;
    if (!inspectForThreats(idea, 'Descrição da ideia').safe) return;

    const cleanName = clientName.replace(/[<>]/g, '').trim();
    const cleanWa = clientWa.replace(/\D/g, '');
    if (!cleanName || cleanWa.length < 10) {
      onToast(q.toastNeedContact);
      return;
    }
    if (!acceptedTerms || !signed) {
      onToast('Aceite o contrato (incluindo ciência de NÃO DEVOLUÇÃO dos 50%) e assine na tela para gerar o PDF.');
      return;
    }

    setGeneratingPdf(true);
    try {
      const docCode = `ORC_${Date.now().toString().slice(-6)}`;
      const pdf = await createCompleteQuotePdf(docCode);
      // Automatic immediate download on phone or computer
      pdf.download();

      const photosCount = photos.filter(Boolean).length;
      onSaveQuote({
        id: docCode,
        date: new Date().toISOString(),
        style: localizedStyle,
        place: localizedZone,
        size: selectedTierLabel,
        estimate: estimateText,
        idea: idea.trim(),
        couponUsed: hasDiscount ? cleanCoupon : undefined,
        photosCount,
      });

      const appliedCoupon = hasDiscount ? cleanCoupon : user.coupon || publicCoupon;
      const waText = buildAppointmentWhatsAppText({
        studioName,
        bookingId: docCode,
        date: 'A definir',
        time: 'A definir',
        clientName: cleanName,
        clientWhatsapp: cleanWa,
        style: localizedStyle,
        bodyZone: localizedZone,
        size: selectedTierLabel,
        estimateText,
        notes: idea.trim(),
        couponCode: appliedCoupon,
        isQuoteOnly: true,
      });
      const studioWaUrl = buildAppointmentWhatsAppUrl({
        studioWhatsapp,
        studioName,
        bookingId: docCode,
        date: 'A definir',
        time: 'A definir',
        clientName: cleanName,
        clientWhatsapp: cleanWa,
        style: localizedStyle,
        bodyZone: localizedZone,
        size: selectedTierLabel,
        estimateText,
        notes: idea.trim(),
        couponCode: appliedCoupon,
        isQuoteOnly: true,
      });
      const clientWaUrl = buildClientCopyWhatsAppUrl({
        clientWhatsapp: cleanWa,
        studioName,
        bookingId: docCode,
        date: 'A definir',
        time: 'A definir',
        clientName: cleanName,
        style: localizedStyle,
        bodyZone: localizedZone,
        size: selectedTierLabel,
        estimateText,
        notes: idea.trim(),
        couponCode: appliedCoupon,
        isQuoteOnly: true,
      });

      setResultModal({
        docCode,
        coupon: appliedCoupon,
        studioWaUrl,
        clientWaUrl,
        whatsappText: waText,
        pdf,
      });

      onToast('PDF completo baixado! Escolha enviar para o WhatsApp da SCHULLZ e do cliente.');

      // Trigger dispatch toward Schullz WhatsApp automatically cleanly via hidden anchor
      if (studioWaAnchorRef.current) {
        studioWaAnchorRef.current.href = studioWaUrl;
        window.setTimeout(() => {
          studioWaAnchorRef.current?.click();
        }, 350);
      }
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleNativeSharePdf = async (pdf: GeneratedAppointmentPdf, text: string) => {
    if (navigator.canShare && navigator.canShare({ files: [pdf.file] })) {
      try {
        await navigator.share({
          title: `Orçamento e Contrato · ${studioName}`,
          text,
          files: [pdf.file],
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    pdf.download();
    onToast('Arquivo PDF baixado para anexar manualmente no WhatsApp.');
  };

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <a
        ref={studioWaAnchorRef}
        href={resultModal?.studioWaUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden"
        aria-hidden="true"
      >
        WhatsApp SCHULLZ
      </a>

      <div>
        <div className="tab-stagger-kicker text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--accent-gold)' }}>
          {q.kicker}
        </div>
        <h2 className="tab-stagger-title">{q.title}</h2>
      </div>

      <div className="si-card tab-stagger-block space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="qs" className="block font-semibold mb-1">
              {q.styleLabel}
            </label>
            <select
              id="qs"
              className="si-input"
              value={selectedStyle}
              onChange={(e) => onChangeStyle(e.target.value)}
            >
              {QUOTE_STYLES.map((s) => (
                <option key={s} value={s}>
                  {tQuoteStyle(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="qp" className="block font-semibold mb-1">
              {q.zoneLabel}
            </label>
            <select
              id="qp"
              className="si-input"
              value={selectedZone}
              onChange={(e) => onChangeZone(e.target.value)}
            >
              {allZoneKeys.map((z) => (
                <option key={z} value={z}>
                  {tZoneName(z)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="qz" className="block font-semibold mb-1">
              {q.sizeLabel}
            </label>
            <select
              id="qz"
              className="si-input"
              value={safeSizeIdx}
              onChange={(e) => onChangeSizeIdx(Number(e.target.value))}
            >
              {tiers.map((tier, i) => (
                <option key={`${tier.label}-${i}`} value={i}>
                  {getTierDisplayLabel(tier, i)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="qc" className="block font-semibold mb-1">
              {q.couponLabel}
            </label>
            <input
              id="qc"
              className="si-input"
              placeholder={q.couponPlaceholder}
              autoCapitalize="characters"
              value={couponInput}
              onChange={(e) => onChangeCouponInput(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        {/* Live Price Estimate */}
        <div
          className="p-4 rounded border flex flex-wrap items-center justify-between gap-2"
          style={{ borderColor: 'var(--border-strong)', background: 'var(--card-alt)' }}
        >
          <div>
            <span className="font-semibold block" style={{ color: 'var(--text-muted)' }}>
              {q.initialEstimate}
            </span>
            <small style={{ color: 'var(--text-muted)' }}>
              Sinal de reserva: 50% do valor total (não reembolsável)
            </small>
          </div>
          <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--r)' }}>
            {estimateText}{' '}
            {hasDiscount && (
              <span className="text-base font-bold" style={{ color: 'var(--pain-low-text)' }}>
                {q.discountApplied}
              </span>
            )}
          </div>
        </div>

        {/* Client Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="qn" className="block font-semibold mb-1">
              {q.yourName}
            </label>
            <input
              id="qn"
              className="si-input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="qw" className="block font-semibold mb-1">
              {q.whatsapp}
            </label>
            <input
              id="qw"
              inputMode="tel"
              className="si-input"
              value={clientWa}
              onChange={(e) => setClientWa(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="qd" className="block font-semibold mb-1">
            {q.describeIdea}
          </label>
          <textarea
            id="qd"
            rows={3}
            className="si-input"
            placeholder={q.ideaPlaceholder}
            value={idea}
            onChange={(e) => onChangeIdea(e.target.value)}
          />
        </div>

        {/* 3 Angle Photos */}
        <div className="space-y-2 pt-2">
          <h3 style={{ color: 'var(--accent-gold)' }}>{q.photosTitle}</h3>
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>
            {q.photosDesc}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {q.photoLabels.map((label, idx) => (
              <div
                key={idx}
                className="p-3 rounded border space-y-2"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-alt)' }}
              >
                <label htmlFor={`qf${idx + 1}`} className="block font-semibold text-base">
                  {label}
                </label>
                <input
                  id={`qf${idx + 1}`}
                  type="file"
                  accept="image/*"
                  className="si-input text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPhotos((prev) => {
                      const next = [...prev];
                      next[idx] = file;
                      return next;
                    });
                  }}
                />
                <small className="block text-sm break-all" style={{ color: 'var(--text-muted)' }}>
                  {photos[idx] ? photos[idx]!.name : q.noPhotoSelected}
                </small>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Anamnese */}
        <div className="space-y-2 pt-2">
          <h3 style={{ color: 'var(--accent-gold)' }}>{q.anamneseTitle}</h3>
          <div className="space-y-2">
            {domain.anamneseQuestions.map((questionText, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer py-1">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-[var(--r)] shrink-0"
                  checked={Boolean(anamnese[i])}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onChangeAnamnese((prev) => prev.map((val, idx) => (idx === i ? checked : val)));
                  }}
                />
                <span className="text-base">{questionText}</span>
              </label>
            ))}
          </div>
          <div
            className="p-3 rounded border font-semibold text-base"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-alt)' }}
          >
            {attentionCount > 0
              ? fmt(q.anamneseAttention, { count: attentionCount })
              : q.anamneseNone}
          </div>
        </div>

        {/* Contract & Terms + Explicit Non-Refundable 50% Deposit */}
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 style={{ color: 'var(--accent-gold)' }}>{q.contractTitle}</h3>
          <p className="text-base">{q.contractP1}</p>
          <p className="text-base">
            <strong>{q.contractP2Strong}</strong> {q.contractP2}
          </p>
          <div
            className="p-3.5 rounded border-2 space-y-1"
            style={{ borderColor: 'var(--r)', background: 'var(--card-alt)' }}
          >
            <strong className="uppercase text-sm tracking-wider" style={{ color: 'var(--r)' }}>
              Ciência Obrigatória — Sinal de 50% (NÃO FAZEMOS DEVOLUÇÃO)
            </strong>
            <p className="text-sm m-0 font-semibold leading-relaxed" style={{ color: 'var(--text)' }}>
              A confirmação do agendamento exige o envio de 50% do valor total da tattoo como sinal.{' '}
              <strong style={{ color: 'var(--r)' }}>NÃO FAZEMOS DEVOLUÇÃO DO REFERENTE VALOR</strong>, por ele cobrir os gastos de agendamento, reserva exclusiva de horário, separação de materiais descartáveis, preparação/alteração da arte e acompanhamento via WhatsApp.
            </p>
          </div>
          <p className="text-base">
            <strong>{q.contractP3Strong}</strong> {q.contractP3}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {q.contractNote}
          </p>

          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              className="mt-1 w-5 h-5 accent-[var(--r)] shrink-0"
              checked={acceptedTerms}
              onChange={(e) => onChangeAcceptedTerms(e.target.checked)}
            />
            <span className="font-bold text-base">
              Li e aceito o contrato, a ficha de anamnese e tenho ciência do sinal de 50% — NÃO FAZEMOS DEVOLUÇÃO do referente valor por cobrir gastos de agendamento.
            </span>
          </label>
        </div>

        {/* Digital Signature */}
        <div className="space-y-2">
          <label className="block font-semibold">{q.signLabel}</label>
          <canvas
            ref={canvasRef}
            className="sig-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={commitSignatureFromCanvas}
            onPointerLeave={commitSignatureFromCanvas}
          />
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" className="si-btn si-btn-outline si-btn-sm" onClick={clearSignature}>
              {q.clearSign}
            </button>
            <button
              type="button"
              disabled={generatingPdf}
              className="si-btn si-btn-outline"
              onClick={() => void handleBuildPDF()}
            >
              <FileDown size={18} />
              {generatingPdf ? 'Gerando PDF...' : 'Baixar PDF Agora'}
            </button>
            <button
              type="button"
              disabled={generatingPdf}
              className="si-btn"
              onClick={() => void handleFinalize()}
            >
              <MessageCircle size={18} />
              Assinar, Baixar PDF e Enviar WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {resultModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.78)' }}
          role="dialog"
          aria-modal="true"
          aria-label={q.modalAria}
        >
          <div className="si-card max-w-lg w-full space-y-4">
            <h3 style={{ color: 'var(--accent-gold)' }}>PDF Gerado e Baixado Automaticamente</h3>
            <p className="text-sm m-0" style={{ color: 'var(--text)' }}>
              O arquivo <strong>{resultModal.pdf.filename}</strong> (com dados da tattoo, valor, local, anamnese, contrato, ciência dos 50% NÃO REEMBOLSÁVEL e assinatura) já foi baixado no seu dispositivo.
            </p>
            <p className="text-sm m-0">
              <strong>{q.modalCodeLabel}</strong>{' '}
              <span style={{ color: 'var(--r)' }}>{resultModal.coupon}</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                className="si-btn"
                href={resultModal.studioWaUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} />
                Enviar para WhatsApp da SCHULLZ
              </a>

              {resultModal.clientWaUrl && (
                <a
                  className="si-btn si-btn-outline"
                  href={resultModal.clientWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={17} />
                  Enviar para WhatsApp do Cliente
                </a>
              )}

              <button
                type="button"
                className="si-btn si-btn-outline si-btn-sm"
                onClick={() => void handleNativeSharePdf(resultModal.pdf, resultModal.whatsappText)}
              >
                <Share2 size={16} />
                Anexar Arquivo PDF (Celular)
              </button>

              <button
                type="button"
                className="si-btn si-btn-outline si-btn-sm"
                onClick={() => resultModal.pdf.download()}
              >
                <FileDown size={16} />
                Baixar PDF Novamente
              </button>

              {onProceedToSchedule && (
                <button
                  type="button"
                  className="si-btn si-btn-sm"
                  onClick={() => {
                    setResultModal(null);
                    onProceedToSchedule();
                  }}
                >
                  <Calendar size={16} />
                  Escolher Dia e Horário na Agenda
                </button>
              )}

              <button
                type="button"
                className="si-btn si-btn-outline si-btn-sm"
                onClick={() => setResultModal(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
