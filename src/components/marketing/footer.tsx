'use client';

import { useLanguage } from '@/components/marketing/language-context';
import Link from 'next/link';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 shadow-lg shadow-slate-900/10">
              <span className="font-mono text-xl font-bold text-white">DC</span>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              Don Cándido IA
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8 text-sm font-medium text-slate-500">
            <Link href="/producto" className="hover:text-slate-900 transition-colors">
              Producto
            </Link>
            <Link href="/operacion-real" className="hover:text-slate-900 transition-colors">
              Operacion real
            </Link>
            <Link href="/novedades" className="hover:text-slate-900 transition-colors">
              Novedades
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-sm text-slate-400 font-medium">
            © {new Date().getFullYear()} Don Cándido IA. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
