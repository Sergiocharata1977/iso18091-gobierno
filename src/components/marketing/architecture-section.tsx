'use client';

import { useLanguage } from '@/components/marketing/language-context';
import { Lock, ScanEye, ShieldCheck } from 'lucide-react';

const featureIcons = [Lock, ScanEye, ShieldCheck];

export function ArchitectureSection() {
  const { t } = useLanguage();

  return (
    <section className="ledger-shell border-t border-slate-200 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="ledger-panel mb-16 rounded-[32px] px-6 py-8 text-center md:px-10">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/70 bg-white shadow-sm">
            <ShieldCheck className="w-8 h-8 text-slate-800" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {t.architecture.title}
          </h2>
          <h3 className="text-xl sm:text-2xl font-semibold text-slate-500 mb-6">
            {t.architecture.subtitle}
          </h3>
          <p className="text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto text-pretty">
            {t.architecture.description}
          </p>
        </div>

        {/* Feature Cards */}
        {t.architecture.features && (
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {t.architecture.features.map((feature, index) => {
              const Icon = featureIcons[index] || ShieldCheck;
              return (
                <div
                  key={index}
                  className="ledger-panel rounded-[28px] p-8 text-center"
                >
                  <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                    <Icon className="w-6 h-6 text-slate-700" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
