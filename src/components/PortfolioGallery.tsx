import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PortfolioWork } from '../data/studioData';
import { fmt, useLanguage } from '../i18n/LanguageContext';

interface PortfolioGalleryProps {
  works: PortfolioWork[];
  category: string;
  onSelectWork: (work: PortfolioWork) => void;
  onWantStyle: (category: string) => void;
  onResetCategory?: () => void;
}

function useGridColumns(): number {
  const [cols, setCols] = useState<number>(() => {
    if (typeof window === 'undefined') return 3;
    if (window.matchMedia('(min-width: 1024px)').matches) return 3;
    if (window.matchMedia('(min-width: 640px)').matches) return 2;
    return 1;
  });

  useEffect(() => {
    const mqLg = window.matchMedia('(min-width: 1024px)');
    const mqSm = window.matchMedia('(min-width: 640px)');

    const update = () => {
      if (mqLg.matches) setCols(3);
      else if (mqSm.matches) setCols(2);
      else setCols(1);
    };

    update();
    mqLg.addEventListener('change', update);
    mqSm.addEventListener('change', update);
    return () => {
      mqLg.removeEventListener('change', update);
      mqSm.removeEventListener('change', update);
    };
  }, []);

  return cols;
}

export const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({
  works,
  category,
  onSelectWork,
  onWantStyle,
  onResetCategory,
}) => {
  const prefersReduced = useReducedMotion();
  const cols = useGridColumns();
  const { ui, tCategory, tWorkTitle } = useLanguage();
  const displayCat = tCategory(category);
  const initialCategoryRef = useRef(category);
  const hasChangedCategoryRef = useRef(false);

  if (category !== initialCategoryRef.current) {
    hasChangedCategoryRef.current = true;
  }

  return (
      <div className="relative">
        <AnimatePresence mode="popLayout">
          {works.length === 0 ? (
            <motion.div
              key={`empty-${category}`}
              layout={prefersReduced ? false : 'position'}
              initial={prefersReduced ? false : { opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                prefersReduced
                  ? undefined
                  : { opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.18, ease: 'easeIn' } }
              }
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="si-card text-center py-10 space-y-3"
            >
              <h3>{fmt(ui.portfolio.emptyTitle, { category: displayCat })}</h3>
              <p className="text-base" style={{ color: 'var(--text-muted)' }}>
                {ui.portfolio.emptyBody}
              </p>
              {onResetCategory && (
                <button
                  type="button"
                  className="si-btn si-btn-outline si-btn-sm"
                  onClick={onResetCategory}
                >
                  {ui.portfolio.emptyReset}
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="portfolio-grid"
              exit={
                prefersReduced
                  ? undefined
                  : { opacity: 0, transition: { duration: 0.14, ease: 'easeOut' } }
              }
              className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {works.map((work, index) => {
                  const colIndex = index % cols;
                  const isFirstRow = index < cols;
                  const enterDelay = prefersReduced
                    ? 0
                    : hasChangedCategoryRef.current
                      ? colIndex * 0.03
                      : (isFirstRow ? 0.05 : 0.015) + colIndex * 0.045;
                  const localizedTitle = tWorkTitle(work.title);
                  const localizedCategory = tCategory(work.category);

                  return (
                    <motion.div
                      key={work.title}
                      layout={prefersReduced ? false : 'position'}
                      initial={prefersReduced ? false : { opacity: 0, y: 24, scale: 0.96 }}
                      whileInView={prefersReduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
                      exit={
                        prefersReduced
                          ? undefined
                          : {
                              opacity: 0,
                              scale: 0.92,
                              y: 8,
                              transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
                            }
                      }
                      viewport={{ once: true, amount: 0.05 }}
                      transition={{
                        layout: {
                          type: 'spring',
                          stiffness: 420,
                          damping: 34,
                          mass: 0.7,
                        },
                        opacity: {
                          duration: 0.28,
                          delay: enterDelay,
                          ease: [0.16, 1, 0.3, 1],
                        },
                        y: {
                          duration: 0.3,
                          delay: enterDelay,
                          ease: [0.16, 1, 0.3, 1],
                        },
                        scale: {
                          duration: 0.28,
                          delay: enterDelay,
                          ease: [0.16, 1, 0.3, 1],
                        },
                      }}
                    >
                      <article className="si-card si-card-interactive p-0 overflow-hidden flex flex-col h-full">
                        <button
                          type="button"
                          onClick={() => onSelectWork(work)}
                          className="relative w-full aspect-[3/4] overflow-hidden cursor-pointer border-0 p-0 bg-black group"
                        >
                          <motion.div
                            layoutId={prefersReduced ? undefined : `work-media-${work.title}`}
                            transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.7 }}
                            className="w-full h-full overflow-hidden"
                          >
                            <img
                              src={work.src}
                              alt={localizedTitle}
                              decoding="async"
                              loading={index < 3 ? 'eager' : 'lazy'}
                              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          </motion.div>
                          <div
                            aria-hidden="true"
                            className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
                            style={{
                              background:
                                'linear-gradient(to top, rgba(10,10,10,0.65) 0%, transparent 100%)',
                            }}
                          />
                          <span
                            className="absolute right-2.5 bottom-2.5 px-3 py-1 rounded text-sm font-bold transition-transform duration-200 group-hover:scale-105"
                            style={{ background: 'rgba(10,10,10,0.85)', color: '#f7f4ee' }}
                          >
                            {ui.common.enlarge}
                          </span>
                        </button>
                        <div className="p-4 flex items-center justify-between gap-3 mt-auto">
                          <div>
                            <motion.h3
                              layoutId={prefersReduced ? undefined : `work-title-${work.title}`}
                              layout="position"
                              transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
                              className="text-xl"
                            >
                              {localizedTitle}
                            </motion.h3>
                            <motion.span
                              layoutId={prefersReduced ? undefined : `work-category-${work.title}`}
                              layout="position"
                              transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
                              className="inline-block text-sm font-bold uppercase tracking-wider"
                              style={{ color: 'var(--accent-gold)' }}
                            >
                              {localizedCategory}
                            </motion.span>
                          </div>
                          <button
                            type="button"
                            className="si-btn si-btn-outline si-btn-sm shrink-0"
                            onClick={() => onWantStyle(work.category)}
                          >
                            {ui.common.wantThisStyle}
                          </button>
                        </div>
                      </article>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
};
