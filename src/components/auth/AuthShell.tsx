import type { ReactNode } from 'react';
import { Bot } from 'lucide-react';
import { AuthFeatureList, type AuthFeature } from '@/components/auth/AuthFeatureList';

type AuthShellProps = {
  panelEyebrow?: string;
  panelTitle: string;
  panelDescription: string;
  children: ReactNode;
  footer?: ReactNode;
  heroEyebrow?: string;
  heroTitle: string;
  heroDescription: string;
  heroFeatures: AuthFeature[];
  heroFooter?: string;
  aside?: ReactNode;
};

type AuthStatusScreenProps = {
  title: string;
  description: string;
};

export function AuthShell({
  panelEyebrow = 'Acceso seguro',
  panelTitle,
  panelDescription,
  children,
  footer,
  heroEyebrow = 'Sistema de gestion ISO 9001',
  heroTitle,
  heroDescription,
  heroFeatures,
  heroFooter,
  aside,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,var(--background)_0%,#f2f7f5_44%,var(--background)_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.09),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(248,250,252,0.72),transparent)]" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1.08fr)_480px] lg:gap-12 lg:px-8 lg:py-10">
        <section className="flex flex-col justify-between rounded-[var(--radius-4xl)] border border-border/70 bg-card/80 p-6 shadow-[var(--shadow-md)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)] border border-primary/20 bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_100%)] text-primary-foreground shadow-[var(--shadow-sm)]">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[0.08em] text-foreground">
                  Don Candido IA
                </p>
                <p className="text-sm text-muted-foreground">
                  Plataforma de gestion operativa y cumplimiento ISO 9001
                </p>
              </div>
            </div>

            <AuthFeatureList
              eyebrow={heroEyebrow}
              title={heroTitle}
              description={heroDescription}
              features={heroFeatures}
              footer={heroFooter}
            />
          </div>

          {aside ? <div className="mt-8 hidden lg:block">{aside}</div> : null}
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[var(--radius-4xl)] border border-border/75 bg-card/95 p-6 shadow-[var(--shadow-md)] backdrop-blur-xl sm:p-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/85">
                {panelEyebrow}
              </p>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-[2rem]">
                  {panelTitle}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  {panelDescription}
                </p>
              </div>
            </div>

            <div className="mt-7">{children}</div>

            {footer ? (
              <div className="mt-6 border-t border-border/80 pt-5 text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

export function AuthStatusScreen({
  title,
  description,
}: AuthStatusScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,var(--background)_0%,#f2f7f5_44%,var(--background)_100%)] px-6">
      <div className="w-full max-w-sm rounded-[var(--radius-4xl)] border border-border/75 bg-card/95 px-8 py-10 text-center shadow-[var(--shadow-md)] backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] border border-primary/15 bg-primary-soft text-primary">
          <Bot className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    </div>
  );
}
