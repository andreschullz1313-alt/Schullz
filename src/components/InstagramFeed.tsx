import React, { useRef, useState } from 'react';
import { ExternalLink, Instagram, Sparkles } from 'lucide-react';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { PORTFOLIO_WORKS, PortfolioWork } from '../data/studioData';
import { STUDIO_LOGO_URI } from '../assets/studioMedia';
import { fmt, useLanguage } from '../i18n/LanguageContext';

interface InstagramFeedProps {
  username: string;
  studioName: string;
  onViewPortfolioWorks?: () => void;
  onSelectWork?: (work: PortfolioWork) => void;
}

interface InteractiveRefCardProps {
  work: PortfolioWork;
  index: number;
  cleanHandle: string;
  profileUrl: string;
  onClickWork?: (work: PortfolioWork) => void;
}

const InteractiveRefCard: React.FC<InteractiveRefCardProps> = ({
  work,
  index,
  cleanHandle,
  profileUrl,
  onClickWork,
}) => {
  const prefersReduced = useReducedMotion();
  const { ui, tCategory, tWorkTitle } = useLanguage();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rawScale = useMotionValue(1);
  const springConfig = { stiffness: 360, damping: 28, mass: 0.6 };
  const rotateX = useSpring(rawRotateX, springConfig);
  const rotateY = useSpring(rawRotateY, springConfig);
  const scale = useSpring(rawScale, springConfig);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  });

  // Subtle alternating scroll-driven rotation & vertical depth as user scrolls past references
  const direction = index % 2 === 0 ? 1 : -1;
  const scrollRotate = useTransform(scrollYProgress, [0, 0.5, 1], [direction * -3.5, 0, direction * 3.5]);
  const scrollYShift = useTransform(scrollYProgress, [0, 0.5, 1], [14, 0, -14]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rawRotateY.set((px - 0.5) * 14);
    rawRotateX.set((0.5 - py) * 12);
    rawScale.set(1.03);
    if (!isHovered) setIsHovered(true);
  };

  const handlePointerLeave = () => {
    rawRotateX.set(0);
    rawRotateY.set(0);
    rawScale.set(1);
    if (isHovered) setIsHovered(false);
  };

  const localizedTitle = tWorkTitle(work.title);
  const localizedCat = tCategory(work.category);

  return (
    <motion.div
      ref={cardRef}
      style={
        prefersReduced
          ? undefined
          : {
              rotateZ: scrollRotate,
              y: scrollYShift,
              perspective: 900,
            }
      }
      initial={prefersReduced ? false : { opacity: 0, y: 20, rotateZ: direction * -2 }}
      whileInView={prefersReduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.04, 0.2), ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="si-card si-card-interactive p-0 overflow-hidden flex flex-col h-full"
        style={
          prefersReduced
            ? { borderColor: isHovered ? 'var(--r)' : 'var(--border-strong)' }
            : {
                rotateX,
                rotateY,
                scale,
                transformStyle: 'preserve-3d',
                borderColor: isHovered ? 'var(--r)' : 'var(--border-strong)',
              }
        }
      >
        <button
          type="button"
          onClick={() => (onClickWork ? onClickWork(work) : undefined)}
          className="relative w-full aspect-[4/5] overflow-hidden border-0 p-0 bg-black cursor-pointer group"
        >
          <motion.div
            layoutId={prefersReduced ? undefined : `work-media-${work.title}`}
            transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.7 }}
            className="w-full h-full overflow-hidden"
          >
            <img
              src={work.src}
              alt={`${localizedTitle} — @${cleanHandle}`}
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              background:
                'linear-gradient(to top, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.18) 48%, transparent 100%)',
            }}
          />
          <span
            className="absolute left-3 bottom-3 right-3 text-left flex items-end justify-between gap-2"
            style={{ color: '#f7f4ee' }}
          >
            <span>
              <span className="block text-xs font-bold uppercase tracking-widest" style={{ color: '#ffd27a' }}>
                @{cleanHandle} ·{' '}
                <motion.span
                  layoutId={prefersReduced ? undefined : `work-category-${work.title}`}
                  layout="position"
                  transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
                  className="inline-block"
                >
                  {localizedCat}
                </motion.span>
              </span>
              <motion.span
                layoutId={prefersReduced ? undefined : `work-title-${work.title}`}
                layout="position"
                transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
                className="block font-bold text-base leading-tight"
              >
                {localizedTitle}
              </motion.span>
            </span>
            <span
              className="shrink-0 px-2 py-1 rounded text-xs font-bold uppercase"
              style={{ background: 'rgba(242,41,41,0.9)', color: '#0a0a0a' }}
            >
              {ui.instagram.viewBtn}
            </span>
          </span>
        </button>

        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-sm">
          <span className="font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
            {ui.instagram.officialRef}
          </span>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold uppercase tracking-wider shrink-0"
            style={{ color: 'var(--r)' }}
          >
            <Instagram size={14} aria-hidden="true" />
            {ui.instagram.postLink}
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const InstagramFeed: React.FC<InstagramFeedProps> = ({
  username,
  studioName,
  onViewPortfolioWorks,
  onSelectWork,
}) => {
  const { ui } = useLanguage();
  const cleanHandle = username.replace(/^@/, '').trim() || 'andreschullz.ofc13';
  const profileUrl = `https://www.instagram.com/${cleanHandle}/`;
  const embedUrl = `https://www.instagram.com/${cleanHandle}/embed/`;
  const featuredReferences = PORTFOLIO_WORKS.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Official Profile Header Card */}
      <div className="si-card si-card-interactive tab-stagger-block flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src={STUDIO_LOGO_URI}
            alt={`@${cleanHandle}`}
            className="w-14 h-14 rounded-full object-cover border-2 shrink-0"
            style={{ borderColor: 'var(--r)' }}
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-xl" style={{ color: 'var(--text)' }}>
                @{cleanHandle}
              </strong>
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--accent-gold)' }}
              >
                {ui.instagram.officialBadge}
              </span>
            </div>
            <p className="text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>
              {fmt(ui.instagram.profileDesc, { studio: studioName })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="si-btn si-btn-sm"
          >
            <Instagram size={17} aria-hidden="true" />
            {fmt(ui.instagram.openProfile, { handle: cleanHandle })}
            <ExternalLink size={15} aria-hidden="true" />
          </a>
          {onViewPortfolioWorks && (
            <button
              type="button"
              className="si-btn si-btn-outline si-btn-sm"
              onClick={onViewPortfolioWorks}
            >
              {ui.instagram.viewFullGallery}
            </button>
          )}
        </div>
      </div>

      {/* Interactive Scroll & 3D-Tilt References Strip from @andreschullz.ofc13 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={17} style={{ color: 'var(--accent-gold)' }} aria-hidden="true" />
            <h3 className="text-xl m-0" style={{ color: 'var(--accent-gold)' }}>
              {fmt(ui.instagram.highlightsTitle, { handle: cleanHandle })}
            </h3>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            {ui.instagram.highlightsHint}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-1">
          {featuredReferences.map((work, idx) => (
            <InteractiveRefCard
              key={work.title}
              work={work}
              index={idx}
              cleanHandle={cleanHandle}
              profileUrl={profileUrl}
              onClickWork={onSelectWork}
            />
          ))}
        </div>
      </div>

      {/* Official Instagram Embed Frame */}
      <div
        className="rounded-lg overflow-hidden border tab-stagger-block"
        style={{
          borderColor: 'var(--border-strong)',
          background: '#ffffff',
        }}
      >
        <iframe
          title={fmt(ui.instagram.iframeTitle, { handle: cleanHandle })}
          src={embedUrl}
          className="w-full block border-0"
          style={{ minHeight: '540px', height: '620px', background: '#ffffff' }}
          loading="lazy"
          allow="encrypted-media"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* Helpful fallback notice when third-party cookies/embeds are blocked */}
      <div className="si-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-4">
        <p className="text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>
          {fmt(ui.instagram.fallbackText, { handle: cleanHandle })}
        </p>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="si-btn si-btn-outline si-btn-sm shrink-0"
        >
          {ui.instagram.viewPostsBtn}
        </a>
      </div>
    </div>
  );
};
