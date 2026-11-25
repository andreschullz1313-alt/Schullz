import { jsPDF } from 'jspdf';
import { STUDIO_LOGO_URI } from '../assets/studioMedia';
import { ANAMNESE_QUESTIONS, STUDIO_DEFAULTS } from '../data/studioData';
import { formatIsoDateBR } from './scheduleService';

export interface AnamnesePdfItem {
  question: string;
  answer: boolean;
}

export interface AppointmentPdfPayload {
  bookingId: string;
  date: string;
  time: string;
  clientName: string;
  clientWhatsapp: string;
  clientEmail?: string;
  style: string;
  bodyZone: string;
  size: string;
  estimateText?: string;
  notes?: string;
  couponCode?: string;
  anamneseItems?: AnamnesePdfItem[];
  acceptedTerms?: boolean;
  signatureDataUrl?: string;
  isQuoteOnly?: boolean;
  studioName: string;
  studioWhatsapp: string;
  studioInstagram?: string;
  logoUrl?: string;
}

export interface GeneratedAppointmentPdf {
  blob: Blob;
  file: File;
  filename: string;
  download: () => void;
}

async function loadLogoAsPngDataUrl(src: string): Promise<string | null> {
  if (typeof document === 'undefined' || !src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function createAppointmentOrderPdf(
  payload: AppointmentPdfPayload
): Promise<GeneratedAppointmentPdf> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const safeBottom = pageHeight - 16;

  let y = 0;

  const drawFooterOnCurrentPage = () => {
    doc.setTextColor(115, 115, 115);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      `${payload.studioName} · Sinal de 50% (NÃO FAZEMOS DEVOLUÇÃO) · WhatsApp: +${payload.studioWhatsapp.replace(/\D/g, '')}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > safeBottom) {
      drawFooterOnCurrentPage();
      doc.addPage();
      y = 16;
    }
  };

  // Header band
  doc.setFillColor(16, 16, 16);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFillColor(242, 41, 41);
  doc.rect(0, 40, pageWidth, 2, 'F');

  const logoPng = await loadLogoAsPngDataUrl(payload.logoUrl || STUDIO_LOGO_URI);
  if (logoPng) {
    try {
      doc.addImage(logoPng, 'PNG', margin, 6, 28, 28);
    } catch {
      // Ignore logo render failure and keep text header crisp
    }
  }

  const textStartX = logoPng ? margin + 34 : margin;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text((payload.studioName || STUDIO_DEFAULTS.studioName).toUpperCase(), textStartX, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(220, 220, 220);
  doc.text(`${STUDIO_DEFAULTS.address}`, textStartX, 21.5);
  doc.text(
    `WhatsApp: ${payload.studioWhatsapp}  |  Instagram: @${(payload.studioInstagram || STUDIO_DEFAULTS.instagram).replace(/^@/, '')}`,
    textStartX,
    27.5
  );
  doc.setTextColor(255, 210, 122);
  doc.setFont('helvetica', 'bold');
  doc.text(`Código: ${payload.bookingId}`, textStartX, 34);

  // Document Title
  y = 51;
  doc.setTextColor(180, 24, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text(
    payload.isQuoteOnly
      ? 'ORÇAMENTO, CONTRATO E FICHA DE ANAMNESE — TATUAGEM'
      : 'PEDIDO DE AGENDAMENTO, CONTRATO E ANAMNESE — TATUAGEM',
    margin,
    y
  );

  y += 5.5;
  doc.setTextColor(95, 95, 95);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.text(
    `Emitido em ${new Date().toLocaleString('pt-BR')}  |  Status: ${
      payload.isQuoteOnly
        ? 'Documentação Assinada (Pronto para agendar data)'
        : 'Pré-Agendado (Aguardando Sinal PIX 50%)'
    }`,
    margin,
    y
  );

  // Section 1: Informações da Tattoo & Valor
  y += 7;
  const notesText = payload.notes?.trim() || 'Sem observações adicionais.';
  const wrappedNotes = doc.splitTextToSize(notesText, contentWidth - 46).slice(0, 3);
  const dateDisplay =
    payload.date && payload.date !== 'A definir'
      ? `${formatIsoDateBR(payload.date)} às ${payload.time || 'A definir'}`
      : 'Orçamento (data/horário a definir na agenda)';

  const section1Height = 52 + wrappedNotes.length * 4.5;
  ensureSpace(section1Height + 4);

  doc.setFillColor(246, 246, 246);
  doc.roundedRect(margin, y, contentWidth, section1Height, 2, 2, 'F');
  doc.setDrawColor(215, 215, 215);
  doc.roundedRect(margin, y, contentWidth, section1Height, 2, 2, 'S');

  doc.setTextColor(180, 24, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. INFORMAÇÕES DA TATTOO, LOCAL E VALOR', margin + 5, y + 7.5);

  const tattooRows: [string, string][] = [
    ['Data / Horário:', dateDisplay],
    ['Estilo:', payload.style],
    ['Local do Corpo:', payload.bodyZone],
    ['Porte / Tamanho:', payload.size],
    ['Valor Estimado:', payload.estimateText?.trim() || 'Sob avaliação do artista'],
  ];

  doc.setFontSize(9.5);
  let rowY = y + 15;
  for (const [label, value] of tattooRows) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(label, margin + 5, rowY);
    doc.setFont('helvetica', label === 'Valor Estimado:' ? 'bold' : 'normal');
    doc.setTextColor(label === 'Valor Estimado:' ? 180 : 20, label === 'Valor Estimado:' ? 24 : 20, label === 'Valor Estimado:' ? 24 : 20);
    doc.text(String(value || '—').slice(0, 72), margin + 45, rowY);
    rowY += 6.8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('Ideia / Obs:', margin + 5, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  doc.text(wrappedNotes, margin + 45, rowY);

  y += section1Height + 6;

  // Section 2: Dados do Cliente
  const clientRows: [string, string][] = [
    ['Nome Completo:', payload.clientName],
    ['WhatsApp:', payload.clientWhatsapp],
    ['E-mail:', payload.clientEmail?.trim() || 'Não informado'],
    ['Cupom Aplicado:', payload.couponCode || 'Nenhum informado'],
  ];
  const section2Height = 14 + clientRows.length * 6.8;
  ensureSpace(section2Height + 4);

  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y, contentWidth, section2Height, 2, 2, 'F');
  doc.setDrawColor(215, 215, 215);
  doc.roundedRect(margin, y, contentWidth, section2Height, 2, 2, 'S');

  doc.setTextColor(180, 24, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('2. DADOS DO CLIENTE', margin + 5, y + 7.5);

  doc.setFontSize(9.5);
  let clientY = y + 14.5;
  for (const [label, value] of clientRows) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(label, margin + 5, clientY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(String(value || '—').slice(0, 74), margin + 45, clientY);
    clientY += 6.8;
  }

  y += section2Height + 6;

  // Section 3: Ficha de Anamnese Completa
  const anamneseList: AnamnesePdfItem[] =
    payload.anamneseItems && payload.anamneseItems.length > 0
      ? payload.anamneseItems
      : ANAMNESE_QUESTIONS.map((question) => ({ question, answer: false }));

  const hasMedicalAttention = anamneseList.slice(0, 5).some((item) => item.answer);
  const anamneseItemLines = anamneseList.map((item) => {
    const tag = item.answer ? '[SIM]' : '[NÃO]';
    return doc.splitTextToSize(`${tag} ${item.question}`, contentWidth - 12);
  });
  const totalAnamneseLines = anamneseItemLines.reduce((sum, lines) => sum + lines.length, 0);
  const section3Height = 18 + totalAnamneseLines * 4.5 + (hasMedicalAttention ? 9 : 4);
  ensureSpace(section3Height + 4);

  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y, contentWidth, section3Height, 2, 2, 'F');
  doc.setDrawColor(215, 215, 215);
  doc.roundedRect(margin, y, contentWidth, section3Height, 2, 2, 'S');

  doc.setTextColor(180, 24, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('3. FICHA DE ANAMNESE DO CLIENTE', margin + 5, y + 7.5);

  let anamY = y + 14;
  doc.setFontSize(9);
  anamneseList.forEach((item, idx) => {
    const lines = anamneseItemLines[idx];
    doc.setFont('helvetica', item.answer ? 'bold' : 'normal');
    if (item.answer) {
      doc.setTextColor(180, 24, 24);
    } else {
      doc.setTextColor(35, 35, 35);
    }
    doc.text(lines, margin + 5, anamY);
    anamY += lines.length * 4.5;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  if (hasMedicalAttention) {
    doc.setTextColor(180, 24, 24);
    doc.text('Atenção: cliente sinalizou condição acima — avaliar antes da sessão.', margin + 5, anamY + 3);
  } else {
    doc.setTextColor(34, 120, 62);
    doc.text('Triagem de anamnese sem contraindicações declaradas pelo cliente.', margin + 5, anamY + 2);
  }

  y += section3Height + 6;

  // Section 4: Regra do Sinal de 50% (NÃO FAZEMOS DEVOLUÇÃO) + Contrato
  const pixParagraph1 =
    '• SINAL DE 50% — NÃO FAZEMOS DEVOLUÇÃO: A confirmação definitiva do agendamento só ocorre após o envio do pagamento de 50% do valor total da tattoo como sinal. NÃO FAZEMOS DEVOLUÇÃO do referente valor do sinal, pois ele cobre integralmente os gastos operacionais de agendamento, reserva exclusiva de horário, separação de materiais descartáveis, preparação/alteração da arte e acompanhamento via WhatsApp.';
  const pixParagraph2 =
    '• CHAVE PIX VIA WHATSAPP: A chave PIX é enviada diretamente pelo estúdio no WhatsApp oficial após recebimento deste documento.';
  const contractClauses = [
    '• CONTRATO DE PRESTAÇÃO DE SERVIÇOS: O cliente declara ter 18 anos completos ou mais, ser o autor verdadeiro das informações médicas da ficha de anamnese acima e estar ciente dos cuidados pré e pós-tatuagem orientados pelo estúdio.',
    '• REMARCAÇÃO: Em caso de imprevisto, avisar com no mínimo 48 horas de antecedência para eventual análise de remarcação dentro da agenda disponível, mantendo a regra de não devolução do sinal de 50%.',
  ];

  const p1Lines = doc.splitTextToSize(pixParagraph1, contentWidth - 10);
  const p2Lines = doc.splitTextToSize(pixParagraph2, contentWidth - 10);
  const c1Lines = doc.splitTextToSize(contractClauses[0], contentWidth - 10);
  const c2Lines = doc.splitTextToSize(contractClauses[1], contentWidth - 10);

  const section4Height =
    18 +
    (p1Lines.length + p2Lines.length + c1Lines.length + c2Lines.length) * 4.4 +
    12;
  ensureSpace(section4Height + 4);

  doc.setFillColor(255, 246, 246);
  doc.setDrawColor(242, 41, 41);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, section4Height, 2, 2, 'FD');

  doc.setTextColor(180, 24, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('4. CONTRATO E CIÊNCIA DO SINAL DE 50% (NÃO FAZEMOS DEVOLUÇÃO)', margin + 5, y + 8);

  let contractY = y + 14.5;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(8.9);

  doc.setFont('helvetica', 'bold');
  doc.text(p1Lines, margin + 5, contractY);
  contractY += p1Lines.length * 4.4 + 2.5;

  doc.setFont('helvetica', 'normal');
  doc.text(p2Lines, margin + 5, contractY);
  contractY += p2Lines.length * 4.4 + 2.5;

  doc.text(c1Lines, margin + 5, contractY);
  contractY += c1Lines.length * 4.4 + 2;

  doc.text(c2Lines, margin + 5, contractY);

  y += section4Height + 6;

  // Section 5: Assinatura Digital do Cliente
  const sigBoxHeight = 46;
  ensureSpace(sigBoxHeight + 6);

  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, sigBoxHeight, 2, 2, 'FD');

  doc.setTextColor(180, 24, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('5. ASSINATURA DIGITAL E ACEITE DO CLIENTE', margin + 5, y + 7.5);

  doc.setTextColor(35, 35, 35);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const termsLabel =
    payload.acceptedTerms || payload.signatureDataUrl
      ? 'Termos do contrato, anamnese e regra de NÃO DEVOLUÇÃO do sinal de 50%: ACEITOS E ASSINADOS.'
      : 'Aceite dos termos: Pendente.';
  doc.text(termsLabel, margin + 5, y + 13.5);

  if (payload.signatureDataUrl && payload.signatureDataUrl.startsWith('data:image/')) {
    try {
      doc.setFillColor(20, 20, 20);
      doc.roundedRect(margin + 5, y + 16, 78, 22, 1.5, 1.5, 'F');
      doc.addImage(payload.signatureDataUrl, 'PNG', margin + 7, y + 17, 74, 20);
    } catch {
      // Fallback line if canvas image cannot be decoded
      doc.line(margin + 5, y + 32, margin + 85, y + 32);
    }
  } else {
    doc.line(margin + 5, y + 32, margin + 85, y + 32);
  }

  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Assinante: ${payload.clientName}`, margin + 88, y + 25);
  doc.text(`WhatsApp: ${payload.clientWhatsapp}`, margin + 88, y + 30.5);
  doc.text(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`, margin + 88, y + 36);

  drawFooterOnCurrentPage();

  const safeCode = payload.bookingId.replace(/[^a-zA-Z0-9_-]/g, '');
  const prefix = payload.isQuoteOnly ? 'Orcamento-Contrato' : 'Pedido-Agendamento';
  const filename = `${prefix}-${safeCode}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  return {
    blob,
    file,
    filename,
    download: () => triggerBlobDownload(blob, filename),
  };
}
