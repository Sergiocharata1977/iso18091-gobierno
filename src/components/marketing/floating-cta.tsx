'use client';

import { useLanguage } from '@/components/marketing/language-context';
import { ArrowDown } from 'lucide-react';
import { useEffect, useState } from 'react';

export function FloatingCTA() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past the ProblemSection (approx 1200px)
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const windowH = window.innerHeight;

      // Show between 20% and 80% of the page
      const percent = scrollY / (docHeight - windowH);
      setVisible(percent > 0.15 && percent < 0.85);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToDemo = () => {
    if (typeof window !== 'undefined') {
      const element = document.getElementById('demo');
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={scrollToDemo}
        className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-none shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
        {t.hero.cta1}
      </button>
    </div>
  );
}
