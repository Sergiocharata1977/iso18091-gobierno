import type { LucideIcon } from 'lucide-react';

type AuthFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: 'default' | 'success' | 'warning';
};

type AuthFeatureListProps = {
  eyebrow?: string;
  title: string;
  description: string;
  features: AuthFeature[];
  footer?: string;
};

const toneClasses: Record<NonNullable<AuthFeature['tone']>, string> = {
  default:
    'border-border bg-card text-primary shadow-[var(--shadow-xs)]',
  success:
    'border-primary/20 bg-primary-soft text-primary shadow-[var(--shadow-xs)]',
  warning:
    'border-warning/25 bg-warning-soft text-warning-foreground shadow-[var(--shadow-xs)]',
};

export function AuthFeatureList({
  eyebrow,
  title,
  description,
  features,
  footer,
}: AuthFeatureListProps) {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/85">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2.5">
          <h1 className="max-w-xl text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl xl:text-[2.75rem]">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
      </div>

      <div className="grid gap-3.5">
        {features.map(feature => {
          const Icon = feature.icon;

          return (
            <div
              key={feature.title}
              className="rounded-[var(--radius-xl)] border border-border/80 bg-card/90 p-4 backdrop-blur-sm"
            >
              <div className="flex items-start gap-4">
                <div
                  className={[
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border',
                    toneClasses[feature.tone ?? 'default'],
                  ].join(' ')}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    {feature.title}
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground/95">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {footer ? (
        <div className="rounded-[var(--radius-xl)] border border-border/80 bg-card/90 px-5 py-4 text-sm leading-6 text-muted-foreground shadow-[var(--shadow-xs)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export type { AuthFeature };
