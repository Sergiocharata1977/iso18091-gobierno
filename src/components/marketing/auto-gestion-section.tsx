'use client';

import { useLanguage } from '@/components/marketing/language-context';
import {
  ArrowRight,
  Bell,
  ChevronRight,
  ScanSearch,
  Users,
} from 'lucide-react';

const stepIcons = [ScanSearch, Bell, Users];
const stepColors = [
  {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    ring: 'ring-emerald-200',
  },
  {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    ring: 'ring-amber-200',
  },
  {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    ring: 'ring-red-200',
  },
];

export function AutoGestionSection() {
  const { t } = useLanguage();

  const scrollToDemo = () => {
    if (typeof window !== 'undefined') {
      const element = document.getElementById('demo');
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-20 lg:py-28 bg-[#fdfbf7] border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {t.autoGestion.title}
          </h2>
          <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
            {t.autoGestion.subtitle}
          </p>
        </div>

        {/* Flow Diagram */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4 mb-16">
          {t.autoGestion.steps.map((step, index) => {
            const Icon = stepIcons[index];
            const colors = stepColors[index];
            return (
              <div key={index} className="flex items-center gap-4">
                <div className="flex flex-col items-center text-center max-w-xs">
                  <div
                    className={`w-20 h-20 ${colors.bg} rounded-2xl flex items-center justify-center mb-4 ring-4 ${colors.ring} shadow-sm`}
                  >
                    <Icon className={`w-10 h-10 ${colors.icon}`} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {step.label}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
                {index < t.autoGestion.steps.length - 1 && (
                  <div className="hidden md:flex items-center px-2">
                    <ChevronRight className="w-8 h-8 text-slate-300" />
                    <ChevronRight className="w-8 h-8 text-slate-400 -ml-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={scrollToDemo}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg rounded-none shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            {t.autoGestion.cta}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
