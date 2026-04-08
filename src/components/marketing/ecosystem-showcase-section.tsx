'use client';

import { EcosystemSection } from '@/components/marketing/ecosystem-section';
import { useLanguage } from '@/components/marketing/language-context';
import { motion } from 'framer-motion';

export function EcosystemShowcaseSection() {
  const { t } = useLanguage();

  return (
    <section className="ledger-shell relative overflow-hidden border-t border-slate-200 py-20 lg:py-28">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="ledger-panel mx-auto mb-12 max-w-5xl rounded-[28px] px-6 py-8 text-center md:px-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Diagrama interactivo
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Ecosistema operacional de Don Candido IA
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
            {t.ecosystem.subtitle}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="ledger-panel rounded-[32px] p-4 md:p-6 lg:p-8"
        >
          <EcosystemSection embedded />
        </motion.div>

        <div className="mx-auto mt-8 grid max-w-6xl gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
            La lectura queda separada del bloque de fortalezas y gana aire
            visual.
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
            El diagrama ahora tiene ancho y altura propia para no comprimirse.
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
            Se conserva el motion, la secuencia y la interaccion sin amontonar
            la landing.
          </div>
        </div>
      </div>
    </section>
  );
}
