import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { notifyAppIssue } from './appMonitor';
import { inspectForThreats } from './securityGuard';
import { isAuthorizedAdminUser } from './studioSync';
import type { PushReminderMeta } from './webPushService';

export const DAY_CAPACITY_UNITS = 6;

export type BookingTierId = 'pequeno' | 'medio' | 'grande';

export interface BookingTierOption {
  id: BookingTierId;
  shortTitle: string;
  sizeLabel: string; // <= 40 chars for Firestore validation
  serviceHint: string; // <= 40 chars for Firestore ScheduleSlot
  maxPerDay: number;
  weight: number; // out of DAY_CAPACITY_UNITS (6)
  description: string;
}

export const BOOKING_TIERS: BookingTierOption[] = [
  {
    id: 'pequeno',
    shortTitle: 'Pequeno / Minimalista (6 a 12 cm)',
    sizeLabel: 'Pequeno · Minimalista (6 a 12 cm)',
    serviceHint: 'Pequeno (6-12cm)',
    maxPerDay: 3,
    weight: 2,
    description: 'Trabalhos pequenos como minimalista (6 a 12 cm) — até 3 horários disponíveis no dia.',
  },
  {
    id: 'medio',
    shortTitle: 'Médio / Fechamento parcial simples (28 a 29 cm)',
    sizeLabel: 'Médio · Fechamento parcial (28-29 cm)',
    serviceHint: 'Medio (28-29cm)',
    maxPerDay: 2,
    weight: 3,
    description: 'Trabalhos médios ou fechamento parcial simples (28 a 29 cm) — até 2 horários no dia.',
  },
  {
    id: 'grande',
    shortTitle: 'Grande / Fechamento completo (Membro completo ou unilateral)',
    sizeLabel: 'Grande · Fechamento completo (1/dia)',
    serviceHint: 'Grande (Fechamento)',
    maxPerDay: 1,
    weight: 6,
    description: 'Trabalhos grandes e fechamentos completos (membro completo ou unilateral) — 1 vaga por dia.',
  },
];

export const TERCA_SEXTA_SLOTS = ['14:00', '16:15', '18:30'] as const;
export const SABADO_DOMINGO_SLOTS = ['11:30', '15:00', '19:00'] as const;

export interface ScheduleSlotRecord {
  slotId: string;
  date: string;
  time: string;
  status: 'booked' | 'blocked';
  serviceHint: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';

export interface AppointmentRecord {
  id: string;
  slotId: string;
  date: string;
  time: string;
  clientName: string;
  clientWhatsapp: string;
  style: string;
  bodyZone: string;
  size: string;
  notes: string;
  status: AppointmentStatus;
  createdAtMs: number;
}

export interface BookAppointmentInput {
  date: string;
  time: string;
  tierId: BookingTierId;
  clientName: string;
  clientWhatsapp: string;
  style: string;
  bodyZone: string;
  notes: string;
}

export interface LocalBookingReceipt {
  id: string;
  slotId: string;
  date: string;
  time: string;
  tierId: BookingTierId;
  clientName: string;
  clientWhatsapp: string;
  style: string;
  bodyZone: string;
  size: string;
  estimateText?: string;
  notes: string;
  whatsappUrl: string;
  clientWhatsappUrl?: string;
  createdAt: string;
  cancelledByAdmin?: boolean;
  pushReminder?: PushReminderMeta;
}

const DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const TIME_RE = /^[0-9]{2}:[0-9]{2}$/;

export function getBookingTier(tierId: BookingTierId): BookingTierOption {
  return BOOKING_TIERS.find((t) => t.id === tierId) || BOOKING_TIERS[0];
}

export function getSlotWeightFromHint(hint: string): number {
  const lower = hint.toLowerCase();
  if (lower.includes('grande') || lower.includes('fechamento completo')) return 6;
  if (lower.includes('medio') || lower.includes('médio') || lower.includes('parcial')) return 3;
  return 2;
}

export function getDayScheduleMeta(dateIso: string): {
  dayOfWeek: number;
  isClosed: boolean;
  hoursLabel: string;
  slots: readonly string[];
} {
  if (!DATE_RE.test(dateIso)) {
    return { dayOfWeek: 2, isClosed: false, hoursLabel: '14:00 às 21:00', slots: TERCA_SEXTA_SLOTS };
  }
  const dayOfWeek = new Date(`${dateIso}T12:00:00`).getDay();
  if (dayOfWeek === 1) {
    return {
      dayOfWeek,
      isClosed: true,
      hoursLabel: 'Fechado (Segunda)',
      slots: [],
    };
  }
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      dayOfWeek,
      isClosed: false,
      hoursLabel: '11:30 às 23:00',
      slots: SABADO_DOMINGO_SLOTS,
    };
  }
  return {
    dayOfWeek,
    isClosed: false,
    hoursLabel: '14:00 às 21:00',
    slots: TERCA_SEXTA_SLOTS,
  };
}

export function getDayAvailabilityForTier(
  dateIso: string,
  slotsById: Record<string, ScheduleSlotRecord>,
  tierId: BookingTierId
): {
  isClosed: boolean;
  hoursLabel: string;
  slots: readonly string[];
  usedUnits: number;
  remainingUnits: number;
  remainingForTier: number;
  openTimeSlotsCount: number;
} {
  const meta = getDayScheduleMeta(dateIso);
  if (meta.isClosed) {
    return {
      ...meta,
      usedUnits: DAY_CAPACITY_UNITS,
      remainingUnits: 0,
      remainingForTier: 0,
      openTimeSlotsCount: 0,
    };
  }

  let usedUnits = 0;
  for (const slot of Object.values(slotsById)) {
    if (slot.date !== dateIso) continue;
    if (slot.status === 'blocked') {
      usedUnits += 2;
    } else {
      usedUnits += getSlotWeightFromHint(slot.serviceHint);
    }
  }

  let openTimeSlotsCount = 0;
  for (const t of meta.slots) {
    const slotId = buildSlotId(dateIso, t);
    if (!slotsById[slotId] && !isPastTimeSlot(dateIso, t)) {
      openTimeSlotsCount++;
    }
  }

  const remainingUnits = Math.max(0, DAY_CAPACITY_UNITS - usedUnits);
  const tier = getBookingTier(tierId);
  const byWeight = Math.floor(remainingUnits / tier.weight);
  const remainingForTier = Math.min(byWeight, openTimeSlotsCount);

  return {
    ...meta,
    usedUnits,
    remainingUnits,
    remainingForTier,
    openTimeSlotsCount,
  };
}

export function buildSlotId(date: string, time: string): string {
  return `${date}_${time.replace(':', '')}`;
}

export function formatIsoDateBR(dateIso: string): string {
  if (!DATE_RE.test(dateIso)) return dateIso;
  const [y, m, d] = dateIso.split('-');
  return `${d}/${m}/${y}`;
}

export function getLocalIsoDate(dateObj: Date = new Date()): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface UpcomingDayOption {
  iso: string;
  dayNumber: string;
  monthShort: string;
  weekdayShort: string;
  isMondayClosed: boolean;
  isWeekend: boolean;
  isToday: boolean;
}

export function getUpcomingDates(daysCount = 21, locale = 'pt-BR'): UpcomingDayOption[] {
  const result: UpcomingDayOption[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = 0; i < daysCount; i++) {
    const cur = new Date(today);
    cur.setDate(today.getDate() + i);
    const iso = getLocalIsoDate(cur);
    const dow = cur.getDay();
    const isMondayClosed = dow === 1;
    const isWeekend = dow === 0 || dow === 6;
    const weekdayShort = cur
      .toLocaleDateString(locale, { weekday: 'short' })
      .replace('.', '')
      .slice(0, 4);
    const monthShort = cur
      .toLocaleDateString(locale, { month: 'short' })
      .replace('.', '')
      .slice(0, 4);
    result.push({
      iso,
      dayNumber: String(cur.getDate()).padStart(2, '0'),
      monthShort,
      weekdayShort,
      isMondayClosed,
      isWeekend,
      isToday: i === 0,
    });
  }
  return result;
}

export function isPastTimeSlot(dateIso: string, time: string): boolean {
  const todayIso = getLocalIsoDate();
  if (dateIso < todayIso) return true;
  if (dateIso > todayIso) return false;
  const [hh, mm] = time.split(':').map(Number);
  const now = new Date();
  const slotMinutes = hh * 60 + mm;
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + 20;
  return slotMinutes <= currentMinutes;
}

export function buildAppointmentWhatsAppText(params: {
  studioName: string;
  bookingId: string;
  date: string;
  time: string;
  clientName: string;
  clientWhatsapp: string;
  style: string;
  bodyZone: string;
  size: string;
  estimateText?: string;
  notes?: string;
  couponCode?: string;
  isQuoteOnly?: boolean;
}): string {
  const safeCode = params.bookingId.replace(/[^a-zA-Z0-9_-]/g, '');
  const pdfPrefix = params.isQuoteOnly ? 'Orcamento-Contrato' : 'Pedido-Agendamento';
  const lines = [
    params.isQuoteOnly
      ? `*Orcamento e Documentacao Assinada (PDF) — ${params.studioName}*`
      : `*Pedido de Agendamento Assinado (PDF) — ${params.studioName}*`,
    `Codigo: ${params.bookingId}`,
    params.date && params.date !== 'A definir'
      ? `Data: *${formatIsoDateBR(params.date)}*`
      : 'Data: A definir na agenda',
    params.time && params.time !== 'A definir'
      ? `Horario: *${params.time}*`
      : 'Horario: A definir na agenda',
    `Cliente: ${params.clientName}`,
    `WhatsApp do cliente: ${params.clientWhatsapp}`,
    `Estilo: ${params.style}`,
    `Local do corpo: ${params.bodyZone}`,
    `Porte / Tamanho: ${params.size}`,
  ];
  if (params.estimateText?.trim()) {
    lines.push(`Valor estimado: *${params.estimateText.trim()}*`);
  }
  if (params.couponCode) {
    lines.push(`Cupom: ${params.couponCode}`);
  }
  if (params.notes?.trim()) {
    lines.push(`Ideia / observacoes: ${params.notes.trim()}`);
  }
  lines.push(
    '',
    `Segue o documento completo em PDF (${pdfPrefix}-${safeCode}.pdf) com contrato, ficha de anamnese e assinatura digital.`,
    'Ciencia confirmada: o sinal de 50% do valor total da tattoo garante reserva de agenda, separacao de materiais, preparacao/alteracao da arte e acompanhamento via WhatsApp. NAO FAZEMOS DEVOLUCAO do referente valor do sinal.',
    'Por favor, me envie a *chave PIX* para eu realizar o pagamento do sinal de 50% e confirmar meu horario!'
  );

  return lines.join('\n');
}

export function buildAppointmentWhatsAppUrl(params: {
  studioWhatsapp: string;
  studioName: string;
  bookingId: string;
  date: string;
  time: string;
  clientName: string;
  clientWhatsapp: string;
  style: string;
  bodyZone: string;
  size: string;
  estimateText?: string;
  notes?: string;
  couponCode?: string;
  isQuoteOnly?: boolean;
}): string {
  const targetPhone = params.studioWhatsapp.replace(/\D/g, '');
  const text = buildAppointmentWhatsAppText(params);
  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

export function normalizeBrazilianWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function buildClientCopyWhatsAppUrl(params: {
  clientWhatsapp: string;
  studioName: string;
  bookingId: string;
  date: string;
  time: string;
  clientName: string;
  style: string;
  bodyZone: string;
  size: string;
  estimateText?: string;
  notes?: string;
  couponCode?: string;
  isQuoteOnly?: boolean;
}): string {
  const withCountry = normalizeBrazilianWhatsAppPhone(params.clientWhatsapp);
  if (!withCountry) return '';
  const safeCode = params.bookingId.replace(/[^a-zA-Z0-9_-]/g, '');
  const pdfPrefix = params.isQuoteOnly ? 'Orcamento-Contrato' : 'Pedido-Agendamento';
  const lines = [
    `*Comprovante ${params.studioName}* (${pdfPrefix}-${safeCode}.pdf)`,
    `Cliente: ${params.clientName}`,
    params.date && params.date !== 'A definir'
      ? `Data e horario: ${formatIsoDateBR(params.date)} as ${params.time}`
      : 'Agendamento: a definir na agenda',
    `Tattoo: ${params.style} · ${params.bodyZone} (${params.size})`,
  ];
  if (params.estimateText?.trim()) {
    lines.push(`Valor estimado: ${params.estimateText.trim()}`);
  }
  if (params.couponCode) {
    lines.push(`Cupom: ${params.couponCode}`);
  }
  if (params.notes?.trim()) {
    lines.push(`Observacoes: ${params.notes.trim()}`);
  }
  lines.push(
    'Documentacao: Ficha de Anamnese + Contrato + Assinatura Digital salvos no PDF baixado.',
    'Sinal de 50%: NAO FAZEMOS DEVOLUCAO do referente valor por cobrir custos de agendamento, materiais e preparacao da arte.'
  );
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildClientCallbackWhatsAppUrl(params: {
  clientWhatsapp: string;
  clientName: string;
  date: string;
  time: string;
  studioName: string;
}): string {
  const withCountry = normalizeBrazilianWhatsAppPhone(params.clientWhatsapp);
  const msg = `Ola ${params.clientName}! Aqui e do estudio ${params.studioName}. Estamos entrando em contato sobre seu agendamento do dia ${formatIsoDateBR(params.date)} as ${params.time}.`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(msg)}`;
}

export function subscribeToScheduleSlots(
  onUpdate: (slotsById: Record<string, ScheduleSlotRecord>) => void
): () => void {
  const q = query(
    collection(db, 'schedule_slots'),
    where('status', 'in', ['booked', 'blocked'])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, ScheduleSlotRecord> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const date = typeof data.date === 'string' ? data.date : '';
        const time = typeof data.time === 'string' ? data.time : '';
        const status = data.status === 'blocked' ? 'blocked' : 'booked';
        const serviceHint = typeof data.serviceHint === 'string' ? data.serviceHint : 'Reservado';
        if (DATE_RE.test(date) && TIME_RE.test(time)) {
          map[docSnap.id] = {
            slotId: docSnap.id,
            date,
            time,
            status,
            serviceHint,
          };
        }
      });
      onUpdate(map);
    },
    (error) => {
      if (/permission|insufficient/i.test(error.message)) {
        handleFirestoreError(error, OperationType.LIST, 'schedule_slots');
      } else {
        notifyAppIssue({
          category: 'connection',
          title: 'Schullz Ink · Agenda Offline',
          message: 'Nao foi possivel sincronizar os horarios da agenda agora.',
          silentSystem: true,
        });
      }
    }
  );
}

export async function fetchScheduleSlotsOnce(): Promise<Record<string, ScheduleSlotRecord> | null> {
  const q = query(
    collection(db, 'schedule_slots'),
    where('status', 'in', ['booked', 'blocked'])
  );
  try {
    let snapshot;
    try {
      snapshot = await getDocsFromServer(q);
    } catch {
      snapshot = await getDocs(q);
    }
    const map: Record<string, ScheduleSlotRecord> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const date = typeof data.date === 'string' ? data.date : '';
      const time = typeof data.time === 'string' ? data.time : '';
      const status = data.status === 'blocked' ? 'blocked' : 'booked';
      const serviceHint = typeof data.serviceHint === 'string' ? data.serviceHint : 'Reservado';
      if (DATE_RE.test(date) && TIME_RE.test(time)) {
        map[docSnap.id] = {
          slotId: docSnap.id,
          date,
          time,
          status,
          serviceHint,
        };
      }
    });
    return map;
  } catch {
    return null;
  }
}

export function subscribeToAdminAppointments(
  onUpdate: (appointments: AppointmentRecord[]) => void
): () => void {
  const user = auth.currentUser;
  if (!isAuthorizedAdminUser(user)) {
    onUpdate([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'appointments'),
    (snapshot) => {
      const items: AppointmentRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'cancelled') return;
        const createdAtMs =
          data.createdAt && typeof data.createdAt.toMillis === 'function'
            ? data.createdAt.toMillis()
            : 0;
        items.push({
          id: docSnap.id,
          slotId: String(data.slotId || ''),
          date: String(data.date || ''),
          time: String(data.time || ''),
          clientName: String(data.clientName || ''),
          clientWhatsapp: String(data.clientWhatsapp || ''),
          style: String(data.style || ''),
          bodyZone: String(data.bodyZone || ''),
          size: String(data.size || ''),
          notes: String(data.notes || ''),
          status: data.status === 'confirmed' ? 'confirmed' : 'pending',
          createdAtMs,
        });
      });

      items.sort((a, b) => {
        const dateCompare = `${a.date}_${a.time}`.localeCompare(`${b.date}_${b.time}`);
        if (dateCompare !== 0) return dateCompare;
        return b.createdAtMs - a.createdAtMs;
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'appointments');
    }
  );
}

export async function bookAppointmentSlot(
  input: BookAppointmentInput
): Promise<{ bookingId: string; slotId: string; sizeLabel: string }> {
  if (!DATE_RE.test(input.date) || !TIME_RE.test(input.time)) {
    throw new Error('Selecione uma data e um horario validos.');
  }

  const dayMeta = getDayScheduleMeta(input.date);
  if (dayMeta.isClosed) {
    throw new Error('O estudio nao atende as segundas-feiras. Escolha de terca a domingo.');
  }
  if (!dayMeta.slots.includes(input.time)) {
    throw new Error('Horario fora do expediente para o dia selecionado.');
  }
  if (isPastTimeSlot(input.date, input.time)) {
    throw new Error('Este horario ja passou. Selecione outro horario disponivel.');
  }

  const tier = getBookingTier(input.tierId);
  const cleanName = input.clientName.replace(/[<>]/g, '').trim().slice(0, 60);
  const cleanWa = input.clientWhatsapp.replace(/\D/g, '').slice(0, 15);
  const cleanStyle = input.style.replace(/[<>]/g, '').trim().slice(0, 40) || 'Tatuagem';
  const cleanZone = input.bodyZone.replace(/[<>]/g, '').trim().slice(0, 50) || 'A definir';
  const cleanNotes = input.notes.replace(/[<>]/g, '').trim().slice(0, 240);

  if (cleanName.length < 2) {
    throw new Error('Informe seu nome completo para reservar o horario.');
  }
  if (cleanWa.length < 10) {
    throw new Error('Informe um WhatsApp valido com DDD.');
  }

  if (
    !inspectForThreats(cleanName, 'Nome').safe ||
    !inspectForThreats(cleanNotes, 'Observacoes').safe ||
    !inspectForThreats(cleanStyle, 'Estilo').safe
  ) {
    throw new Error('Texto bloqueado pela verificacao de seguranca.');
  }

  // Fresh daily capacity check before atomic commit
  const slotId = buildSlotId(input.date, input.time);
  try {
    const snap = await getDocs(
      query(
        collection(db, 'schedule_slots'),
        where('status', 'in', ['booked', 'blocked'])
      )
    );
    const daySlots: Record<string, ScheduleSlotRecord> = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.date === input.date) {
        daySlots[docSnap.id] = {
          slotId: docSnap.id,
          date: String(data.date),
          time: String(data.time),
          status: data.status === 'blocked' ? 'blocked' : 'booked',
          serviceHint: String(data.serviceHint || ''),
        };
      }
    });

    if (daySlots[slotId]) {
      throw new Error('Esse horario acabou de ser preenchido. Selecione outro horario.');
    }

    const avail = getDayAvailabilityForTier(input.date, daySlots, tier.id);
    if (avail.remainingForTier <= 0) {
      throw new Error(
        `Limite diario atingido para ${tier.shortTitle} nesta data (${avail.hoursLabel}). Escolha outro dia.`
      );
    }
  } catch (err) {
    if (err instanceof Error && /Limite diario|acabou de ser preenchido/i.test(err.message)) {
      throw err;
    }
    // If offline or transient error, let Firestore batch attempt proceed/fail cleanly
  }

  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const bookingId = `apt_${Date.now()}_${rand}`;

  const batch = writeBatch(db);
  batch.set(doc(db, 'schedule_slots', slotId), {
    date: input.date,
    time: input.time,
    status: 'booked',
    serviceHint: tier.serviceHint,
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'appointments', bookingId), {
    slotId,
    date: input.date,
    time: input.time,
    clientName: cleanName,
    clientWhatsapp: cleanWa,
    style: cleanStyle,
    bodyZone: cleanZone,
    size: tier.sizeLabel,
    notes: cleanNotes,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return { bookingId, slotId, sizeLabel: tier.sizeLabel };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/permission|already-exists/i.test(msg)) {
      throw new Error(
        'Esse horario acabou de ser reservado por outro cliente. Escolha outro horario disponivel.'
      );
    }
    handleFirestoreError(err, OperationType.WRITE, `appointments/${bookingId}`);
  }
}

export async function toggleAdminSlotBlock(
  date: string,
  time: string,
  existingSlot?: ScheduleSlotRecord
): Promise<'blocked' | 'released'> {
  if (!isAuthorizedAdminUser(auth.currentUser)) {
    throw new Error('Somente o administrador autorizado pode alterar bloqueios da agenda.');
  }
  const slotId = buildSlotId(date, time);
  try {
    if (existingSlot) {
      await deleteDoc(doc(db, 'schedule_slots', slotId));
      return 'released';
    }
    await setDoc(doc(db, 'schedule_slots', slotId), {
      date,
      time,
      status: 'blocked',
      serviceHint: 'Bloqueado pelo estudio',
      createdAt: serverTimestamp(),
    });
    return 'blocked';
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `schedule_slots/${slotId}`);
  }
}

export async function blockAllOpenSlotsForDay(
  date: string,
  slotsById: Record<string, ScheduleSlotRecord>
): Promise<number> {
  if (!isAuthorizedAdminUser(auth.currentUser)) {
    throw new Error('Somente o administrador autorizado pode bloquear a agenda.');
  }
  const meta = getDayScheduleMeta(date);
  const batch = writeBatch(db);
  let count = 0;
  for (const time of meta.slots) {
    const slotId = buildSlotId(date, time);
    if (!slotsById[slotId]) {
      batch.set(doc(db, 'schedule_slots', slotId), {
        date,
        time,
        status: 'blocked',
        serviceHint: 'Dia fechado',
        createdAt: serverTimestamp(),
      });
      count++;
    }
  }
  if (count === 0) return 0;
  try {
    await batch.commit();
    return count;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `schedule_slots/${date}`);
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  slotId: string,
  nextStatus: 'confirmed' | 'cancelled'
): Promise<void> {
  if (!isAuthorizedAdminUser(auth.currentUser)) {
    throw new Error('Somente o administrador autorizado pode gerenciar agendamentos.');
  }

  const batch = writeBatch(db);
  if (nextStatus === 'cancelled') {
    batch.delete(doc(db, 'appointments', appointmentId));
    if (slotId) {
      batch.delete(doc(db, 'schedule_slots', slotId));
    }
  } else {
    batch.update(doc(db, 'appointments', appointmentId), {
      status: nextStatus,
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `appointments/${appointmentId}`);
  }
}
