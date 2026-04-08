'use client';

import { useLanguage } from '@/components/marketing/language-context';
import { ArrowRight, Check } from 'lucide-react';

export function PricingSection() {
  const { t } = useLanguage();

  const scrollToDemo = () => {
    if (typeof window !== 'undefined') {
      const element = document.getElementById('demo');
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-20 lg:py-28 bg-white border-t border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          {t.pricing.title}
        </h2>
        <p className="text-xl text-slate-500 mb-10">{t.pricing.subtitle}</p>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {t.pricing.features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-slate-50 px-5 py-2.5 rounded-full border border-slate-200 shadow-sm"
            >
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-slate-700">
                {feature}
              </span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={scrollToDemo}
          className="inline-flex items-center gap-2 px-10 py-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg rounded-none shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
          {t.pricing.cta}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </section>
  );
}
