export const typography = {
  // ─── Headings ──────────────────────────────────
  h1: 'text-3xl font-bold tracking-tight',
  h2: 'text-2xl font-semibold tracking-tight',
  h3: 'text-xl font-semibold tracking-tight',

  // ─── Body ──────────────────────────────────────
  p: 'text-sm text-muted-foreground',
  small: 'text-xs font-medium leading-none',

  // ─── KPI / Financial Display ───────────────────
  /** Large display number — e.g. "U$D 2.400.000" */
  display: 'text-4xl font-bold tracking-tight',
  /** Medium stat number — e.g. "1/12" or "58%" */
  stat: 'text-2xl font-semibold',
  /** Uppercase label — e.g. "VALOR CERRADO DEL BOLETO" */
  label: 'text-xs font-medium uppercase tracking-wider text-muted-foreground',
  /** Inline KPI value — header context */
  kpiValue: 'text-base font-semibold',
  /** Inline KPI label */
  kpiLabel: 'text-xs text-muted-foreground',
};
