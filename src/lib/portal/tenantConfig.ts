/**
 * tenantConfig — helpers para resolver configuración pública de tenants.
 *
 * Ola 1C: Portal Público genérico multi-tenant.
 *
 * - Solo se usa en API routes (servidor) — usa Admin SDK.
 * - Cache en memoria (Map) con TTL de 5 minutos para evitar lecturas repetidas.
 * - Si la org no tiene `landing_config` en Firestore, se construye uno con defaults.
 * - Todas las funciones retornan null ante cualquier error (no lanzan).
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  LANDING_CONFIG_DEFAULTS,
  type LandingConfig,
  type TenantPublicConfig,
} from '@/types/portal';

// ---------------------------------------------------------------------------
// Cache en memoria
// ---------------------------------------------------------------------------

interface CacheEntry {
  config: TenantPublicConfig;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Dos índices de cache: uno por slug, otro por API key
const cacheBySlug = new Map<string, CacheEntry>();
const cacheByApiKey = new Map<string, CacheEntry>();

function isFresh(entry: CacheEntry): boolean {
  return Date.now() < entry.expiresAt;
}

function storeInCache(config: TenantPublicConfig): void {
  const entry: CacheEntry = {
    config,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  cacheBySlug.set(config.slug, entry);
  if (config.publicApiKey) {
    cacheByApiKey.set(config.publicApiKey, entry);
  }
}

// ---------------------------------------------------------------------------
// Helpers de normalización
// ---------------------------------------------------------------------------

/**
 * Convierte los datos brutos de Firestore en un LandingConfig completo,
 * usando defaults para los campos ausentes.
 */
function buildLandingConfig(
  rawConfig: Record<string, unknown>,
  orgName: string
): LandingConfig {
  const raw = rawConfig as Partial<LandingConfig>;

  const formTypes = Array.isArray(raw.formTypes)
    ? (raw.formTypes as LandingConfig['formTypes'])
    : LANDING_CONFIG_DEFAULTS.formTypes;

  return {
    primaryColor:
      typeof raw.primaryColor === 'string' && raw.primaryColor.startsWith('#')
        ? raw.primaryColor
        : LANDING_CONFIG_DEFAULTS.primaryColor,
    secondaryColor:
      typeof raw.secondaryColor === 'string' && raw.secondaryColor.startsWith('#')
        ? raw.secondaryColor
        : LANDING_CONFIG_DEFAULTS.secondaryColor,
    orgName:
      typeof raw.orgName === 'string' && raw.orgName.trim().length > 0
        ? raw.orgName.trim()
        : orgName,
    logoUrl:
      typeof raw.logoUrl === 'string' && raw.logoUrl.trim().length > 0
        ? raw.logoUrl.trim()
        : undefined,
    tagline:
      typeof raw.tagline === 'string' && raw.tagline.trim().length > 0
        ? raw.tagline.trim()
        : undefined,
    contactEmail:
      typeof raw.contactEmail === 'string' && raw.contactEmail.trim().length > 0
        ? raw.contactEmail.trim()
        : undefined,
    formTypes,
  };
}

/**
 * Convierte un documento de Firestore `organizations/{orgId}` en TenantPublicConfig.
 * Retorna null si faltan datos mínimos (sin slug ni public_api_key).
 */
function buildTenantConfig(
  orgId: string,
  data: Record<string, unknown>
): TenantPublicConfig | null {
  const slug =
    typeof data.slug === 'string' ? data.slug.toLowerCase().trim() : '';

  if (!slug) return null;

  const publicApiKey =
    typeof data.public_api_key === 'string' ? data.public_api_key.trim() : '';

  const orgName =
    typeof data.nombre === 'string' && data.nombre.trim().length > 0
      ? data.nombre.trim()
      : slug;

  const rawLanding =
    data.landing_config && typeof data.landing_config === 'object'
      ? (data.landing_config as Record<string, unknown>)
      : {};

  const landingConfig = buildLandingConfig(rawLanding, orgName);

  const edition: TenantPublicConfig['edition'] =
    data.edition === 'government' || data.edition === 'enterprise'
      ? data.edition
      : undefined;

  return {
    orgId,
    slug,
    publicApiKey,
    landingConfig,
    edition,
  };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Resuelve la configuración pública de un tenant dado su slug.
 *
 * @param slug - Slug URL-friendly de la org (ej: 'agrobiciufa')
 * @returns TenantPublicConfig o null si no existe / error.
 */
export async function getTenantConfigBySlug(
  slug: string
): Promise<TenantPublicConfig | null> {
  const normalizedSlug = slug.toLowerCase().trim();

  // Revisar cache
  const cached = cacheBySlug.get(normalizedSlug);
  if (cached && isFresh(cached)) {
    return cached.config;
  }

  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('organizations')
      .where('slug', '==', normalizedSlug)
      .where('activo', '==', true)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    const config = buildTenantConfig(doc.id, doc.data() as Record<string, unknown>);

    if (!config) return null;

    storeInCache(config);
    return config;
  } catch (error) {
    console.error('[tenantConfig] getTenantConfigBySlug error:', error);
    return null;
  }
}

/**
 * Resuelve la configuración pública de un tenant dado su API key pública.
 *
 * @param apiKey - Valor del header x-tenant-key
 * @returns TenantPublicConfig o null si no existe / error.
 */
export async function getTenantConfigByApiKey(
  apiKey: string
): Promise<TenantPublicConfig | null> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) return null;

  // Revisar cache
  const cached = cacheByApiKey.get(trimmedKey);
  if (cached && isFresh(cached)) {
    return cached.config;
  }

  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('organizations')
      .where('public_api_key', '==', trimmedKey)
      .where('activo', '==', true)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    const config = buildTenantConfig(doc.id, doc.data() as Record<string, unknown>);

    if (!config) return null;

    storeInCache(config);
    return config;
  } catch (error) {
    console.error('[tenantConfig] getTenantConfigByApiKey error:', error);
    return null;
  }
}
