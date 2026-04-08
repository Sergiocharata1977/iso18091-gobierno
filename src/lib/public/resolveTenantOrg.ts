import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextRequest } from 'next/server';

// Resuelve el orgId buscando por slug en Firestore.
// Prioridad: slug explícito > query ?tenant= > env var DEALER_PUBLIC_ORGANIZATION_ID
export async function resolveOrgIdBySlug(slug: string): Promise<string | null> {
  const db = getAdminFirestore();
  const snap = await db
    .collection('organizations')
    .where('slug', '==', slug.toLowerCase().trim())
    .where('activo', '==', true)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function resolvePublicOrgId(
  request: NextRequest,
  explicitSlug?: string | null
): Promise<string | null> {
  const slug =
    explicitSlug?.trim() ||
    request.nextUrl.searchParams.get('tenant')?.trim() ||
    null;

  if (slug) return resolveOrgIdBySlug(slug);

  // Fallback backward-compat con env var
  const envId = (process.env.DEALER_PUBLIC_ORGANIZATION_ID || '').trim();
  return envId || null;
}
