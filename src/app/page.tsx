'use client';

import { ChatWidget } from '@/components/landing/ChatWidget';
import { AgenticStrengthsSection } from '@/components/marketing/agentic-strengths-section';
import { AICapabilitiesSection } from '@/components/marketing/ai-capabilities-section';
import { ArchitectureSection } from '@/components/marketing/architecture-section';
import { Benefits } from '@/components/marketing/benefits';
import { DemoForm } from '@/components/marketing/demo-form';
import { EcosystemShowcaseSection } from '@/components/marketing/ecosystem-showcase-section';
import { ExplorePagesSection } from '@/components/marketing/explore-pages-section';
import { FloatingCTA } from '@/components/marketing/floating-cta';
import { Footer } from '@/components/marketing/footer';
import { Header } from '@/components/marketing/header';
import { HeroSection } from '@/components/marketing/hero-section';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { LanguageProvider } from '@/components/marketing/language-context';
import { ProposalSection } from '@/components/marketing/proposal-section';
import { useAuth } from '@/contexts/AuthContext';
import { resolvePostLoginRoute } from '@/lib/auth/postLoginRouting';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push(resolvePostLoginRoute(user));
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <div id="top" className="min-h-screen bg-white">
        <Header />
        <main className="overflow-hidden">
          <HeroSection />
          <AgenticStrengthsSection />
          <EcosystemShowcaseSection />
          <Benefits />
          <ProposalSection />
          <HowItWorks />
          <AICapabilitiesSection />
          <ArchitectureSection />
          <ExplorePagesSection />
          <DemoForm />
        </main>
        <Footer />
        {!user && <FloatingCTA />}
        {!user && <ChatWidget position="bottom-right" />}
      </div>
    </LanguageProvider>
  );
}
