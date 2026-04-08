'use client';

import { useLanguage } from '@/components/marketing/language-context';
import { AlertCircle, FileWarning, SearchX, Siren } from 'lucide-react';

const icons = [FileWarning, SearchX, Siren, AlertCircle];

export function ProblemSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 lg:py-28 bg-[#fdfbf7] text-slate-900 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight text-slate-900">
              {t.problem.title}
              <br />
              <span className="text-slate-500">{t.problem.subtitle}</span>
            </h2>
            <p className="text-xl text-slate-600 font-light border-l-2 border-slate-400 pl-6">
              {t.problem.footer}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {t.problem.items.map((item, index) => {
              // const Icon = icons[index] || AlertCircle; // Icons commented out for sober look if desired, or kept neutral
              const Icon = icons[index] || AlertCircle;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-none border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <Icon className="w-8 h-8 text-slate-400 mb-4" />
                  <h3 className="text-lg font-bold mb-2 text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
