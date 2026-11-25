import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { NavigateTarget } from '../data/studioData';
import { useLanguage } from '../i18n/LanguageContext';
import {
  DEFAULT_STUDIO_FAQS,
  FAQ_CATEGORIES,
  FaqCategoryKey,
  FaqItemRecord,
} from '../services/faqService';

type FaqFilterCategory = 'todas' | FaqCategoryKey;

interface FAQProps {
  onNavigateTab: (tab: NavigateTarget) => void;
  studioWhatsapp: string;
  remoteItems?: FaqItemRecord[];
  isAdmin?: boolean;
  onOpenFaqAdmin?: () => void;
}

const DEFAULT_META_BY_ID: Record<
  string,
  { category: FaqCategoryKey; actionTab?: NavigateTarget }
> = {
  'como-agendar': { category: 'agendamento', actionTab: 'orcamento' },
  'preparo-sessao': { category: 'cuidados', actionTab: 'preparacao' },
  'duracao-sessao': { category: 'agendamento' },
  'areas-menos-sensiveis': { category: 'dor', actionTab: 'mapa' },
  'areas-muito-sensiveis': { category: 'dor', actionTab: 'mapa' },
  'anestesico-pausas': { category: 'dor' },
  'politica-sinal': { category: 'politicas' },
  'idade-anamnese': { category: 'politicas' },
  'biosseguranca-materiais': { category: 'politicas' },
  'clube-indicacao': { category: 'politicas', actionTab: 'indicacao' },
};

export const FAQ: React.FC<FAQProps> = ({
  onNavigateTab,
  studioWhatsapp,
  remoteItems = [],
  isAdmin = false,
  onOpenFaqAdmin,
}) => {
  const { domain, lang } = useLanguage();
  const prefersReduced = useReducedMotion();
  const faq = domain.faq;

  const [category, setCategory] = useState<FaqFilterCategory>('todas');
  const [openId, setOpenId] = useState<string | null>(null);

  const items: FaqItemRecord[] = useMemo(() => {
    if (remoteItems.length > 0) {
      return remoteItems;
    }
    if (lang === 'pt-BR') {
      return DEFAULT_STUDIO_FAQS;
    }
    const localizedList: FaqItemRecord[] = Object.entries(faq.items).map(
      ([id, entry], index) => {
        const meta = DEFAULT_META_BY_ID[id] ?? { category: 'politicas' as FaqCategoryKey };
        return {
          id,
          category: meta.category,
          question: entry.question,
          answer: entry.answer,
          order: index,
          actionTab: (meta.actionTab as FaqItemRecord['actionTab']) || '',
          actionLabel: entry.actionLabel || '',
        };
      }
    );
    return localizedList;
  }, [faq.items, lang, remoteItems]);

  const effectiveOpenId = useMemo(() => {
    if (openId && items.some((i) => i.id === openId)) return openId;
    return items[0]?.id ?? null;
  }, [items, openId]);

  const visibleItems = useMemo(
    () =>
      category === 'todas'
        ? items
        : items.filter((item) => item.category === category),
    [category, items]
  );

  const categoryLabels: Record<FaqFilterCategory, string> = useMemo(() => {
    const map: Record<FaqFilterCategory, string> = {
      todas: faq.categories.todas,
      agendamento: faq.categories.agendamento,
      cuidados: lang === 'en' ? 'Aftercare' : lang === 'es' ? 'Cuidados' : 'Cuidados Pós-Tattoo',
      dor: faq.categories.dor,
      politicas: faq.categories.politicas,
    };
    return map;
  }, [faq.categories, lang]);

  const waUrl = `https://wa.me/${studioWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(faq.waPrefill)}`;

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div
            className="text-sm font-bold tracking-widest uppercase"
            style={{ color: 'var(--accent-gold)' }}
          >
            {faq.kicker}
          </div>
          <h2>{faq.title}</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {faq.lead}
          </p>
        </div>

        {isAdmin && onOpenFaqAdmin && (
          <button
            type="button"
            onClick={onOpenFaqAdmin}
            className="si-btn si-btn-outline si-btn-sm shrink-0"
          >
            <Edit3 size={15} aria-hidden="true" />
            Editar FAQ (Admin)
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={faq.filterAria}>
        {(['todas', ...FAQ_CATEGORIES.map((c) => c.key)] as FaqFilterCategory[]).map((key) => {
          const active = category === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className="px-4 py-2 rounded border text-sm font-bold uppercase tracking-wider cursor-pointer transition-colors whitespace-nowrap"
              style={{
                background: active ? 'var(--r)' : 'transparent',
                color: active ? 'var(--btn-text)' : 'var(--text)',
                borderColor: active ? 'var(--r)' : 'var(--border-strong)',
                minHeight: '44px',
              }}
            >
              {categoryLabels[key]}
            </button>
          );
        })}
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {visibleItems.length === 0 ? (
          <div className="si-card text-center py-8 space-y-2">
            <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>
              Nenhuma pergunta cadastrada nesta categoria no momento.
            </p>
            <button
              type="button"
              className="si-btn si-btn-outline si-btn-sm"
              onClick={() => setCategory('todas')}
            >
              {categoryLabels.todas}
            </button>
          </div>
        ) : (
          visibleItems.map((item) => {
            const isOpen = effectiveOpenId === item.id;
            return (
              <div key={item.id} className="si-card p-0 overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${item.id}`}
                  onClick={() => setOpenId(isOpen ? '__none__' : item.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 cursor-pointer transition-colors"
                  style={{
                    background: isOpen ? 'var(--card-alt)' : 'transparent',
                    color: 'var(--text)',
                    minHeight: '56px',
                  }}
                >
                  <div className="space-y-0.5">
                    <span
                      className="block text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'var(--accent-gold)' }}
                    >
                      {categoryLabels[item.category]}
                    </span>
                    <span className="block text-xl font-bold leading-snug">
                      {item.question}
                    </span>
                  </div>
                  <span className="shrink-0" style={{ color: 'var(--r)' }}>
                    {isOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-panel-${item.id}`}
                      key="content"
                      initial={prefersReduced ? false : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="px-5 pb-5 pt-3 border-t space-y-3"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <p className="text-lg leading-relaxed whitespace-pre-line" style={{ color: 'var(--text)' }}>
                        {item.answer}
                      </p>
                      {item.actionTab && (
                        <button
                          type="button"
                          className="si-btn si-btn-outline si-btn-sm"
                          onClick={() => onNavigateTab(item.actionTab as NavigateTarget)}
                        >
                          {item.actionLabel || 'Abrir seção'}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Direct Support Callout */}
      <div className="si-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h3 style={{ color: 'var(--accent-gold)' }}>{faq.stillDoubtsTitle}</h3>
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>
            {faq.stillDoubtsBody}
          </p>
        </div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="si-btn shrink-0"
        >
          {faq.askWhatsapp}
        </a>
      </div>
    </section>
  );
};
