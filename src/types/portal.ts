/**
 * Portal público multi-tenant — tipos compartidos.
 *
 * Ola 1C: Portal Público genérico.
 * Un tenant puede personalizar colores, logo y nombre en su landing/portal público.
 */

export interface LandingConfig {
  /** Color primario en formato hex. Default: '#c8102e' */
  primaryColor: string;
  /** Color secundario en formato hex. Default: '#1a1a1a' */
  secondaryColor: string;
  /** URL pública del logo del tenant. Opcional. */
  logoUrl?: string;
  /** Nombre visible de la organización en el portal. */
  orgName: string;
  /** Tagline o eslogan corto. Opcional. */
  tagline?: string;
  /** Email de contacto visible en el portal. Opcional. */
  contactEmail?: string;
  /** Tipos de formulario habilitados en el portal público. */
  formTypes: Array<'repuestos' | 'servicios' | 'comercial'>;
}

export interface TenantPublicConfig {
  /** ID interno de Firestore de la organización. */
  orgId: string;
  /** Slug URL-friendly de la organización (ej: 'agrobiciufa'). */
  slug: string;
  /** API key pública para el header x-tenant-key. */
  publicApiKey: string;
  /** Configuración visual y funcional del portal. */
  landingConfig: LandingConfig;
  /**
   * Edición del producto. 'government' activa el portal municipal ISO 18091.
   * Si no está definido, se asume 'enterprise'.
   */
  edition?: 'enterprise' | 'government';
}

/** Defaults cuando la org no tiene landing_config configurada. */
export const LANDING_CONFIG_DEFAULTS: Omit<LandingConfig, 'orgName'> = {
  primaryColor: '#c8102e',
  secondaryColor: '#1a1a1a',
  formTypes: ['repuestos', 'servicios', 'comercial'],
};
