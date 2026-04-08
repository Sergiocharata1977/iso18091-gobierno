import { ChatWidget } from '@/components/landing/ChatWidget';
import { FloatingCTA } from '@/components/marketing/floating-cta';
import { Footer } from '@/components/marketing/footer';
import { Header } from '@/components/marketing/header';
import { LanguageProvider } from '@/components/marketing/language-context';
import type { ReactNode } from 'react';

export function PublicMarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LanguageProvider>
      <div id="top" className="min-h-screen bg-white">
        <Header />
        <main>{children}</main>
        <Footer />
        <FloatingCTA />
        <ChatWidget position="bottom-right" />
      </div>
    </LanguageProvider>
  );
}
