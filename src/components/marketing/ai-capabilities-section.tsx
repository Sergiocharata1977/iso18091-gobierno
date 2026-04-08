'use client';

import { useLanguage } from '@/components/marketing/language-context';
import { Bot, ClipboardCheck, FileText, Zap } from 'lucide-react';

const icons = [Bot, ClipboardCheck, FileText, Zap];
const gradients = [
  'from-emerald-500/10 to-teal-500/10',
  'from-blue-500/10 to-indigo-500/10',
  'from-amber-500/10 to-orange-500/10',
  'from-violet-500/10 to-purple-500/10',
];
const iconColors = [
  'text-emerald-600',
  'text-blue-600',
  'text-amber-600',
  'text-violet-600',
];
const borderAccents = [
  'hover:border-emerald-300',
  'hover:border-blue-300',
  'hover:border-amber-300',
  'hover:border-violet-300',
];

export function AICapabilitiesSection() {
  const { t } = useLanguage();

  return (
    <section className="ledger-shell border-t border-slate-200 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="ledger-panel mb-16 rounded-[32px] px-6 py-8 text-center md:px-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {t.aiCapabilities.title}
          </h2>
          <p className="text-xl text-slate-500 font-semibold max-w-2xl mx-auto">
            {t.aiCapabilities.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.aiCapabilities.items.map((item, index) => {
            const Icon = icons[index] || Bot;
            return (
              <div
                key={index}
                className={`ledger-panel rounded-[28px] p-8 ${borderAccents[index]} transition-all duration-300 group`}
              >
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${gradients[index]} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className={`w-7 h-7 ${iconColors[index]}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
