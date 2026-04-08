/**
 * Design System - Don Cándido 9001App
 *
 * Barrel export centralizado del sistema de diseño.
 * Importar desde aquí para acceso simplificado:
 *
 * @example
 * import { BaseCard, DomainCard, PageHeader, typography, radius } from '@/components/design-system';
 */

// ─── Tokens ──────────────────────────────────────────────
export * from './tokens';

// ─── Primitivas ──────────────────────────────────────────
export * from './primitives';

// ─── Layout ──────────────────────────────────────────────
export * from './layout';

// ─── Patrones ────────────────────────────────────────────
export * from './patterns';

// Enterprise headers
export { PageIntro } from '../ui/PageIntro';
export { SectionIntro } from '../ui/SectionIntro';
