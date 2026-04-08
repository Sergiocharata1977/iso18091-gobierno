'use client';

import { moduleAccents } from '@/components/design-system/tokens';
import { useLanguage } from '@/components/marketing/language-context';
import { motion, useReducedMotion } from 'framer-motion';
import { useState, Fragment } from 'react';
import {
  ArrowRight,
  Factory,
  Network,
  Settings,
  ShieldCheck,
  Layers,
} from 'lucide-react';

const modulePalette = [
  moduleAccents.quality, // Moved to first (ISO Core)
  moduleAccents.industry, // Industry
  moduleAccents.agro, // Ops
  moduleAccents.finance, // Channels/Services
] as const;

const pillarStyles = [
  {
    icon: ShieldCheck,
    glow: 'from-blue-200/60 via-transparent to-transparent',
    line: '#3b82f6', // blue
    node: '#3b82f6',
    label: 'ISO Core',
  },
  {
    icon: Factory,
    glow: 'from-purple-200/60 via-transparent to-transparent',
    line: '#a855f7', // purple
    node: '#a855f7',
    label: 'Industry',
  },
  {
    icon: Settings,
    glow: 'from-green-200/60 via-transparent to-transparent',
    line: '#22c55e', // green
    node: '#22c55e',
    label: 'Ops',
  },
  {
    icon: Network,
    glow: 'from-amber-200/60 via-transparent to-transparent',
    line: '#f59e0b', // amber
    node: '#f59e0b',
    label: 'Channels',
  },
] as const;

const desktopNodes = [
  { cx: 310, cy: 170 },
  { cx: 890, cy: 170 },
  { cx: 890, cy: 570 },
  { cx: 310, cy: 570 },
] as const;

const desktopConnectors = [
  {
    d: 'M310 170 C 420 205, 475 245, 548 314',
    x: 360,
    y: 210,
    rotate: 18,
    label: '01',
  },
  {
    d: 'M890 170 C 785 205, 725 245, 652 314',
    x: 812,
    y: 212,
    rotate: 162,
    label: '02',
  },
  {
    d: 'M890 570 C 782 535, 726 493, 652 446',
    x: 806,
    y: 528,
    rotate: 196,
    label: '03',
  },
  {
    d: 'M310 570 C 418 535, 474 493, 548 446',
    x: 360,
    y: 528,
    rotate: -16,
    label: '04',
  },
] as const;

type EcosystemSectionProps = {
  embedded?: boolean;
};

export function EcosystemSection({ embedded = false }: EcosystemSectionProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(null as number | null);

  const content = (
    <Fragment>
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-200/30 blur-3xl transition-colors duration-1000" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-200/35 blur-3xl transition-colors duration-1000" />
        <div className="absolute left-0 top-1/3 h-72 w-72 rounded-full bg-purple-200/25 blur-3xl transition-colors duration-1000" />
      </div>

      <div
        className={`relative mx-auto ${
          embedded ? 'max-w-none px-0' : 'max-w-7xl px-4 sm:px-6 lg:px-8'
        }`}
      >
        {!embedded ? (
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              {t.ecosystem.eyebrow}
            </p>
            <h2 className="text-4xl font-black text-slate-900 sm:text-5xl tracking-tight">
              {t.ecosystem.title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              {t.ecosystem.subtitle}
            </p>
          </div>
        ) : null}

        <div className="relative mx-auto flex max-w-6xl flex-col items-center justify-center gap-10 lg:min-h-[48rem]">
          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            <svg
              viewBox="0 0 1200 760"
              className="h-full w-full overflow-visible transition-colors duration-500"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="ecosystemArrow"
                  markerWidth="10"
                  markerHeight="10"
                  refX="7"
                  refY="5"
                  orient="auto"
                >
                  <path d="M0,0 L10,5 L0,10 z" fill="rgba(51,65,85,0.45)" />
                </marker>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {desktopConnectors.map((connector, index) => {
                const isActive = activeIndex === index;
                const isFaded = activeIndex !== null && !isActive;

                return (
                  <g
                    key={connector.label}
                    style={{ transition: 'opacity 0.4s ease' }}
                    opacity={isFaded ? 0.15 : 1}
                  >
                    <motion.path
                      d={connector.d}
                      fill="none"
                      stroke={pillarStyles[index].line}
                      strokeWidth={isActive ? '5' : '3'}
                      strokeLinecap="round"
                      markerEnd="url(#ecosystemArrow)"
                      strokeDasharray={reduceMotion ? undefined : '11 11'}
                      filter={isActive ? 'url(#glow)' : undefined}
                      animate={
                        reduceMotion
                          ? {}
                          : {
                              strokeDashoffset: isActive ? [0, -22] : 0,
                            }
                      }
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                    <g
                      transform={`translate(${connector.x} ${connector.y}) rotate(${connector.rotate})`}
                    >
                      <motion.rect
                        x="-22"
                        y="-14"
                        width="44"
                        height="28"
                        rx="14"
                        fill="white"
                        stroke={pillarStyles[index].line}
                        strokeWidth={isActive ? '2' : '1'}
                        animate={isActive ? { scale: 1.2 } : { scale: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 20,
                        }}
                      />
                      <motion.text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-slate-700 text-[11px] font-bold"
                        animate={isActive ? { scale: 1.2 } : { scale: 1 }}
                      >
                        {connector.label}
                      </motion.text>
                    </g>
                  </g>
                );
              })}

              {desktopNodes.map((node, index) => {
                const isActive = activeIndex === index;
                const isFaded = activeIndex !== null && !isActive;

                return (
                  <g
                    key={`${node.cx}-${node.cy}`}
                    style={{ transition: 'all 0.4s ease' }}
                    opacity={isFaded ? 0.25 : 1}
                  >
                    <motion.circle
                      cx={node.cx}
                      cy={node.cy}
                      r="10"
                      fill="white"
                      stroke={pillarStyles[index].node}
                      strokeWidth="3"
                      animate={
                        isActive ? { scale: 1.5, r: 12 } : { scale: 1, r: 10 }
                      }
                    />
                    <motion.circle
                      cx={node.cx}
                      cy={node.cy}
                      r="4"
                      fill={pillarStyles[index].node}
                      animate={isActive ? { scale: 1.5 } : { scale: 1 }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, ease: 'easeOut', type: 'spring' }}
            whileHover={reduceMotion ? undefined : { scale: 1.05 }}
            className={`relative z-10 flex h-64 w-64 shrink-0 flex-col items-center justify-center rounded-[40px] border border-white/70 bg-white/95 p-8 text-center shadow-[0_40px_100px_-20px_rgba(15,23,42,0.15)] backdrop-blur transition-colors duration-500 md:h-72 md:w-72 lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 ${
              activeIndex !== null
                ? `${modulePalette[activeIndex].ring} ring-offset-4 ring-4`
                : 'ring-2 ring-slate-100 ring-offset-2'
            }`}
          >
            <div className="absolute inset-4 rounded-[32px] border border-slate-100" />

            <motion.div
              aria-hidden="true"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      rotate:
                        activeIndex !== null ? [0, 90, 180, 270, 360] : 360,
                    }
              }
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: activeIndex !== null ? 10 : 30,
                      repeat: Infinity,
                      ease: 'linear',
                    }
              }
              className="absolute -inset-10 hidden lg:block pointer-events-none"
            >
              <div className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-slate-300/60" />
              {t.ecosystem.pillars.map((pillar, index) => {
                const palette = modulePalette[index] ?? modulePalette[0];
                const orbitPositions = [
                  'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2',
                  'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
                  'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2',
                  'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2',
                ];

                return (
                  <motion.div
                    key={`${pillar.title}-orbit`}
                    className={`absolute ${orbitPositions[index]} rounded-full border-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] shadow-sm transition-all duration-300 ${
                      activeIndex === null || activeIndex === index
                        ? `${palette.border} ${palette.light} ${palette.text} scale-110`
                        : 'border-slate-200 bg-white text-slate-400 scale-90'
                    }`}
                  >
                    M{index + 1}
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div
              aria-hidden="true"
              animate={
                reduceMotion
                  ? undefined
                  : { scale: [1, 1.08, 1], opacity: [0.3, 0.7, 0.3] }
              }
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className={`absolute inset-0 rounded-[40px] border-2 transition-colors duration-500 ${
                activeIndex !== null
                  ? modulePalette[activeIndex].border
                  : 'border-blue-200/50'
              }`}
            />

            <motion.div
              animate={activeIndex !== null ? { rotateY: 180 } : { rotateY: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl ring-4 ring-white"
            >
              <Layers
                className="h-8 w-8"
                style={{
                  transform: activeIndex !== null ? 'rotateY(180deg)' : 'none',
                }}
              />
            </motion.div>

            <h3 className="text-[28px] font-black tracking-tight text-slate-900 leading-none mb-1">
              CORE SGC
            </h3>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {t.ecosystem.nucleusLabel}
            </p>

            <div
              className={`mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-500 ${
                activeIndex !== null
                  ? `${modulePalette[activeIndex].light} ${modulePalette[activeIndex].text} ${modulePalette[activeIndex].border}`
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${activeIndex !== null ? modulePalette[activeIndex].accent : 'bg-blue-500'} animate-pulse`}
              />
              Plataforma Base
            </div>
          </motion.div>

          <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-x-[28rem] lg:gap-y-24 z-20">
            {t.ecosystem.pillars.map((pillar, index) => {
              const style = pillarStyles[index] ?? pillarStyles[0];
              const palette = modulePalette[index] ?? modulePalette[0];
              const Icon = style.icon;
              const isActive = activeIndex === index;
              const isFaded = activeIndex !== null && !isActive;

              return (
                <motion.article
                  key={pillar.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    delay: index * 0.1,
                    duration: 0.5,
                    type: 'spring',
                  }}
                  whileHover={
                    reduceMotion
                      ? undefined
                      : {
                          y: -12,
                          scale: 1.04,
                          transition: {
                            type: 'spring',
                            stiffness: 400,
                            damping: 25,
                          },
                        }
                  }
                  onHoverStart={() => setActiveIndex(index)}
                  onHoverEnd={() => setActiveIndex(null)}
                  className={`group relative overflow-hidden rounded-[2rem] border-2 bg-white p-7 transition-all duration-500 cursor-default ${
                    isActive
                      ? `border-transparent shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] ring-4 ring-offset-4 ${palette.ring}`
                      : isFaded
                        ? 'border-slate-100 shadow-sm opacity-60 grayscale-[30%]'
                        : 'border-slate-200 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.08)] hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${palette.accent} via-white to-transparent transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${style.glow} opacity-0 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'group-hover:opacity-40'}`}
                  />

                  <div className="relative z-10">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <motion.div
                          animate={
                            isActive
                              ? { rotate: [0, -10, 10, 0], scale: 1.1 }
                              : { rotate: 0, scale: 1 }
                          }
                          transition={{ duration: 0.5 }}
                          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] transition-colors duration-300 ${
                            isActive
                              ? palette.light
                              : 'bg-slate-100/80 group-hover:bg-slate-100'
                          }`}
                        >
                          <Icon
                            className={`h-8 w-8 transition-colors duration-300 ${isActive ? palette.text : 'text-slate-600'}`}
                          />
                        </motion.div>
                        <div className="pt-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[10px] font-bold transition-colors ${
                                isActive
                                  ? `${palette.light} ${palette.text}`
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              0{index + 1}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                                isActive ? palette.text : 'text-slate-500'
                              }`}
                            >
                              {style.label}
                            </span>
                          </div>
                          <h3
                            className={`text-[22px] font-bold leading-tight transition-colors ${isActive ? 'text-slate-900' : 'text-slate-800'}`}
                          >
                            {pillar.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <ul className="space-y-4">
                      {pillar.items.map((item, i) => (
                        <motion.li
                          key={item}
                          initial={false}
                          animate={
                            isActive
                              ? { x: 5, color: '#334155' }
                              : { x: 0, color: '#475569' }
                          }
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 text-sm font-medium"
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              isActive
                                ? `${palette.border} bg-white ${palette.text}`
                                : 'border-slate-200 bg-slate-50 text-slate-400'
                            }`}
                          >
                            <ArrowRight className="h-2.5 w-2.5" />
                          </span>
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ul>

                    <motion.div
                      layout
                      className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Integración SGC
                      </span>
                      <motion.div
                        animate={isActive ? { x: [0, 4, 0] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isActive ? palette.text : 'text-slate-400'}`}
                      >
                        Sincronizado
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <div className="mt-4 grid w-full max-w-5xl grid-cols-1 gap-3 md:grid-cols-4 lg:hidden relative z-20">
            {t.ecosystem.pillars.map((pillar, index) => {
              const palette = modulePalette[index] ?? modulePalette[0];
              const isActive = activeIndex === index;
              return (
                <div
                  key={`${pillar.title}-sequence`}
                  onClick={() => setActiveIndex(isActive ? null : index)}
                  className={`flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-xs font-bold uppercase tracking-[0.14em] transition-all cursor-pointer ${
                    isActive
                      ? `bg-white ${palette.border} shadow-md ring-2 ring-offset-2 ${palette.ring}`
                      : 'bg-white/80 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                        isActive
                          ? `${palette.light} ${palette.text}`
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className={isActive ? palette.text : ''}>
                      {pillar.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!embedded ? (
          <p className="mx-auto mt-20 max-w-3xl text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {t.ecosystem.footer}
          </p>
        ) : null}
      </div>
    </Fragment>
  );

  if (embedded) {
    return (
      <div className="relative overflow-hidden rounded-[40px] bg-slate-50/50 p-6 md:p-10 border border-slate-100">
        {content}
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden border-t border-slate-200 bg-slate-50/30 py-24 lg:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.3]" />
      {content}
    </section>
  );
}
