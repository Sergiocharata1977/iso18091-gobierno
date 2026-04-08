import Link from 'next/link';
import type { ReactNode } from 'react';

type GobiernoLayoutProps = {
  children: ReactNode;
};

export default function GobiernoLayout({
  children,
}: GobiernoLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          <Link
            href="/gobierno"
            className="text-lg font-semibold tracking-tight text-[#1e3a5f]"
          >
            Don Candido
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-full border border-[#1e3a5f]/15 bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] transition hover:border-[#2563eb]/40 hover:text-[#2563eb]"
          >
            Iniciar sesion
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 text-center text-sm text-slate-500 lg:px-8">
          © 2026 Don Candido IA · Gobierno Local
        </div>
      </footer>
    </div>
  );
}
