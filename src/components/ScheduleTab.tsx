import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  Calendar,
  CheckCircle2,
  Clock,
  FileDown,
  Layers,
  Lock,
  MessageCircle,
  Share2,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import {
  ANAMNESE_QUESTIONS,
  BODY_PAIN_ZONES,
  QUOTE_STYLES,
  SIZE_TIERS,
  formatBRL,
} from '../data/studioData';
import { useLanguage } from '../i18n/LanguageContext';
import { GeneratedAppointmentPdf, createAppointmentOrderPdf } from '../services/bookingPdf';
import { EditableSizeTier } from '../services/studioSync';
import { readVerifiedStorage, writeSignedStorage } from '../services/securityGuard';
import {
  PushPermissionStatus,
  cancelScheduledPushReminder,
  ensurePushSubscription,
  formatReminderDateTimeBR,
  getWebPushPermission,
  isWebPushSupported,
  schedule24hPushReminder,
  sendTestWebPush,
} from '../services/webPushService';
import {
  BOOKING_TIERS,
  BookingTierId,
  LocalBookingReceipt,
  ScheduleSlotRecord,
  blockAllOpenSlotsForDay,
  bookAppointmentSlot,
  buildAppointmentWhatsAppText,
  buildAppointmentWhatsAppUrl,
  buildClientCopyWhatsAppUrl,
  buildSlotId,
  formatIsoDateBR,
  getBookingTier,
  getDayAvailabilityForTier,
  getUpcomingDates,
  isPastTimeSlot,
  toggleAdminSlotBlock,
} from '../services/scheduleService';
import { ClientUser } from './AuthGateTab';

const LOCAL_BOOKINGS_KEY = 'schullz_client_bookings_v1';

const TIER_TO_SIZE_IDX: Record<BookingTierId, number> = {
  pequeno: 1,
  medio: 3,
  grande: 5,
};

interface ScheduleTabProps {
  user: ClientUser | null;
  slotsById: Record<string, ScheduleSlotRecord>;
  slotsLoaded: boolean;
  selectedStyle: string;
  onChangeStyle: (s: string) => void;
  selectedZone: string;
  onChangeZone: (z: string) => void;
  sizeIdx: number;
  onChangeSizeIdx: (idx: number) => void;
  couponInput: string;
  onChangeCouponInput: (val: string) => void;
  notes: string;
  onChangeNotes: (val: string) => void;
  anamnese: boolean[];
  onChangeAnamnese: React.Dispatch<React.SetStateAction<boolean[]>>;
  acceptedTerms: boolean;
  onChangeAcceptedTerms: (accepted: boolean) => void;
  signatureDataUrl: string;
  onChangeSignatureDataUrl: (url: string) => void;
  sizeTierPrices?: EditableSizeTier[];
  studioName: string;
  studioWhatsapp: string;
  studioInstagram?: string;
  logoUrl?: string;
  publicCoupon: string;
  isAdmin: boolean;
  onToast: (msg: string) => void;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  user,
  slotsById,
  slotsLoaded,
  selectedStyle,
  onChangeStyle,
  selectedZone,
  onChangeZone,
  sizeIdx,
  onChangeSizeIdx,
  couponInput,
  onChangeCouponInput,
  notes,
  onChangeNotes,
  anamnese,
  onChangeAnamnese,
  acceptedTerms,
  onChangeAcceptedTerms,
  signatureDataUrl,
  onChangeSignatureDataUrl,
  sizeTierPrices,
  studioName,
  studioWhatsapp,
  studioInstagram,
  logoUrl,
  publicCoupon,
  isAdmin,
  onToast,
}) => {
  const { domain, locale, tQuoteStyle, tZoneName } = useLanguage();

  const days = useMemo(() => getUpcomingDates(21, locale), [locale]);
  const defaultDay = useMemo(
    () => days.find((d) => !d.isMondayClosed)?.iso || days[0]?.iso || '',
    [days]
  );

  const [selectedTierId, setSelectedTierId] = useState<BookingTierId>('pequeno');
  const [selectedDate, setSelectedDate] = useState<string>(defaultDay);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState<string>(user?.name || '');
  const [clientWhatsapp, setClientWhatsapp] = useState<string>(user?.whatsapp || '');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [adminBusySlot, setAdminBusySlot] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<LocalBookingReceipt | null>(null);
  const [lastPdf, setLastPdf] = useState<GeneratedAppointmentPdf | null>(null);
  const [myBookings, setMyBookings] = useState<LocalBookingReceipt[]>(() =>
    readVerifiedStorage<LocalBookingReceipt[]>(LOCAL_BOOKINGS_KEY, [])
  );
  const [pushSupported] = useState<boolean>(() => isWebPushSupported());
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>(() =>
    getWebPushPermission()
  );
  const [enablePushReminder, setEnablePushReminder] = useState<boolean>(() => isWebPushSupported());
  const [pushTesting, setPushTesting] = useState<boolean>(false);
  const [pushBusyBookingId, setPushBusyBookingId] = useState<string | null>(null);

  const waAutoAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const signed = Boolean(signatureDataUrl);

  useEffect(() => {
    if (user?.name && !clientName) setClientName(user.name);
    if (user?.whatsapp && !clientWhatsapp) setClientWhatsapp(user.whatsapp);
  }, [user, clientName, clientWhatsapp]);

  // Keep local bookings synced with cross-tab updates
  useEffect(() => {
    const reload = () => {
      setMyBookings(readVerifiedStorage<LocalBookingReceipt[]>(LOCAL_BOOKINGS_KEY, []));
    };
    window.addEventListener('storage', reload);
    window.addEventListener('schullz-pull-refresh', reload);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('schullz-pull-refresh', reload);
    };
  }, []);

  // Automatically remove any client booking that was cancelled/released by the admin
  useEffect(() => {
    if (!slotsLoaded) return;
    setMyBookings((prev) => {
      const cancelledOnes = prev.filter(
        (b) => b.slotId && !slotsById[b.slotId]
      );
      if (cancelledOnes.length === 0) return prev;

      cancelledOnes.forEach((b) => {
        if (b.pushReminder?.status === 'scheduled') {
          void cancelScheduledPushReminder(
            b.pushReminder.reminderId,
            b.pushReminder.cancelToken
          ).catch(() => {});
        }
      });

      const remaining = prev.filter((b) => !b.slotId || Boolean(slotsById[b.slotId]));
      writeSignedStorage(LOCAL_BOOKINGS_KEY, remaining);
      setLastReceipt((cur) =>
        cur && cancelledOnes.some((c) => c.id === cur.id) ? null : cur
      );
      onToast('Agendamento cancelado pelo administrador foi removido e o horário liberado na agenda.');
      return remaining;
    });
  }, [slotsById, slotsLoaded, onToast]);

  // Fit signature canvas cleanly & restore saved signature bitmap if present
  useEffect(() => {
    const cv = sigCanvasRef.current;
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
  }, [signatureDataUrl]);

  const selectedTier = useMemo(() => getBookingTier(selectedTierId), [selectedTierId]);
  const activeDayAvail = useMemo(
    () => getDayAvailabilityForTier(selectedDate, slotsById, selectedTierId),
    [selectedDate, slotsById, selectedTierId]
  );

  // Price calculation based on synced sizeIdx / remoteConfig + logged-in coupon
  const cleanCoupon = user ? couponInput.trim().toUpperCase() : '';
  const hasDiscount =
    Boolean(user) &&
    cleanCoupon.length > 0 &&
    (cleanCoupon === publicCoupon.toUpperCase() || cleanCoupon === user?.coupon.toUpperCase());

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
  const activePriceTier = tiers[safeSizeIdx] || tiers[0];
  const getTierDisplayLabel = (tier: EditableSizeTier, idx: number): string => {
    const def = SIZE_TIERS[idx];
    if (def && tier.label === def.label && domain.sizeTiers[idx]) {
      return domain.sizeTiers[idx];
    }
    return tier.label;
  };
  const minVal = activePriceTier.min;
  const maxVal = activePriceTier.max;
  const mult = hasDiscount ? 0.8 : 1;
  const estimateText = activePriceTier.startingFrom
    ? `A partir de ${formatBRL(minVal * mult)}`
    : `${formatBRL(minVal * mult)} – ${formatBRL(maxVal * mult)}`;
  const depositHalfText = activePriceTier.startingFrom
    ? `A partir de ${formatBRL(minVal * mult * 0.5)}`
    : `${formatBRL(minVal * mult * 0.5)} – ${formatBRL(maxVal * mult * 0.5)}`;

  // Clear selectedTime if it becomes unavailable due to booking, block, or tier change
  useEffect(() => {
    if (!selectedTime) return;
    const slotId = buildSlotId(selectedDate, selectedTime);
    if (
      activeDayAvail.isClosed ||
      activeDayAvail.remainingForTier <= 0 ||
      Boolean(slotsById[slotId]) ||
      isPastTimeSlot(selectedDate, selectedTime) ||
      !activeDayAvail.slots.includes(selectedTime)
    ) {
      setSelectedTime('');
    }
  }, [activeDayAvail, slotsById, selectedDate, selectedTime]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleSigDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = sigCanvasRef.current;
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

  const handleSigMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const cv = sigCanvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handleSigCommit = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const cv = sigCanvasRef.current;
    if (!cv) return;
    try {
      onChangeSignatureDataUrl(cv.toDataURL('image/png'));
    } catch {
      // ignore export errors
    }
  };

  const clearSignature = () => {
    const cv = sigCanvasRef.current;
    const ctx = cv?.getContext('2d');
    if (cv && ctx) {
      ctx.clearRect(0, 0, cv.width, cv.height);
    }
    onChangeSignatureDataUrl('');
  };

  const handleAdminToggleSlot = async (time: string) => {
    const slotId = buildSlotId(selectedDate, time);
    const existing = slotsById[slotId];
    setAdminBusySlot(slotId);
    try {
      const res = await toggleAdminSlotBlock(selectedDate, time, existing);
      onToast(
        res === 'blocked'
          ? `Horário ${time} (${formatIsoDateBR(selectedDate)}) bloqueado na agenda.`
          : `Horário ${time} (${formatIsoDateBR(selectedDate)}) liberado para clientes.`
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao atualizar horário.');
    } finally {
      setAdminBusySlot(null);
    }
  };

  const handleAdminBlockDay = async () => {
    setAdminBusySlot('day');
    try {
      const count = await blockAllOpenSlotsForDay(selectedDate, slotsById);
      onToast(
        count > 0
          ? `${count} horário(s) do dia ${formatIsoDateBR(selectedDate)} foram bloqueados.`
          : 'Todos os horários deste dia já estavam ocupados ou bloqueados.'
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao bloquear o dia.');
    } finally {
      setAdminBusySlot(null);
    }
  };

  const buildPdfForReceipt = async (receipt: LocalBookingReceipt): Promise<GeneratedAppointmentPdf> => {
    const questions = domain.anamneseQuestions.length
      ? domain.anamneseQuestions
      : ANAMNESE_QUESTIONS;
    return createAppointmentOrderPdf({
      bookingId: receipt.id,
      date: receipt.date,
      time: receipt.time,
      clientName: receipt.clientName,
      clientWhatsapp: receipt.clientWhatsapp,
      clientEmail: user?.email,
      style: receipt.style,
      bodyZone: receipt.bodyZone,
      size: receipt.size,
      estimateText: receipt.estimateText || estimateText,
      notes: receipt.notes,
      couponCode: user ? cleanCoupon || user.coupon : undefined,
      anamneseItems: questions.map((question, idx) => ({
        question,
        answer: Boolean(anamnese[idx]),
      })),
      acceptedTerms: true,
      signatureDataUrl,
      isQuoteOnly: false,
      studioName,
      studioWhatsapp,
      studioInstagram,
      logoUrl,
    });
  };

  const handleSharePdfAndPixWhatsApp = async (
    receipt: LocalBookingReceipt,
    existingPdf?: GeneratedAppointmentPdf | null
  ) => {
    const pdf = existingPdf || (await buildPdfForReceipt(receipt));
    const waText = buildAppointmentWhatsAppText({
      studioName,
      bookingId: receipt.id,
      date: receipt.date,
      time: receipt.time,
      clientName: receipt.clientName,
      clientWhatsapp: receipt.clientWhatsapp,
      style: receipt.style,
      bodyZone: receipt.bodyZone,
      size: receipt.size,
      estimateText: receipt.estimateText || estimateText,
      notes: receipt.notes,
      couponCode: user ? cleanCoupon || user.coupon : undefined,
    });

    if (navigator.canShare && navigator.canShare({ files: [pdf.file] })) {
      try {
        await navigator.share({
          title: `Pedido de Agendamento · ${studioName}`,
          text: waText,
          files: [pdf.file],
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    pdf.download();
    if (waAutoAnchorRef.current) {
      waAutoAnchorRef.current.href = receipt.whatsappUrl;
      waAutoAnchorRef.current.click();
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      onToast('Selecione uma data e um horário disponível antes de continuar.');
      return;
    }
    if (!acceptedTerms) {
      onToast(
        'Confirme ciência do contrato, anamnese e regra de NÃO DEVOLUÇÃO do sinal de 50%.'
      );
      return;
    }
    if (!signed) {
      onToast('Assine digitalmente no campo de assinatura antes de confirmar e gerar o PDF.');
      return;
    }

    setSubmitting(true);
    try {
      const { bookingId, slotId, sizeLabel } = await bookAppointmentSlot({
        date: selectedDate,
        time: selectedTime,
        tierId: selectedTierId,
        clientName,
        clientWhatsapp,
        style: selectedStyle,
        bodyZone: selectedZone,
        notes,
      });

      const cleanName = clientName.trim();
      const cleanWaDigits = clientWhatsapp.replace(/\D/g, '');
      const cleanNotes = notes.trim();
      const appliedCoupon = user ? cleanCoupon || user.coupon : undefined;

      const waUrl = buildAppointmentWhatsAppUrl({
        studioWhatsapp,
        studioName,
        bookingId,
        date: selectedDate,
        time: selectedTime,
        clientName: cleanName,
        clientWhatsapp: cleanWaDigits,
        style: selectedStyle,
        bodyZone: selectedZone,
        size: sizeLabel,
        estimateText,
        notes: cleanNotes,
        couponCode: appliedCoupon,
      });

      const clientWaUrl = buildClientCopyWhatsAppUrl({
        clientWhatsapp: cleanWaDigits,
        studioName,
        bookingId,
        date: selectedDate,
        time: selectedTime,
        clientName: cleanName,
        style: selectedStyle,
        bodyZone: selectedZone,
        size: sizeLabel,
        estimateText,
        notes: cleanNotes,
        couponCode: appliedCoupon,
      });

      let pushMeta: LocalBookingReceipt['pushReminder'] | undefined;
      let pushNotice = '';
      if (enablePushReminder && pushSupported) {
        try {
          pushMeta = await schedule24hPushReminder({
            bookingId,
            date: selectedDate,
            time: selectedTime,
            clientName: cleanName,
            studioName,
            style: selectedStyle,
            bodyZone: selectedZone,
            size: sizeLabel,
            whatsappUrl: waUrl,
          });
          setPushPermission(getWebPushPermission());
          pushNotice =
            pushMeta.triggerMode === 'immediate_upcoming'
              ? ' Lembrete push automático ativado!'
              : ` Lembrete push agendado para ${formatReminderDateTimeBR(pushMeta.triggerAtIso)} (24h antes).`;
        } catch (pushErr) {
          setPushPermission(getWebPushPermission());
          pushNotice =
            pushErr instanceof Error
              ? ` (${pushErr.message})`
              : ' (Lembrete push não ativado neste aparelho.)';
        }
      }

      const receipt: LocalBookingReceipt = {
        id: bookingId,
        slotId,
        date: selectedDate,
        time: selectedTime,
        tierId: selectedTierId,
        clientName: cleanName,
        clientWhatsapp: cleanWaDigits,
        style: selectedStyle,
        bodyZone: selectedZone,
        size: sizeLabel,
        estimateText,
        notes: cleanNotes,
        whatsappUrl: waUrl,
        clientWhatsappUrl: clientWaUrl,
        createdAt: new Date().toISOString(),
        pushReminder: pushMeta,
      };

      const pdf = await buildPdfForReceipt(receipt);
      // Automatic download right on phone or computer
      pdf.download();
      setLastPdf(pdf);

      const updatedBookings = [receipt, ...myBookings].slice(0, 10);
      setMyBookings(updatedBookings);
      writeSignedStorage(LOCAL_BOOKINGS_KEY, updatedBookings);
      setLastReceipt(receipt);
      setSelectedTime('');
      onChangeNotes('');
      onToast(
        `PDF assinado baixado! Envie para o WhatsApp da SCHULLZ e do cliente.${pushNotice}`
      );

      // Forward automatically to Schullz WhatsApp right after saving & downloading PDF
      if (waAutoAnchorRef.current) {
        waAutoAnchorRef.current.href = waUrl;
        window.setTimeout(() => {
          waAutoAnchorRef.current?.click();
        }, 320);
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Não foi possível concluir o agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateReceiptPushState = (
    bookingId: string,
    pushReminder: LocalBookingReceipt['pushReminder']
  ) => {
    setMyBookings((prev) => {
      const next = prev.map((item) =>
        item.id === bookingId ? { ...item, pushReminder } : item
      );
      writeSignedStorage(LOCAL_BOOKINGS_KEY, next);
      return next;
    });
    setLastReceipt((prev) =>
      prev && prev.id === bookingId ? { ...prev, pushReminder } : prev
    );
  };

  const handleToggleReminderOptIn = async (checked: boolean) => {
    setEnablePushReminder(checked);
    if (!checked || !pushSupported) return;
    try {
      await ensurePushSubscription();
      setPushPermission(getWebPushPermission());
      onToast('Notificações Web Push ativadas! O lembrete de 24h será programado ao confirmar.');
    } catch (err) {
      setPushPermission(getWebPushPermission());
      onToast(err instanceof Error ? err.message : 'Permissão de notificação necessária no navegador.');
    }
  };

  const handleTestWebPush = async () => {
    if (!pushSupported) {
      onToast('Este navegador não suporta notificações Web Push.');
      return;
    }
    setPushTesting(true);
    try {
      const waDirect = `https://wa.me/${studioWhatsapp.replace(/\D/g, '')}`;
      await sendTestWebPush(studioName, waDirect);
      setPushPermission(getWebPushPermission());
      onToast('Notificação push de teste enviada! Verifique os avisos do aparelho.');
    } catch (err) {
      setPushPermission(getWebPushPermission());
      onToast(err instanceof Error ? err.message : 'Não foi possível enviar a notificação de teste.');
    } finally {
      setPushTesting(false);
    }
  };

  const handleActivateReminderForReceipt = async (receipt: LocalBookingReceipt) => {
    setPushBusyBookingId(receipt.id);
    try {
      const meta = await schedule24hPushReminder({
        bookingId: receipt.id,
        date: receipt.date,
        time: receipt.time,
        clientName: receipt.clientName,
        studioName,
        style: receipt.style,
        bodyZone: receipt.bodyZone,
        size: receipt.size,
        whatsappUrl: receipt.whatsappUrl,
      });
      setPushPermission(getWebPushPermission());
      updateReceiptPushState(receipt.id, meta);
      onToast(`Lembrete push programado para ${formatReminderDateTimeBR(meta.triggerAtIso)}!`);
    } catch (err) {
      setPushPermission(getWebPushPermission());
      onToast(err instanceof Error ? err.message : 'Erro ao programar lembrete push.');
    } finally {
      setPushBusyBookingId(null);
    }
  };

  const handleCancelReminderForReceipt = async (receipt: LocalBookingReceipt) => {
    if (!receipt.pushReminder) return;
    setPushBusyBookingId(receipt.id);
    try {
      await cancelScheduledPushReminder(
        receipt.pushReminder.reminderId,
        receipt.pushReminder.cancelToken
      );
      updateReceiptPushState(receipt.id, {
        ...receipt.pushReminder,
        status: 'cancelled',
      });
      onToast('Lembrete push de 24h cancelado.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Não foi possível cancelar o lembrete push.');
    } finally {
      setPushBusyBookingId(null);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <div
          className="tab-stagger-kicker text-sm font-bold tracking-widest uppercase"
          style={{ color: 'var(--accent-gold)' }}
        >
          Agenda Online em Tempo Real · WhatsApp
        </div>
        <h2 className="tab-stagger-title">Agendamento de Sessão</h2>
        <p className="tab-stagger-lead text-base" style={{ color: 'var(--text-muted)' }}>
          Selecione o porte da tatuagem, a data e o horário disponível na agenda do estúdio {studioName}. Horários livres, ocupados e cancelamentos atualizam automaticamente.
        </p>
      </div>

      {/* Important Policy & Operating Hours Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div
          className="lg:col-span-3 si-card border-2 space-y-2"
          style={{ borderColor: 'var(--r)', background: 'var(--card-alt)' }}
        >
          <div className="flex items-center gap-2 font-bold text-base uppercase tracking-wider" style={{ color: 'var(--r)' }}>
            <AlertTriangle size={19} />
            Regra de Confirmação · Sinal de 50% (NÃO FAZEMOS DEVOLUÇÃO)
          </div>
          <p className="text-base m-0 font-semibold leading-relaxed" style={{ color: 'var(--text)' }}>
            A confirmação do agendamento só pode ser feita após o envio do pagamento de{' '}
            <strong style={{ color: 'var(--accent-gold)' }}>50% do valor total da tattoo</strong>, como valor de sinal, separação de materiais, preparação e alteração de arte e acompanhamento via WhatsApp.{' '}
            <strong style={{ color: 'var(--r)' }}>NÃO FAZEMOS DEVOLUÇÃO do referente valor</strong> por ele cobrir os gastos de agendamento.
          </p>
        </div>

        <div
          className="lg:col-span-2 si-card space-y-2"
          style={{ borderColor: 'var(--border-strong)', background: 'var(--card-alt)' }}
        >
          <div className="flex items-center gap-2 font-bold text-base uppercase tracking-wider" style={{ color: 'var(--accent-gold)' }}>
            <Clock size={18} />
            Horários de Atendimento
          </div>
          <ul className="text-sm space-y-1.5 m-0 p-0 list-none">
            <li>
              <strong>Terça a Sexta:</strong> 14:00 às 21:00
            </li>
            <li>
              <strong>Sábado e Domingo:</strong> 11:30 às 23:00
            </li>
            <li style={{ color: 'var(--text-muted)' }}>
              <strong>Segunda-feira:</strong> Fechado
            </li>
          </ul>
        </div>
      </div>

      <a
        ref={waAutoAnchorRef}
        href={lastReceipt?.whatsappUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden"
        aria-hidden="true"
      >
        WhatsApp
      </a>

      {/* Confirmation Banner after reservation */}
      {lastReceipt && (
        <div
          className="si-card border-2 space-y-4"
          style={{ borderColor: 'var(--pain-low)', background: 'var(--card-alt)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-lg" style={{ color: 'var(--pain-low-text)' }}>
              <CheckCircle2 size={22} />
              PDF Assinado Baixado — Envie para WhatsApp (Cliente e SCHULLZ)
            </div>
            <span className="font-mono text-xs px-2 py-1 rounded border" style={{ borderColor: 'var(--border-subtle)' }}>
              {lastReceipt.id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm">
            <div>
              <strong>Data:</strong> {formatIsoDateBR(lastReceipt.date)}
            </div>
            <div>
              <strong>Horário:</strong> {lastReceipt.time}
            </div>
            <div>
              <strong>Porte:</strong> {lastReceipt.size}
            </div>
            <div>
              <strong>Valor:</strong> {lastReceipt.estimateText || estimateText}
            </div>
          </div>

          <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>
            O arquivo <strong>{lastPdf?.filename || `Pedido-Agendamento-${lastReceipt.id}.pdf`}</strong> (com tattoo, valor, local, anamnese, contrato, ciência dos 50% não reembolsável e assinatura) foi baixado automaticamente. Envie para a <strong>SCHULLZ</strong> (para receber a chave PIX) e para o <strong>WhatsApp do cliente</strong>:
          </p>

          {lastReceipt.pushReminder?.status === 'scheduled' ? (
            <div
              className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded border text-xs"
              style={{ borderColor: 'var(--accent-gold)', background: 'var(--card)' }}
            >
              <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--accent-gold)' }}>
                <BellRing size={15} />
                Lembrete Web Push agendado para {formatReminderDateTimeBR(lastReceipt.pushReminder.triggerAtIso)} (24h antes)
              </span>
              <button
                type="button"
                disabled={pushBusyBookingId === lastReceipt.id}
                onClick={() => void handleCancelReminderForReceipt(lastReceipt)}
                className="si-btn si-btn-outline si-btn-sm"
              >
                <BellOff size={13} />
                Cancelar lembrete
              </button>
            </div>
          ) : pushSupported && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pushBusyBookingId === lastReceipt.id}
                onClick={() => void handleActivateReminderForReceipt(lastReceipt)}
                className="si-btn si-btn-outline si-btn-sm"
              >
                <BellRing size={14} />
                {pushBusyBookingId === lastReceipt.id
                  ? 'Programando lembrete...'
                  : 'Ativar Lembrete Push 24h Antes'}
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => void handleSharePdfAndPixWhatsApp(lastReceipt, lastPdf)}
              className="si-btn"
            >
              <Share2 size={18} />
              Anexar PDF Direto (Celular / WhatsApp)
            </button>

            <a
              href={lastReceipt.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="si-btn si-btn-outline si-btn-sm"
            >
              <MessageCircle size={16} />
              Enviar para WhatsApp da SCHULLZ
            </a>

            {lastReceipt.clientWhatsappUrl && (
              <a
                href={lastReceipt.clientWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="si-btn si-btn-outline si-btn-sm"
              >
                <MessageCircle size={16} />
                Enviar para WhatsApp do Cliente
              </a>
            )}

            <button
              type="button"
              className="si-btn si-btn-outline si-btn-sm"
              onClick={async () => {
                const pdf = lastPdf || (await buildPdfForReceipt(lastReceipt));
                setLastPdf(pdf);
                pdf.download();
                onToast('PDF do pedido baixado novamente!');
              }}
            >
              <FileDown size={16} />
              Baixar PDF Novamente
            </button>

            <button
              type="button"
              className="si-btn si-btn-outline si-btn-sm"
              onClick={() => setLastReceipt(null)}
            >
              Fechar aviso
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Work Size / Capacity Tier */}
      <div className="si-card space-y-3">
        <h3 className="flex items-center gap-2" style={{ color: 'var(--accent-gold)' }}>
          <Layers size={20} />
          1. Escolha o porte da tatuagem
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BOOKING_TIERS.map((tier) => {
            const active = selectedTierId === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedTierId(tier.id);
                  onChangeSizeIdx(TIER_TO_SIZE_IDX[tier.id]);
                }}
                className="text-left p-3.5 rounded border cursor-pointer transition-colors space-y-1.5"
                style={{
                  background: active ? 'var(--card-alt)' : 'transparent',
                  borderColor: active ? 'var(--r)' : 'var(--border-strong)',
                  borderWidth: active ? '2px' : '1px',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-base" style={{ color: active ? 'var(--r)' : 'var(--text)' }}>
                    {tier.shortTitle}
                  </strong>
                </div>
                <div
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--accent-gold)' }}
                >
                  {tier.maxPerDay === 1
                    ? '1 vaga por dia'
                    : `Até ${tier.maxPerDay} horários/dia`}
                </div>
                <p className="text-xs m-0 leading-snug" style={{ color: 'var(--text-muted)' }}>
                  {tier.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Select Date */}
      <div className="si-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2" style={{ color: 'var(--accent-gold)' }}>
            <Calendar size={20} />
            2. Escolha o dia
          </h3>
          {isAdmin && !activeDayAvail.isClosed && (
            <button
              type="button"
              disabled={adminBusySlot === 'day'}
              onClick={handleAdminBlockDay}
              className="si-btn si-btn-outline si-btn-sm"
            >
              <ShieldCheck size={14} />
              {adminBusySlot === 'day' ? 'Bloqueando...' : 'Admin: Bloquear dia inteiro'}
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 tabs-bar" role="listbox" aria-label="Datas disponíveis">
          {days.map((d) => {
            const isSelected = selectedDate === d.iso;
            const avail = getDayAvailabilityForTier(d.iso, slotsById, selectedTierId);
            const isClosed = avail.isClosed;
            return (
              <button
                key={d.iso}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setSelectedDate(d.iso);
                  setSelectedTime('');
                }}
                className="flex flex-col items-center justify-center min-w-[86px] px-3 py-2.5 rounded border cursor-pointer shrink-0 transition-colors"
                style={{
                  background: isSelected ? 'var(--r)' : isClosed ? 'var(--card-alt)' : 'transparent',
                  color: isSelected ? 'var(--btn-text)' : isClosed ? 'var(--text-muted)' : 'var(--text)',
                  borderColor: isSelected ? 'var(--r)' : 'var(--border-strong)',
                  opacity: isClosed && !isSelected ? 0.6 : 1,
                }}
              >
                <span className="text-xs font-bold uppercase tracking-wider opacity-85">
                  {d.isToday ? 'Hoje' : d.weekdayShort}
                </span>
                <span className="f text-2xl leading-none my-0.5">{d.dayNumber}</span>
                <span className="text-[11px] uppercase font-semibold">{d.monthShort}</span>
                <span
                  className="mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded whitespace-nowrap"
                  style={{
                    background: isSelected ? 'rgba(0,0,0,0.2)' : 'var(--card-alt)',
                    color: isSelected
                      ? 'var(--btn-text)'
                      : isClosed
                        ? 'var(--text-muted)'
                        : avail.remainingForTier > 0
                          ? 'var(--pain-low-text)'
                          : 'var(--pain-ext-text)',
                  }}
                >
                  {isClosed
                    ? 'Fechado'
                    : avail.remainingForTier > 0
                      ? avail.remainingForTier === 1
                        ? '1 vaga'
                        : `${avail.remainingForTier} vagas`
                      : 'Lotado'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Select Time Slot */}
      <div className="si-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2" style={{ color: 'var(--accent-gold)' }}>
              <Clock size={20} />
              3. Horários em {formatIsoDateBR(selectedDate)} ({activeDayAvail.hoursLabel})
            </h3>
            {!activeDayAvail.isClosed && (
              <p className="text-xs m-0 mt-1" style={{ color: 'var(--text-muted)' }}>
                Porte selecionado: <strong>{selectedTier.shortTitle}</strong> ·{' '}
                {activeDayAvail.remainingForTier > 0
                  ? `${activeDayAvail.remainingForTier} vaga(s) restante(s) para este porte hoje.`
                  : 'Limite diário preenchido neste dia para este porte.'}
              </p>
            )}
          </div>
          {isAdmin && !activeDayAvail.isClosed && (
            <span className="text-xs font-semibold" style={{ color: 'var(--accent-gold)' }}>
              Modo Admin: clique para bloquear ou liberar horário
            </span>
          )}
        </div>

        {activeDayAvail.isClosed ? (
          <div className="p-4 rounded border text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-alt)' }}>
            <p className="m-0 font-semibold" style={{ color: 'var(--text-muted)' }}>
              Estúdio fechado às segundas-feiras. Atendimento de Terça a Sexta (14:00 às 21:00) e Sábado e Domingo (11:30 às 23:00).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeDayAvail.slots.map((time) => {
              const slotId = buildSlotId(selectedDate, time);
              const existing = slotsById[slotId];
              const past = isPastTimeSlot(selectedDate, time);
              const dayCapReached = activeDayAvail.remainingForTier <= 0;
              const unavailable = Boolean(existing || past || dayCapReached);
              const isSelected = selectedTime === time;
              const isBusy = adminBusySlot === slotId;

              return (
                <div key={time} className="space-y-1.5">
                  <button
                    type="button"
                    disabled={unavailable && !isAdmin}
                    onClick={() => {
                      if (isAdmin && existing) {
                        void handleAdminToggleSlot(time);
                        return;
                      }
                      if (!unavailable) {
                        setSelectedTime(time);
                      }
                    }}
                    className="w-full flex flex-col items-center justify-center p-3.5 rounded border font-bold transition-colors"
                    style={{
                      background: isSelected
                        ? 'var(--r)'
                        : existing || dayCapReached
                          ? 'var(--card-alt)'
                          : 'transparent',
                      color: isSelected
                        ? 'var(--btn-text)'
                        : unavailable
                          ? 'var(--text-muted)'
                          : 'var(--text)',
                      borderColor: isSelected
                        ? 'var(--r)'
                        : existing
                          ? 'var(--border-subtle)'
                          : 'var(--border-strong)',
                      cursor: unavailable && !isAdmin ? 'not-allowed' : 'pointer',
                      opacity: past ? 0.5 : 1,
                    }}
                  >
                    <span className="text-2xl tabular-nums">{time}</span>
                    <span
                      className="inline-flex items-center gap-1 text-xs uppercase mt-0.5"
                      style={{
                        color: isSelected
                          ? 'var(--btn-text)'
                          : existing?.status === 'booked'
                            ? 'var(--pain-ext-text)'
                            : existing?.status === 'blocked' || dayCapReached
                              ? 'var(--text-muted)'
                              : past
                                ? 'var(--text-muted)'
                                : 'var(--pain-low-text)',
                      }}
                    >
                      {existing ? (
                        <>
                          <Lock size={12} />
                          {existing.status === 'booked' ? 'Reservado' : 'Bloqueado'}
                        </>
                      ) : past ? (
                        'Encerrado'
                      ) : dayCapReached ? (
                        <>
                          <Lock size={12} />
                          Limite do dia atingido
                        </>
                      ) : isSelected ? (
                        'Selecionado'
                      ) : (
                        'Disponível'
                      )}
                    </span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleAdminToggleSlot(time)}
                      className="w-full py-1 px-2 rounded border text-[11px] font-bold uppercase cursor-pointer inline-flex items-center justify-center gap-1"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        color: existing ? 'var(--pain-low-text)' : 'var(--accent-gold)',
                        background: 'var(--card-alt)',
                      }}
                    >
                      {existing ? <Unlock size={11} /> : <Lock size={11} />}
                      {isBusy ? '...' : existing ? 'Liberar' : 'Bloquear'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 4: Client Form + Anamnese + Contract + Signature + 50% Deposit + PDF + WhatsApp */}
      <form onSubmit={handleConfirmBooking} className="si-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 style={{ color: 'var(--accent-gold)' }}>4. Documentação, Assinatura e Sinal (50%)</h3>
          {selectedTime ? (
            <span className="text-sm font-bold px-3 py-1 rounded" style={{ background: 'var(--r)', color: 'var(--btn-text)' }}>
              {formatIsoDateBR(selectedDate)} · {selectedTime}
            </span>
          ) : (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Selecione um horário livre acima
            </span>
          )}
        </div>

        {/* Live Value & 50% Deposit Summary */}
        <div
          className="p-3.5 rounded border flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: 'var(--border-strong)', background: 'var(--card-alt)' }}
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-gold)' }}>
              Estimativa de Valor &amp; Sinal (50%)
            </div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              Faixa de tamanho: {getTierDisplayLabel(activePriceTier, safeSizeIdx)}
              {hasDiscount ? ' (Cupom 20% aplicado!)' : ''}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--r)' }}>
              {estimateText}
            </div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Sinal 50% (não reembolsável): {depositHalfText}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            <span className="block mb-1">Nome completo *</span>
            <input
              type="text"
              required
              maxLength={60}
              className="si-input"
              placeholder="Seu nome"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold">
            <span className="block mb-1">WhatsApp com DDD *</span>
            <input
              type="tel"
              required
              inputMode="tel"
              maxLength={20}
              className="si-input"
              placeholder="(47) 99999-9999"
              value={clientWhatsapp}
              onChange={(e) => setClientWhatsapp(e.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold">
            <span className="block mb-1">Estilo</span>
            <select
              className="si-input"
              value={selectedStyle}
              onChange={(e) => onChangeStyle(e.target.value)}
            >
              {QUOTE_STYLES.map((st) => (
                <option key={st} value={st}>
                  {tQuoteStyle(st)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            <span className="block mb-1">Parte do corpo</span>
            <select
              className="si-input"
              value={selectedZone}
              onChange={(e) => onChangeZone(e.target.value)}
            >
              {BODY_PAIN_ZONES.map((z) => (
                <option key={z.name} value={z.name}>
                  {tZoneName(z.name)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            <span className="block mb-1">Tamanho / Faixa de Valor</span>
            <select
              className="si-input"
              value={safeSizeIdx}
              onChange={(e) => onChangeSizeIdx(Number(e.target.value))}
            >
              {tiers.map((tier, idx) => (
                <option key={`${tier.label}-${idx}`} value={idx}>
                  {getTierDisplayLabel(tier, idx)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            <span className="block mb-1">
              {user ? 'Cupom de desconto (20% OFF)' : 'Cupom (libera após cadastro na aba Indicação)'}
            </span>
            <input
              type="text"
              disabled={!user}
              className="si-input"
              placeholder={user ? 'Digite seu cupom SCHULLZ20...' : 'Cadastre-se para usar cupons'}
              value={user ? couponInput : ''}
              onChange={(e) => onChangeCouponInput(e.target.value.toUpperCase())}
            />
          </label>
        </div>

        <label className="block text-sm font-semibold">
          <span className="block mb-1">Ideia ou observações (opcional)</span>
          <input
            type="text"
            maxLength={240}
            className="si-input"
            placeholder="Ex: Referência preta e cinza, cobertura..."
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
          />
        </label>

        {/* Ficha de Anamnese Integrada */}
        <div
          className="p-3.5 rounded border space-y-2"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-alt)' }}
        >
          <div className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--accent-gold)' }}>
            Ficha de Anamnese Obrigatória (inclusa no PDF)
          </div>
          <div className="space-y-1.5">
            {domain.anamneseQuestions.map((questionText, i) => (
              <label key={i} className="flex items-start gap-2.5 cursor-pointer py-0.5 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 accent-[var(--r)] shrink-0"
                  checked={Boolean(anamnese[i])}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onChangeAnamnese((prev) => prev.map((val, idx) => (idx === i ? checked : val)));
                  }}
                />
                <span>{questionText}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Automatic 24h Web Push API Reminder Opt-in */}
        <div
          className="p-3.5 rounded border space-y-2.5"
          style={{
            borderColor:
              enablePushReminder && pushSupported && pushPermission === 'granted'
                ? 'var(--accent-gold)'
                : 'var(--border-subtle)',
            background: 'var(--card-alt)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-[220px]">
              <input
                type="checkbox"
                disabled={!pushSupported}
                checked={enablePushReminder && pushSupported}
                onChange={(e) => void handleToggleReminderOptIn(e.target.checked)}
                className="mt-1 w-5 h-5 accent-[var(--r)] shrink-0 cursor-pointer"
              />
              <span className="text-sm leading-snug">
                <strong className="inline-flex items-center gap-1.5" style={{ color: 'var(--accent-gold)' }}>
                  <Bell size={15} />
                  Lembrete automático 24h antes (Web Push API)
                </strong>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {!pushSupported
                    ? 'Seu navegador atual não suporta notificações Web Push.'
                    : pushPermission === 'denied'
                      ? 'Permissão bloqueada nas configurações do navegador. Libere notificações neste site para receber o alerta 24h antes.'
                      : 'Receba uma notificação automática no celular/navegador exatamente 24 horas antes da sessão marcada via WhatsApp.'}
                </span>
              </span>
            </label>

            {pushSupported && (
              <button
                type="button"
                disabled={pushTesting}
                onClick={() => void handleTestWebPush()}
                className="si-btn si-btn-outline si-btn-sm shrink-0"
              >
                <BellRing size={14} />
                {pushTesting ? 'Enviando...' : 'Testar Push'}
              </button>
            )}
          </div>
        </div>

        {/* Mandatory awareness checkbox for contract + 50% non-refundable deposit */}
        <label
          className="flex items-start gap-3 p-3.5 rounded border-2 cursor-pointer"
          style={{
            borderColor: acceptedTerms ? 'var(--pain-low)' : 'var(--r)',
            background: 'var(--card-alt)',
          }}
        >
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => onChangeAcceptedTerms(e.target.checked)}
            className="mt-1 w-5 h-5 accent-[var(--r)] shrink-0 cursor-pointer"
          />
          <span className="text-sm leading-snug">
            Li e aceito o contrato de serviço, a ficha de anamnese e tenho plena ciência de que a confirmação do agendamento exige o pagamento de{' '}
            <strong>50% do valor total da tattoo como sinal</strong>, e que{' '}
            <strong style={{ color: 'var(--r)' }}>NÃO FAZEMOS DEVOLUÇÃO do referente valor</strong> por ele cobrir os gastos de agendamento, reserva de horário, separação de materiais e preparação da arte.
          </span>
        </label>

        {/* Digital Signature */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="font-semibold text-sm">
              Assinatura Digital do Cliente (obrigatória para gerar o PDF) *
            </label>
            <button type="button" className="si-btn si-btn-outline si-btn-sm" onClick={clearSignature}>
              Limpar assinatura
            </button>
          </div>
          <canvas
            ref={sigCanvasRef}
            className="sig-canvas"
            onPointerDown={handleSigDown}
            onPointerMove={handleSigMove}
            onPointerUp={handleSigCommit}
            onPointerLeave={handleSigCommit}
          />
          {signed && (
            <div className="text-xs font-semibold" style={{ color: 'var(--pain-low-text)' }}>
              Assinatura registrada — será incluída automaticamente no arquivo PDF.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting || !selectedTime || !acceptedTerms || !signed}
            className="si-btn"
          >
            <MessageCircle size={18} />
            {submitting
              ? 'Reservando e gerando PDF...'
              : !selectedTime
                ? 'Escolha um horário acima para reservar'
                : !acceptedTerms || !signed
                  ? 'Aceite os termos e assine acima para confirmar'
                  : 'Assinar, Baixar PDF e Enviar WhatsApp'}
          </button>

          <a
            href={`https://wa.me/${studioWhatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="si-btn si-btn-outline si-btn-sm"
          >
            Tirar dúvida no WhatsApp
          </a>
        </div>
      </form>

      {/* Client's Local Booking History */}
      {myBookings.length > 0 && (
        <div className="si-card space-y-3">
          <h3 style={{ color: 'var(--accent-gold)' }}>Seus horários agendados neste aparelho</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myBookings.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded border space-y-2"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--card-alt)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-base" style={{ color: 'var(--r)' }}>
                    {formatIsoDateBR(b.date)} · {b.time}
                  </strong>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {b.id}
                  </span>
                </div>
                <div className="text-sm">
                  {tQuoteStyle(b.style)} · {tZoneName(b.bodyZone)} ({b.size})
                  {b.estimateText ? ` · ${b.estimateText}` : ''}
                </div>
                {b.pushReminder?.status === 'scheduled' && (
                  <div className="text-xs font-semibold inline-flex items-center gap-1.5" style={{ color: 'var(--accent-gold)' }}>
                    <BellRing size={13} />
                    Lembrete 24h: {formatReminderDateTimeBR(b.pushReminder.triggerAtIso)}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="si-btn si-btn-outline si-btn-sm"
                    onClick={() => void handleSharePdfAndPixWhatsApp(b)}
                  >
                    <Share2 size={14} />
                    Enviar PDF (SCHULLZ)
                  </button>
                  {b.clientWhatsappUrl && (
                    <a
                      href={b.clientWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="si-btn si-btn-outline si-btn-sm"
                    >
                      <MessageCircle size={14} />
                      Enviar p/ Cliente
                    </a>
                  )}
                  <button
                    type="button"
                    className="si-btn si-btn-outline si-btn-sm"
                    onClick={async () => {
                      const pdf = await buildPdfForReceipt(b);
                      pdf.download();
                      onToast(`PDF ${pdf.filename} baixado!`);
                    }}
                  >
                    <FileDown size={14} />
                    Baixar PDF
                  </button>
                  {pushSupported && (
                    b.pushReminder?.status === 'scheduled' ? (
                      <button
                        type="button"
                        disabled={pushBusyBookingId === b.id}
                        className="si-btn si-btn-outline si-btn-sm"
                        onClick={() => void handleCancelReminderForReceipt(b)}
                      >
                        <BellOff size={13} />
                        Cancelar lembrete
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pushBusyBookingId === b.id}
                        className="si-btn si-btn-outline si-btn-sm"
                        onClick={() => void handleActivateReminderForReceipt(b)}
                      >
                        <BellRing size={13} />
                        Lembrar 24h antes
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
