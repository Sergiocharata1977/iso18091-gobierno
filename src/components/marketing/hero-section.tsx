'use client';

import { HeroCarousel } from '@/components/marketing/hero-carousel';
import { useLanguage } from '@/components/marketing/language-context';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="ledger-shell relative overflow-hidden border-b border-slate-200 pt-24 pb-20 lg:pt-32 lg:pb-24">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="ledger-panel grid items-center gap-12 rounded-[32px] px-6 py-8 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-12">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              {t.hero.badge}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
              {t.hero.title}
            </h1>

            <p className="text-lg md:text-xl text-slate-700 leading-relaxed text-pretty max-w-2xl border-l-4 border-amber-400 pl-6 py-2">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                asChild
                size="lg"
                className="ledger-primary-button w-full rounded-xl border-0 px-8 py-6 text-lg font-semibold sm:w-auto"
              >
                <Link href="/#demo">{t.hero.cta1}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-8 py-6 text-lg border-slate-300 text-slate-700 bg-transparent hover:bg-slate-100 transition-all font-semibold rounded-none"
              >
                <Link href="/producto">Ver modulos</Link>
              </Button>
            </div>

            {t.hero.trust && (
              <div className="grid sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200">
                {t.hero.trust.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-base font-medium text-slate-700"
                  >
                    <CheckCircle2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative lg:h-[600px] flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[650px]">
              <HeroCarousel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
