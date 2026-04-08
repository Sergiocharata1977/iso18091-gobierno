import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import {
  ensureTenantSetupCapabilities,
  normalizeTenantType,
} from '@/lib/onboarding/validatePhase';
import type { OrganizationRecord } from '@/types/organization';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
  try {
    const db = getAdminFirestore();
    const orgsSnapshot = await db.collection('organizations').get();
    let crmByOrganization = new Map<
      string,
      { installed: boolean; enabled: boolean; status: string }
    >();

    try {
      const crmSnapshot = await db
        .collectionGroup('installed_capabilities')
        .where('capability_id', '==', 'crm')
        .get();

      crmByOrganization = new Map(
        crmSnapshot.docs.map(doc => {
          const data = doc.data();
          return [
            doc.ref.parent.parent?.id || '',
            {
              installed: true,
              enabled: Boolean(data.enabled),
              status:
                typeof data.status === 'string' ? data.status : 'installed',
            },
          ];
        })
      );
    } catch (crmError) {
      console.error(
        '[super-admin/organizations] No se pudo cargar estado CRM, se continua sin ese dato:',
        crmError
      );
    }

    const organizations = orgsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      const tenantType = normalizeTenantType(data.tenant_type ?? data.tenantType);

      return {
        id: doc.id,
        ...data,
        tenant_type: tenantType ?? data.tenant_type ?? data.tenantType ?? null,
        tenantType: tenantType ?? data.tenant_type ?? data.tenantType ?? null,
        crm: crmByOrganization.get(doc.id) || {
          installed: false,
          enabled: false,
          status: 'uninstalled',
        },
      };
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Error al obtener organizaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener organizaciones' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const POST = withAuth(async (request, _context, auth) => {
  try {
    const db = getAdminFirestore();
    const data = await request.json();

    if (!data.name || !data.plan) {
      return NextResponse.json(
        { error: 'Nombre y plan son requeridos' },
        { status: 400 }
      );
    }

    const tenantType =
      normalizeTenantType(data.tenant_type ?? data.tenantType) || 'iso_puro';
    const orgId = `org_${data.name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')}`;

    const orgData: OrganizationRecord = {
      id: orgId,
      name: data.name,
      plan: data.plan || 'free',
      ai_plan_id:
        typeof data.ai_plan_id === 'string' && data.ai_plan_id.trim().length > 0
          ? data.ai_plan_id.trim()
          : undefined,
      ai_plan_override:
        data.ai_plan_override && typeof data.ai_plan_override === 'object'
          ? data.ai_plan_override
          : undefined,
      tenant_type: tenantType,
      tenantType,
      settings: {
        timezone: data.timezone || 'America/Argentina/Buenos_Aires',
        currency: data.currency || 'ARS',
        language: data.language || 'es',
      },
      features: {
        private_sections: data.features?.private_sections ?? true,
        ai_assistant: data.features?.ai_assistant ?? true,
        max_users: data.features?.max_users ?? 50,
      },
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection('organizations').doc(orgId).set(orgData);

    const capabilitySetup = await ensureTenantSetupCapabilities({
      orgId,
      adminDb: db,
      userId: auth.uid,
      tenantType,
    });

    return NextResponse.json(
      {
        organization: orgData,
        tenantSetup: {
          tenant_type: capabilitySetup.tenantType,
          crm_auto_installed: capabilitySetup.crmInstalled,
          crm_already_installed: capabilitySetup.crmAlreadyInstalled,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear organizacion:', error);
    return NextResponse.json(
      { error: 'Error al crear organizacion' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
