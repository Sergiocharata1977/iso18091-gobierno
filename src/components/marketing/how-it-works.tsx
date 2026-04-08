'use client';

import { useLanguage } from '@/components/marketing/language-context';
import { BrainCircuit, Layout, ShieldCheck } from 'lucide-react';

const icons = [Layout, BrainCircuit, ShieldCheck];

export function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section id="how-it-works" className="ledger-shell relative py-20 lg:py-28">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 text-balance">
            {t.howItWorks.title}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto text-pretty">
            {t.howItWorks.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {t.howItWorks.features.slice(0, 3).map((feature, index) => {
            const Icon = icons[index];
            return (
              <div key={index} className="relative group h-full">
                <div className="ledger-panel h-full rounded-[28px] p-8 transition-all duration-300 hover:-translate-y-1">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-transform group-hover:scale-110">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden lg:block absolute top-[40px] -right-4 w-8 h-px bg-slate-100" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
