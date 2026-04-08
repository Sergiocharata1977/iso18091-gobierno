import { getAdminFirestore } from '@/lib/firebase/admin';
import type { PlatformCapability } from '@/types/plugins';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 300;

const TIER_ORDER: Record<string, number> = {
  base: 0,
  opcional: 1,
  premium: 2,
  government: 3,
};

type PublicCapability = Omit<PlatformCapability, 'manifest'> & {
  manifest?: Omit<PlatformCapability['manifest'], 'navigation'>;
};

function toPublicCapability(
  docId: string,
  data: Partial<PlatformCapability>
): PublicCapability {
  const { manifest, ...rest } = data;
  const { navigation: _nav, ...safeManifest } = manifest || {};

  return {
    ...rest,
    id: docId,
    manifest: safeManifest as PublicCapability['manifest'],
  } as PublicCapability;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tierFilter = searchParams.get('tier') || undefined;
    const systemIdFilter = searchParams.get('system_id') || undefined;

    const db = getAdminFirestore();
    const snapshot = await db.collection('platform_capabilities').get();

    let capabilities: PublicCapability[] = snapshot.docs.map(doc =>
      toPublicCapability(doc.id, doc.data() as Partial<PlatformCapability>)
    );

    capabilities = capabilities.filter(
      cap => cap.status === 'active' || cap.status === 'available'
    );

    if (tierFilter) {
      capabilities = capabilities.filter(cap => cap.tier === tierFilter);
    }

    if (systemIdFilter) {
      capabilities = capabilities.filter(cap => {
        const systemIds = Array.isArray(cap.system_ids) ? cap.system_ids : [];
        return systemIds.includes('*') || systemIds.includes(systemIdFilter);
      });
    }

    capabilities.sort((a, b) => {
      const tierA = TIER_ORDER[a.tier] ?? 99;
      const tierB = TIER_ORDER[b.tier] ?? 99;
      if (tierA !== tierB) return tierA - tierB;
      return String(a.name || '').localeCompare(String(b.name || ''), 'es');
    });

    return NextResponse.json({ success: true, data: capabilities });
  } catch (error) {
    console.error('[public/capabilities GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo obtener el catalogo de capabilities' },
      { status: 500 }
    );
  }
}
