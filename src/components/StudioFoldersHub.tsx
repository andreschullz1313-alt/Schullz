import React from 'react';
import {
  ChevronRight,
  ClipboardCheck,
  Folder,
  FolderOpen,
  HelpCircle,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react';
import {
  FolderId,
  formatBRL,
  NavigateTarget,
  PortfolioWork,
  STORE_PRODUCTS,
} from '../data/studioData';
import { InstagramFeed } from './InstagramFeed';
import { FAQ } from './FAQ';
import { PrepGuide } from './PrepGuide';
import { HealingGuide } from './HealingGuide';
import { fmt, useLanguage } from '../i18n/LanguageContext';

import { FaqItemRecord } from '../services/faqService';

interface FolderMeta {
  id: FolderId;
  letter: string;
  order: string;
  icon: React.ReactNode;
}

const FOLDER_ORDER: FolderMeta[] = [
  { id: 'contato', letter: 'C', order: '01', icon: <Phone size={20} aria-hidden="true" /> },
  { id: 'faq', letter: 'F', order: '02', icon: <HelpCircle size={20} aria-hidden="true" /> },
  { id: 'preparacao', letter: 'G', order: '03', icon: <ClipboardCheck size={20} aria-hidden="true" /> },
  { id: 'pos-tattoo', letter: 'P', order: '04', icon: <Sparkles size={20} aria-hidden="true" /> },
];

interface StudioFoldersHubProps {
  activeFolder: FolderId;
  onSelectFolder: (folder: FolderId) => void;
  onNavigate: (target: NavigateTarget) => void;
  studioName: string;
  studioWhatsapp: string;
  studioInstagram: string;
  onSelectPortfolioWork?: (work: PortfolioWork) => void;
  faqItems?: FaqItemRecord[];
  isAdmin?: boolean;
  onOpenFaqAdmin?: () => void;
}

export const StudioFoldersHub: React.FC<StudioFoldersHubProps> = ({
  activeFolder,
  onSelectFolder,
  onNavigate,
  studioName,
  studioWhatsapp,
  studioInstagram,
  onSelectPortfolioWork,
  faqItems = [],
  isAdmin = false,
  onOpenFaqAdmin,
}) => {
  const { domain, ui } = useLanguage();
  const fh = domain.foldersHub;

  const igClean = studioInstagram.replace(/^@/, '');
  const igUrl = `https://instagram.com/${igClean}/`;
  const waUrl = `https://wa.me/${studioWhatsapp.replace(/\D/g, '')}`;
  const activeMeta = FOLDER_ORDER.find((f) => f.id === activeFolder) ?? FOLDER_ORDER[0];
  const activeIndex = FOLDER_ORDER.findIndex((f) => f.id === activeFolder);
  const nextFolder = FOLDER_ORDER[(activeIndex + 1) % FOLDER_ORDER.length];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <div
          className="tab-stagger-kicker text-sm font-bold tracking-[0.24em] uppercase"
          style={{ color: 'var(--accent-gold)' }}
        >
          {fh.kicker}
        </div>
        <h2 className="tab-stagger-title">{fh.title}</h2>
        <p className="tab-stagger-lead text-lg max-w-3xl" style={{ color: 'var(--text-muted)' }}>
          {fh.lead}
        </p>
      </div>

      {/* Folder Cabinet */}
      <div
        role="tablist"
        aria-label={fh.tabsAria}
        className="tab-stagger-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {FOLDER_ORDER.map((folder) => {
          const isOpen = folder.id === activeFolder;
          const localized = fh.folders[folder.id];
          return (
            <button
              key={folder.id}
              type="button"
              role="tab"
              aria-selected={isOpen}
              aria-controls={`folder-panel-${folder.id}`}
              onClick={() => onSelectFolder(folder.id)}
              className="si-card si-card-interactive text-left p-0 overflow-hidden flex flex-col justify-between cursor-pointer"
              style={{
                borderColor: isOpen ? 'var(--r)' : 'var(--border-strong)',
                background: isOpen ? 'var(--card-alt)' : 'var(--card)',
                boxShadow: isOpen ? '0 10px 24px -10px rgba(242, 41, 41, 0.35)' : undefined,
              }}
            >
              <div
                className="px-4 py-2 flex items-center justify-between border-b"
                style={{
                  background: isOpen ? 'var(--r)' : 'var(--card-alt)',
                  color: isOpen ? 'var(--btn-text)' : 'var(--accent-gold)',
                  borderColor: isOpen ? 'var(--r)' : 'var(--border-subtle)',
                }}
              >
                <span className="inline-flex items-center gap-2 font-bold text-sm tracking-widest uppercase">
                  {isOpen ? <FolderOpen size={17} aria-hidden="true" /> : <Folder size={17} aria-hidden="true" />}
                  {fh.folderWord} {folder.order} · {folder.letter}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isOpen ? fh.openStatus : fh.closedStatus}
                </span>
              </div>

              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span style={{ color: isOpen ? 'var(--r)' : 'var(--accent-gold)' }}>
                      {folder.icon}
                    </span>
                    <h3 className="text-2xl m-0" style={{ color: isOpen ? 'var(--r)' : 'var(--text)' }}>
                      {localized.title}
                    </h3>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>
                    {localized.subtitle}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {localized.summary}
                  </p>
                </div>

                <div
                  className="pt-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider border-t"
                  style={{ borderColor: 'var(--border-subtle)', color: isOpen ? 'var(--r)' : 'var(--text)' }}
                >
                  <span>{isOpen ? fh.viewingNow : fh.clickToOpen}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Folder Workspace */}
      <div
        key={activeFolder}
        id={`folder-panel-${activeFolder}`}
        role="tabpanel"
        className="rounded-lg border p-2 sm:p-4 space-y-4"
        style={{
          borderColor: 'var(--border-strong)',
          background: 'var(--bg-elevated)',
        }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 tab-stagger-kicker">
            <FolderOpen size={18} style={{ color: 'var(--r)' }} aria-hidden="true" />
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)' }}>
              {fh.folderWord} {activeMeta.order} ({activeMeta.letter}) · {fh.folders[activeMeta.id].title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectFolder(nextFolder.id)}
            className="si-btn si-btn-outline si-btn-sm"
          >
            {fmt(fh.nextFolder, { title: fh.folders[nextFolder.id].title })}
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        {activeFolder === 'contato' && (
          <div className="px-2 py-4 space-y-8">
            <section className="space-y-4">
              <div
                className="tab-stagger-kicker text-sm font-bold tracking-widest uppercase"
                style={{ color: 'var(--accent-gold)' }}
              >
                {fh.contactKicker}
              </div>
              <h2 className="tab-stagger-title">@{igClean}</h2>
              <InstagramFeed
                username={igClean}
                studioName={studioName}
                onViewPortfolioWorks={() => onNavigate('portfolio')}
                onSelectWork={onSelectPortfolioWork}
              />
            </section>

            <div className="torn" />

            <section className="si-card si-card-interactive tab-stagger-block space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--accent-gold)' }}>
                <MapPin size={16} aria-hidden="true" />
                {fh.privateStudio}
              </div>
              <h2>{fh.visitUs}</h2>
              <p className="text-lg">
                Rua Leocádio Ferreira Barbosa, São Domingos 185
                <br />
                Navegantes - SC, CEP 88370-220
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  className="si-btn"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://www.google.com/maps/search/?api=1&query=Rua+Leoc%C3%A1dio+Ferreira+Barbosa+185+Navegantes+SC"
                >
                  {fh.openMaps}
                </a>
                <a className="si-btn si-btn-outline" href={igUrl} target="_blank" rel="noopener noreferrer">
                  {ui.portfolio.tabInstagram}
                </a>
                <a className="si-btn si-btn-outline" href={waUrl} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </div>
            </section>
          </div>
        )}

        {activeFolder === 'faq' && (
          <div className="tab-stagger-block">
            <FAQ
              onNavigateTab={onNavigate}
              studioWhatsapp={studioWhatsapp}
              remoteItems={faqItems}
              isAdmin={isAdmin}
              onOpenFaqAdmin={onOpenFaqAdmin}
            />
          </div>
        )}

        {activeFolder === 'preparacao' && (
          <div className="tab-stagger-block">
            <PrepGuide onNavigateTab={onNavigate} />
          </div>
        )}

        {activeFolder === 'pos-tattoo' && (
          <section className="max-w-5xl mx-auto px-2 sm:px-4 py-4 space-y-6">
            <div>
              <div
                className="tab-stagger-kicker text-sm font-bold tracking-widest uppercase"
                style={{ color: 'var(--accent-gold)' }}
              >
                {fh.aftercareKicker}
              </div>
              <h2 className="tab-stagger-title">{fh.aftercareTitle}</h2>
              <p className="tab-stagger-lead" style={{ color: 'var(--text)' }}>
                {fh.aftercareLead}
              </p>
            </div>

            <div className="tab-stagger-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {STORE_PRODUCTS.map((prod, idx) => {
                const localizedProd = domain.storeProducts[idx] || prod;
                return (
                  <div key={prod.name} className="si-card si-card-interactive flex flex-col justify-between gap-3" tabIndex={0}>
                    <div className="space-y-1.5">
                      <h3>{localizedProd.name}</h3>
                      <p className="text-base" style={{ color: 'var(--text-muted)' }}>
                        {localizedProd.description}
                      </p>
                    </div>
                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>
                        {fmt(fh.inStock, { count: prod.stock })}
                      </div>
                      <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--r)' }}>
                        {formatBRL(prod.price)}
                      </div>
                      <a
                        className="si-btn si-btn-sm w-full"
                        href={`${waUrl}?text=${encodeURIComponent(fh.waOrderPrefix + localizedProd.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {fh.orderWhatsapp}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="tab-stagger-block">
              <HealingGuide />
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
