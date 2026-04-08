'use client';

import { useLanguage } from '@/components/marketing/language-context';
import { Check } from 'lucide-react';

export function ResultsSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 lg:py-28 bg-slate-100 text-slate-900 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900">
          {t.results.title}
        </h2>
        <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
          {t.results.subtitle}
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          {t.results.items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-white px-6 py-3 rounded-full border border-slate-300 shadow-sm"
            >
              <Check className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
