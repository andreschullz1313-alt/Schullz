import { WORK_IMAGE_URIS } from '../assets/studioMedia';

export const APP_VERSION = '2026.11.20-2';
export const TUTORIAL_VERSION_KEY = 'schullz_tutorial_seen_version';

export type TabId =
  | 'login'
  | 'inicio'
  | 'portfolio'
  | 'mapa'
  | 'precos'
  | 'orcamento'
  | 'agendamento'
  | 'central'
  | 'indicacao';

export type FolderId = 'contato' | 'faq' | 'preparacao' | 'pos-tattoo';

export type NavigateTarget = TabId | FolderId | 'loja';

export interface TabItem {
  id: TabId;
  label: string;
  requiresAuth?: boolean;
}

export const TABS: TabItem[] = [
  { id: 'inicio', label: 'Início' },
  { id: 'portfolio', label: 'Trabalhos' },
  { id: 'mapa', label: 'Mapa da dor 3D' },
  { id: 'precos', label: 'Preços', requiresAuth: true },
  { id: 'orcamento', label: 'Orçamento', requiresAuth: true },
  { id: 'agendamento', label: 'Agendar' },
  { id: 'central', label: 'Central de Guias' },
  { id: 'indicacao', label: 'Indicação & Cadastro' },
];

export interface PortfolioWork {
  src: string;
  title: string;
  category: string;
}

export const PORTFOLIO_WORKS: PortfolioWork[] = [
  { src: WORK_IMAGE_URIS.work1, title: 'Máscara da morte nas costas', category: 'Realismo' },
  { src: WORK_IMAGE_URIS.work2, title: 'Fechamento com anjo e cruz', category: 'Realismo' },
  { src: WORK_IMAGE_URIS.work3, title: 'Máscara hannya com flores', category: 'Oriental' },
  { src: WORK_IMAGE_URIS.work4, title: 'Rosas e Medusa no antebraço', category: 'Realismo' },
  { src: WORK_IMAGE_URIS.work5, title: 'Guerreira viking no braço', category: 'Realismo' },
  { src: WORK_IMAGE_URIS.work6, title: 'Fechamento com leão, águia e espartano', category: 'Realismo' },
  { src: WORK_IMAGE_URIS.work7, title: 'Frases espelhadas no antebraço', category: 'Lettering' },
  { src: WORK_IMAGE_URIS.work8, title: 'Zodíaco em fine line', category: 'Minimalista' },
  { src: WORK_IMAGE_URIS.work9, title: 'Data 25.01.2026 com rosa', category: 'Lettering' },
  { src: WORK_IMAGE_URIS.work10, title: 'Onda com Odoyá', category: 'Minimalista' },
  { src: WORK_IMAGE_URIS.work11, title: 'Frase na costela', category: 'Lettering' },
];

export const CATEGORIES = [
  'Todos',
  'Lettering',
  'Realismo',
  'Minimalista',
  'Blackwork',
  'Oriental',
  'Sketch',
  'Gótico',
] as const;

export const QUOTE_STYLES = [
  'Realismo',
  'Oriental',
  'Lettering',
  'Minimalista',
  'Blackwork',
  'Gótico',
  'Sketch',
  'Outro',
] as const;

export interface SizeTier {
  label: string;
  min: number;
  max: number;
  startingFrom?: boolean;
}

export const SIZE_TIERS: SizeTier[] = [
  { label: 'Mini 5–8 cm', min: 150, max: 200 },
  { label: 'Mini 8–12 cm', min: 250, max: 350 },
  { label: 'Peça 12–18 cm', min: 350, max: 500 },
  { label: 'Média (braço, coxa)', min: 600, max: 900 },
  { label: 'Grande, por sessão', min: 1200, max: 1500 },
  { label: 'Fechamento de membro', min: 2500, max: 2500, startingFrom: true },
];

export interface PriceGroup {
  group: string;
  items: {
    title: string;
    description: string;
    min: number;
    max: number;
  }[];
}

export const PRICE_GROUPS: PriceGroup[] = [
  {
    group: 'Por tempo',
    items: [
      {
        title: '15 a 20 min',
        description: 'Sessão curta para peças pequenas, já cobrindo custo fixo e materiais.',
        min: 150,
        max: 200,
      },
      {
        title: '30 a 60 min',
        description: 'Peças de tamanho pequeno a médio, com tempo para acabamento.',
        min: 250,
        max: 400,
      },
      {
        title: '2 a 4 hrs',
        description: 'Projetos médios com sombreado, cor ou mais de um elemento.',
        min: 600,
        max: 900,
      },
      {
        title: '6 a 8 hrs (diária completa)',
        description: 'Cobre praticamente todo o custo fixo do estúdio em uma única sessão.',
        min: 1200,
        max: 1500,
      },
    ],
  },
  {
    group: 'Mini tattoos',
    items: [
      {
        title: '5 a 8 cm',
        description: 'Traço simples, escrita curta ou símbolo.',
        min: 150,
        max: 200,
      },
      {
        title: '8 a 12 cm',
        description: 'Com mais detalhe, sombreado ou dois elementos.',
        min: 250,
        max: 350,
      },
      {
        title: '12 a 18 cm',
        description: 'Peça de transição entre mini e média.',
        min: 350,
        max: 500,
      },
    ],
  },
  {
    group: 'Médias e grandes',
    items: [
      {
        title: 'Médias — unilateral',
        description: 'Antebraço, braço, coxa ou panturrilha.',
        min: 600,
        max: 900,
      },
      {
        title: 'Grandes — braços, costas e pernas',
        description: 'Parte externa ou interna, em uma ou mais sessões.',
        min: 1200,
        max: 1500,
      },
    ],
  },
];

export interface StoreProduct {
  name: string;
  description: string;
  price: number;
  stock: number;
}

export const STORE_PRODUCTS: StoreProduct[] = [
  {
    name: 'Pomada cicatrizante',
    description: 'Pomada pós-tatuagem indicada pelo estúdio. Camada fina 2x ao dia a partir do 3º dia. Pote de 30 g.',
    price: 45,
    stock: 24,
  },
  {
    name: 'Óleo de girassol',
    description: 'Óleo de girassol 100 ml para hidratação da pele após a queda completa da casquinha. Fragrância neutra.',
    price: 60,
    stock: 18,
  },
  {
    name: 'Curativo / filme protetor',
    description: 'Filme protetor transparente para os primeiros dias. Rolo com 10 metros, corta no tamanho da tattoo.',
    price: 35,
    stock: 30,
  },
];

export const ANAMNESE_QUESTIONS = [
  'Tenho alergia (tinta, látex, anestésico)',
  'Tenho histórico de queloide ou cicatrização ruim',
  'Uso medicamentos contínuos / anticoagulantes',
  'Tenho diabetes',
  'Estou grávida ou amamentando',
  'Esta é minha primeira tattoo (informativo)',
];

export type SensitivityTier = 'low' | 'moderate' | 'high' | 'extreme';

export interface BodyPainZone {
  name: string;
  score: number; // 0 to 100
  tier: SensitivityTier;
  side: 'frente' | 'costas' | 'lateral';
  detail: string;
}

export const BODY_PAIN_ZONES: BodyPainZone[] = [
  {
    name: 'Braço externo',
    score: 25,
    tier: 'low',
    side: 'lateral',
    detail: 'Zona verde: em geral, uma das áreas mais toleráveis para tatuar.',
  },
  {
    name: 'Ombro / deltoide',
    score: 25,
    tier: 'low',
    side: 'lateral',
    detail: 'Zona verde: pouca dor, boa área muscular e confortável para iniciantes.',
  },
  {
    name: 'Cabeça',
    score: 30,
    tier: 'low',
    side: 'frente',
    detail: 'Zona verde no mapa do estúdio: região superior com menor sensibilidade média (varia conforme proximidade óssea).',
  },
  {
    name: 'Peito',
    score: 30,
    tier: 'low',
    side: 'frente',
    detail: 'Zona verde na área muscular dos peitorais; a sensibilidade aumenta ao se aproximar do esterno e clavículas.',
  },
  {
    name: 'Antebraço externo',
    score: 30,
    tier: 'low',
    side: 'frente',
    detail: 'Zona verde: região muscular bastante tolerável e popular para primeira tattoo.',
  },
  {
    name: 'Costas (parte alta)',
    score: 30,
    tier: 'low',
    side: 'costas',
    detail: 'Zona verde sobre escápulas e dorsal lateral; apenas a linha central da coluna é mais sensível.',
  },
  {
    name: 'Coxa externa',
    score: 30,
    tier: 'low',
    side: 'frente',
    detail: 'Zona verde: área ampla, muscular e relativamente tolerável para peças grandes.',
  },
  {
    name: 'Panturrilha externa',
    score: 30,
    tier: 'low',
    side: 'costas',
    detail: 'Zona verde na massa muscular posterior da panturrilha.',
  },
  {
    name: 'Braço interno',
    score: 55,
    tier: 'moderate',
    side: 'frente',
    detail: 'Zona amarela: sensibilidade intermediária; a pele interna e dobra do braço tendem a ser mais delicadas.',
  },
  {
    name: 'Abdômen',
    score: 55,
    tier: 'moderate',
    side: 'frente',
    detail: 'Zona amarela: sensibilidade média, variando com respiração e tensão muscular.',
  },
  {
    name: 'Coxa interna',
    score: 55,
    tier: 'moderate',
    side: 'frente',
    detail: 'Zona amarela: parte frontal/interna da coxa e canela têm sensibilidade média.',
  },
  {
    name: 'Lombar',
    score: 60,
    tier: 'moderate',
    side: 'costas',
    detail: 'Zona amarela na faixa lombar e flancos, aumentando próximo à coluna vertebral.',
  },
  {
    name: 'Pescoço (lateral)',
    score: 85,
    tier: 'high',
    side: 'lateral',
    detail: 'Zona vermelha: pele fina e sensível na região frontal do pescoço e clavículas.',
  },
  {
    name: 'Mãos e dedos',
    score: 85,
    tier: 'high',
    side: 'frente',
    detail: 'Zona vermelha: região óssea, com pouca cobertura e muitas terminações nervosas.',
  },
  {
    name: 'Cotovelo',
    score: 85,
    tier: 'high',
    side: 'costas',
    detail: 'Zona vermelha: pele fina diretamente sobre a articulação torna a região bastante sensível.',
  },
  {
    name: 'Pescoço posterior',
    score: 90,
    tier: 'extreme',
    side: 'costas',
    detail: 'Zona vermelha: nuca e linha central da coluna vertebral têm sensibilidade alta.',
  },
  {
    name: 'Esterno',
    score: 90,
    tier: 'extreme',
    side: 'frente',
    detail: 'Zona vermelha: centro do peito sobre o osso do esterno, área de dor alta.',
  },
  {
    name: 'Costelas',
    score: 90,
    tier: 'extreme',
    side: 'lateral',
    detail: 'Zona vermelha: região lateral sobre as costelas com pouca camada muscular.',
  },
  {
    name: 'Joelho',
    score: 90,
    tier: 'extreme',
    side: 'frente',
    detail: 'Zona vermelha: patela e dobra posterior do joelho são áreas de alta sensibilidade.',
  },
  {
    name: 'Pés e tornozelos',
    score: 90,
    tier: 'extreme',
    side: 'frente',
    detail: 'Zona vermelha: pouca cobertura sobre ossos e tendões; região bastante sensível.',
  },
  {
    name: 'Axila',
    score: 95,
    tier: 'extreme',
    side: 'frente',
    detail: 'Zona vermelha: pele extremamente fina e grande concentração nervosa.',
  },
  {
    name: 'Virilha / zona genital',
    score: 95,
    tier: 'extreme',
    side: 'frente',
    detail: 'Zona vermelha: linha da virilha extremamente sensível; exige avaliação cuidadosa.',
  },
];

export const TIER_META: Record<
  SensitivityTier,
  { label: string; badgeText: string; hex: string; cssColor: string; cssText: string }
> = {
  low: {
    label: 'Zona Verde (Dor Baixa)',
    badgeText: 'Zona Verde · Dor Baixa',
    hex: '#2fbf4f',
    cssColor: 'var(--pain-low)',
    cssText: 'var(--pain-low-text)',
  },
  moderate: {
    label: 'Zona Amarela (Dor Média)',
    badgeText: 'Zona Amarela · Dor Média',
    hex: '#e0c020',
    cssColor: 'var(--pain-mod)',
    cssText: 'var(--pain-mod-text)',
  },
  high: {
    label: 'Zona Vermelha (Dor Alta)',
    badgeText: 'Zona Vermelha · Dor Alta',
    hex: '#e34b36',
    cssColor: 'var(--pain-high)',
    cssText: 'var(--pain-high-text)',
  },
  extreme: {
    label: 'Zona Vermelha (Dor Alta)',
    badgeText: 'Zona Vermelha · Dor Alta',
    hex: '#F22929',
    cssColor: 'var(--pain-ext)',
    cssText: 'var(--pain-ext-text)',
  },
};

export const STUDIO_DEFAULTS = {
  studioName: 'Schullz Ink Tattoo',
  whatsapp: '5547992872744',
  instagram: 'andreschullz.ofc13',
  address: 'Rua Leocádio Ferreira Barbosa, São Domingos 185 · Navegantes - SC, CEP 88370-220',
  adminEmail: 'andreschullz1313@gmail.com',
};

export function formatBRL(val: number): string {
  return 'R$ ' + Math.round(val).toLocaleString('pt-BR');
}
