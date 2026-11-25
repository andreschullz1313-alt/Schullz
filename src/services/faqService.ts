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
import { inspectForThreats, readVerifiedStorage, writeSignedStorage } from './securityGuard';
import { isAuthorizedAdminUser } from './studioSync';

export type FaqCategoryKey = 'cuidados' | 'agendamento' | 'dor' | 'politicas';

export type FaqActionTab =
  | ''
  | 'orcamento'
  | 'agendamento'
  | 'mapa'
  | 'indicacao'
  | 'preparacao'
  | 'pos-tattoo';

export interface FaqItemRecord {
  id: string;
  category: FaqCategoryKey;
  question: string;
  answer: string;
  order: number;
  actionTab: FaqActionTab;
  actionLabel: string;
}

export const FAQ_CATEGORIES: { key: FaqCategoryKey; label: string }[] = [
  { key: 'agendamento', label: 'Agendamento' },
  { key: 'cuidados', label: 'Cuidados Pós-Tattoo' },
  { key: 'dor', label: 'Dor e Sensibilidade' },
  { key: 'politicas', label: 'Políticas & Sinal' },
];

export const FAQ_ACTION_TAB_OPTIONS: { value: FaqActionTab; label: string }[] = [
  { value: '', label: 'Sem botão de atalho' },
  { value: 'agendamento', label: 'Ir para Agendamento' },
  { value: 'orcamento', label: 'Ir para Orçamento' },
  { value: 'pos-tattoo', label: 'Ver Cuidados Pós-Tattoo' },
  { value: 'preparacao', label: 'Ver Guia de Preparação' },
  { value: 'mapa', label: 'Abrir Mapa da Dor 3D' },
  { value: 'indicacao', label: 'Ver Indicação & Cadastro' },
];

const FAQ_CACHE_KEY = 'schullz_faq_items_v1';
const VALID_CATEGORIES = new Set<FaqCategoryKey>(['cuidados', 'agendamento', 'dor', 'politicas']);
const VALID_ACTION_TABS = new Set<FaqActionTab>([
  '',
  'orcamento',
  'agendamento',
  'mapa',
  'indicacao',
  'preparacao',
  'pos-tattoo',
]);

export const DEFAULT_STUDIO_FAQS: FaqItemRecord[] = [
  {
    id: 'como-agendar',
    category: 'agendamento',
    question: 'Como funciona o agendamento online e a confirmação do horário?',
    answer:
      'Escolha o porte da tattoo e um horário livre na aba Agendar, preencha seus dados, assine a ficha de anamnese e gere o PDF automático. A confirmação da vaga é feita após o pagamento de 50% do valor total como sinal via PIX enviado pelo WhatsApp.',
    order: 0,
    actionTab: 'agendamento',
    actionLabel: 'Abrir Agenda Online',
  },
  {
    id: 'horarios-estudio',
    category: 'agendamento',
    question: 'Quais são os dias e horários de atendimento do estúdio?',
    answer:
      'Atendemos de Terça a Sexta das 14:00 às 21:00 e Sábado e Domingo das 11:30 às 23:00. Trabalhos pequenos (6–12 cm) têm até 3 vagas/dia, médios (28–29 cm) até 2 vagas/dia e fechamentos completos 1 vaga exclusiva por dia.',
    order: 1,
    actionTab: 'agendamento',
    actionLabel: 'Ver Horários Livres',
  },
  {
    id: 'cuidados-lavagem-pomada',
    category: 'cuidados',
    question: 'Como limpar a tattoo nos primeiros dias e quando usar pomada?',
    answer:
      'Lave delicadamente 2 a 3 vezes ao dia com água fria ou morna e sabonete neutro usando apenas as mãos limpas, secando sem esfregar com papel-toalha. A partir do 3º dia, aplique uma camada bem fina de pomada cicatrizante 2x ao dia para a pele continuar respirando.',
    order: 2,
    actionTab: 'pos-tattoo',
    actionLabel: 'Ver Guia Pós-Tattoo',
  },
  {
    id: 'cuidados-sol-mar-casquinha',
    category: 'cuidados',
    question: 'Posso pegar sol, entrar no mar ou piscina durante a cicatrização?',
    answer:
      'Não. Evite sol direto, praia, piscina, sauna e banhos muito quentes nos primeiros 15 a 30 dias até a pele cicatrizar por completo. Nunca coce ou arranque casquinhas para não falhar o traço, e use protetor solar após a cicatrização total.',
    order: 3,
    actionTab: 'pos-tattoo',
    actionLabel: 'Checklist de Cicatrização',
  },
  {
    id: 'preparo-sessao',
    category: 'cuidados',
    question: 'O que devo fazer antes de ir para a minha sessão?',
    answer:
      'Durma bem, faça uma refeição reforçada 1h a 2h antes (nunca venha em jejum) e beba bastante água nos dias anteriores. Evite bebidas alcoólicas e queimaduras de sol nas 24–48 horas prévias.',
    order: 4,
    actionTab: 'preparacao',
    actionLabel: 'Abrir Guia de Preparação',
  },
  {
    id: 'areas-menos-sensiveis',
    category: 'dor',
    question: 'Quais partes do corpo doem menos para quem vai fazer a primeira tattoo?',
    answer:
      'Regiões com maior camada muscular e menos osso superficial costumam ser mais tranquilas, como antebraço externo, ombro/deltoide, panturrilha externa e coxa externa. Confira a escala completa de 0 a 100 no Mapa Corporal 3D.',
    order: 5,
    actionTab: 'mapa',
    actionLabel: 'Abrir Mapa da Dor 3D',
  },
  {
    id: 'areas-muito-sensiveis',
    category: 'dor',
    question: 'Por que costelas, esterno, mãos, pés e joelhos doem mais?',
    answer:
      'Essas áreas têm pele mais fina, pouca camada muscular e proximidade direta com ossos e terminações nervosas. Fazemos pausas breves sempre que você precisar para respirar e se hidratar.',
    order: 6,
    actionTab: 'mapa',
    actionLabel: 'Comparar no Mapa 3D',
  },
  {
    id: 'politica-sinal',
    category: 'politicas',
    question: 'Qual é a política do sinal de 50% para agendamento?',
    answer:
      'O sinal de 50% cobre reserva exclusiva de horário, separação de materiais estéreis, preparação e alteração da arte e acompanhamento via WhatsApp. Conforme contrato do estúdio: NÃO FAZEMOS DEVOLUÇÃO do valor do sinal referente ao agendamento.',
    order: 7,
    actionTab: 'orcamento',
    actionLabel: 'Fazer Orçamento',
  },
  {
    id: 'biosseguranca-materiais',
    category: 'politicas',
    question: 'Os materiais utilizados no estúdio são 100% descartáveis?',
    answer:
      'Sim. 100% das agulhas, cartuchos, biqueiras, batoques e plásticos de proteção de barreira são descartáveis, esterilizados e abertos na frente do cliente no início da sessão.',
    order: 8,
    actionTab: '',
    actionLabel: '',
  },
];

function sanitizeId(raw: string): string {
  const clean = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return clean || `faq-${Date.now()}`;
}

function sanitizeFaqDoc(id: string, raw: Record<string, unknown>, fallbackIdx = 0): FaqItemRecord | null {
  const category = VALID_CATEGORIES.has(raw.category as FaqCategoryKey)
    ? (raw.category as FaqCategoryKey)
    : 'agendamento';
  const question = typeof raw.question === 'string' ? raw.question.replace(/[<>]/g, '').trim().slice(0, 180) : '';
  const answer = typeof raw.answer === 'string' ? raw.answer.replace(/[<>]/g, '').trim().slice(0, 1200) : '';
  if (question.length < 4 || answer.length < 4) return null;
  if (!inspectForThreats(question, 'FAQ question').safe || !inspectForThreats(answer, 'FAQ answer').safe) {
    return null;
  }

  const rawOrder = typeof raw.order === 'number' && Number.isFinite(raw.order) ? Math.floor(raw.order) : fallbackIdx;
  const order = Math.max(0, Math.min(500, rawOrder));
  const actionTab = VALID_ACTION_TABS.has(raw.actionTab as FaqActionTab)
    ? (raw.actionTab as FaqActionTab)
    : '';
  const actionLabel =
    typeof raw.actionLabel === 'string'
      ? raw.actionLabel.replace(/[<>]/g, '').trim().slice(0, 48)
      : '';

  return {
    id,
    category,
    question,
    answer,
    order,
    actionTab,
    actionLabel,
  };
}

function sortFaqs(items: FaqItemRecord[]): FaqItemRecord[] {
  return [...items].sort((a, b) => a.order - b.order || a.question.localeCompare(b.question));
}

export function getCachedFaqItems(): FaqItemRecord[] {
  return readVerifiedStorage<FaqItemRecord[]>(FAQ_CACHE_KEY, []);
}

export function subscribeToFaqItems(
  onUpdate: (items: FaqItemRecord[]) => void
): () => void {
  const faqQuery = query(
    collection(db, 'faq_items'),
    where('category', 'in', ['cuidados', 'agendamento', 'dor', 'politicas'])
  );

  return onSnapshot(
    faqQuery,
    (snapshot) => {
      const list: FaqItemRecord[] = [];
      let idx = 0;
      snapshot.forEach((docSnap) => {
        const parsed = sanitizeFaqDoc(docSnap.id, docSnap.data() as Record<string, unknown>, idx++);
        if (parsed) list.push(parsed);
      });
      const sorted = sortFaqs(list);
      writeSignedStorage(FAQ_CACHE_KEY, sorted);
      onUpdate(sorted);
    },
    (error) => {
      if (/permission|insufficient/i.test(error.message)) {
        handleFirestoreError(error, OperationType.LIST, 'faq_items');
      } else {
        notifyAppIssue({
          category: 'connection',
          title: 'Schullz Ink · FAQ Offline',
          message: 'Exibindo perguntas frequentes salvas localmente enquanto a conexão sincroniza.',
          silentSystem: true,
        });
      }
    }
  );
}

export async function fetchFaqItemsOnce(): Promise<FaqItemRecord[] | null> {
  const faqQuery = query(
    collection(db, 'faq_items'),
    where('category', 'in', ['cuidados', 'agendamento', 'dor', 'politicas'])
  );
  try {
    let snapshot;
    try {
      snapshot = await getDocsFromServer(faqQuery);
    } catch {
      snapshot = await getDocs(faqQuery);
    }
    const list: FaqItemRecord[] = [];
    let idx = 0;
    snapshot.forEach((docSnap) => {
      const parsed = sanitizeFaqDoc(docSnap.id, docSnap.data() as Record<string, unknown>, idx++);
      if (parsed) list.push(parsed);
    });
    const sorted = sortFaqs(list);
    writeSignedStorage(FAQ_CACHE_KEY, sorted);
    return sorted;
  } catch {
    return null;
  }
}

export async function saveFaqItem(
  input: Omit<FaqItemRecord, 'id'> & { id?: string }
): Promise<FaqItemRecord> {
  const user = auth.currentUser;
  if (!isAuthorizedAdminUser(user) || !user) {
    throw new Error('Somente a conta administradora pode editar o FAQ.');
  }

  const question = input.question.replace(/[<>]/g, '').trim().slice(0, 180);
  const answer = input.answer.replace(/[<>]/g, '').trim().slice(0, 1200);
  if (question.length < 4) {
    throw new Error('A pergunta deve ter pelo menos 4 caracteres.');
  }
  if (answer.length < 4) {
    throw new Error('A resposta deve ter pelo menos 4 caracteres.');
  }
  if (!inspectForThreats(question, 'Pergunta FAQ').safe || !inspectForThreats(answer, 'Resposta FAQ').safe) {
    throw new Error('Texto bloqueado pela verificação de segurança.');
  }

  const category = VALID_CATEGORIES.has(input.category) ? input.category : 'agendamento';
  const order = Math.max(0, Math.min(500, Math.floor(Number(input.order) || 0)));
  const actionTab = VALID_ACTION_TABS.has(input.actionTab) ? input.actionTab : '';
  const actionLabel = actionTab
    ? (input.actionLabel || '').replace(/[<>]/g, '').trim().slice(0, 48)
    : '';
  const docId = input.id ? sanitizeId(input.id) : sanitizeId(`faq-${Date.now().toString(36)}-${question.slice(0, 24)}`);

  const payload = {
    category,
    question,
    answer,
    order,
    actionTab,
    actionLabel,
    updatedByUid: user.uid,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'faq_items', docId), payload);
    return {
      id: docId,
      category,
      question,
      answer,
      order,
      actionTab,
      actionLabel,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `faq_items/${docId}`);
  }
}

export async function deleteFaqItem(faqId: string): Promise<void> {
  const user = auth.currentUser;
  if (!isAuthorizedAdminUser(user) || !user) {
    throw new Error('Somente a conta administradora pode excluir perguntas do FAQ.');
  }
  const cleanId = sanitizeId(faqId);
  try {
    await deleteDoc(doc(db, 'faq_items', cleanId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `faq_items/${cleanId}`);
  }
}

export async function swapFaqItemsOrder(a: FaqItemRecord, b: FaqItemRecord): Promise<void> {
  const user = auth.currentUser;
  if (!isAuthorizedAdminUser(user) || !user) {
    throw new Error('Somente a conta administradora pode reordenar o FAQ.');
  }
  const batch = writeBatch(db);
  batch.set(doc(db, 'faq_items', a.id), {
    category: a.category,
    question: a.question,
    answer: a.answer,
    order: b.order,
    actionTab: a.actionTab,
    actionLabel: a.actionLabel,
    updatedByUid: user.uid,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'faq_items', b.id), {
    category: b.category,
    question: b.question,
    answer: b.answer,
    order: a.order,
    actionTab: b.actionTab,
    actionLabel: b.actionLabel,
    updatedByUid: user.uid,
    updatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'faq_items/reorder');
  }
}

export async function seedDefaultFaqItems(): Promise<void> {
  const user = auth.currentUser;
  if (!isAuthorizedAdminUser(user) || !user) {
    throw new Error('Somente a conta administradora pode importar perguntas padrão.');
  }
  const batch = writeBatch(db);
  DEFAULT_STUDIO_FAQS.forEach((item, index) => {
    batch.set(doc(db, 'faq_items', item.id), {
      category: item.category,
      question: item.question,
      answer: item.answer,
      order: index,
      actionTab: item.actionTab,
      actionLabel: item.actionLabel,
      updatedByUid: user.uid,
      updatedAt: serverTimestamp(),
    });
  });
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'faq_items/seed');
  }
}
