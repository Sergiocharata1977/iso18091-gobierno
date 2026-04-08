import { getAdminFirestore } from '@/lib/firebase/admin';
import { getTenantConfigBySlug } from '@/lib/portal/tenantConfig';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 300;

function isActiveCapability(data: Record<string, unknown>) {
  return data.activo === true || data.enabled === true || data.status === 'enabled';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  if (!slug || slug.length > 60) {
    return NextResponse.json(
      { success: false, error: 'Slug invalido' },
      { status: 400 }
    );
  }

  // Resolver config del tenant (incluye landing_config + defaults)
  const tenantConfig = await getTenantConfigBySlug(slug);
  if (!tenantConfig) {
    return NextResponse.json(
      { success: false, error: 'Organizacion no encontrada' },
      { status: 404 }
    );
  }

  const { orgId, landingConfig, edition } = tenantConfig;

  const db = getAdminFirestore();
  const orgRef = db.collection('organizations').doc(orgId);

  const [legacyCapsSnap, installedCapsSnap] = await Promise.all([
    orgRef.collection('capabilities').get(),
    orgRef.collection('installed_capabilities').get(),
  ]);

  const features = Array.from(
    new Set(
      [...legacyCapsSnap.docs, ...installedCapsSnap.docs]
        .filter(doc => isActiveCapability(doc.data() as Record<string, unknown>))
        .map(doc => doc.id)
    )
  );

  return NextResponse.json({
    success: true,
    data: {
      slug,
      orgId,
      nombre: landingConfig.orgName,
      // Mantener campos legacy para compatibilidad con clientes existentes
      color_primario: landingConfig.primaryColor,
      logo_url: landingConfig.logoUrl ?? null,
      features,
      // Nueva sección: configuración completa del portal
      landingConfig,
      // Edición del producto (enterprise | government)
      edition: edition ?? null,
    },
  });
}
