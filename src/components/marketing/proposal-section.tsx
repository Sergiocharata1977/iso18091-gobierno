'use client';

import { useLanguage } from '@/components/marketing/language-context';
import { Check } from 'lucide-react';

export function ProposalSection() {
  const { t } = useLanguage();

  return (
    <section className="ledger-shell py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="ledger-panel mx-auto mb-16 max-w-4xl rounded-[32px] px-6 py-8 text-center md:px-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {t.proposal.title}
            <span className="block text-slate-500 mt-2">
              {t.proposal.subtitle}
            </span>
          </h2>
          <p className="text-lg text-slate-600 mt-6">
            {t.proposal.explanation}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {t.proposal.items.map((item, index) => (
            <div
              key={index}
              className="ledger-panel flex items-center gap-4 rounded-[24px] p-6 transition-colors"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                <Check className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-slate-800 font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
