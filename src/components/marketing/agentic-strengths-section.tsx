'use client';

import { useLanguage } from '@/components/marketing/language-context';
import { motion } from 'framer-motion';
import {
  Bot,
  MonitorSmartphone,
  ShieldCheck,
  Workflow,
  Zap,
} from 'lucide-react';

const icons = [Zap, Workflow, ShieldCheck, MonitorSmartphone];

export function AgenticStrengthsSection() {
  const { t } = useLanguage();

  return (
    <section className="ledger-shell relative overflow-hidden border-t border-slate-200 py-20 lg:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.10),transparent_26%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="ledger-panel mx-auto mb-14 max-w-5xl rounded-[28px] px-6 py-8 text-center md:px-10">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm">
            <Bot className="h-4 w-4 text-emerald-700" />
            Don Candido IA
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            {t.agenticStrengths.title}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            {t.agenticStrengths.subtitle}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {t.agenticStrengths.items.map((item, index) => {
            const Icon = icons[index] || Bot;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="ledger-panel group relative overflow-hidden rounded-[28px] p-7 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-slate-900/5">
                  <div className={`h-full w-24 ${item.accent}`} />
                </div>
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-slate-50 text-slate-700 transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </motion.article>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-4xl text-center text-base leading-relaxed text-slate-600">
          {t.agenticStrengths.outro}
        </p>
      </div>
    </section>
  );
}
