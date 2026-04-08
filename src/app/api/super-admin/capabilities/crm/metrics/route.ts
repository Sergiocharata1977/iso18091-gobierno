import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

type OrganizationRecord = {
  id: string;
  name: string;
  status: string;
};

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
  try {
    const db = getAdminFirestore();
    const orgsSnapshot = await db.collection('organizations').get();

    const organizations: OrganizationRecord[] = orgsSnapshot.docs.map(doc => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        name: String(data.name || doc.id),
        status: String(data.status || 'unknown'),
      };
    });

    const metrics = await Promise.all(
      organizations.map(async organization => {
        const crmInstallDoc = await db
          .collection('organizations')
          .doc(organization.id)
          .collection('installed_capabilities')
          .doc('crm')
          .get();

        if (!crmInstallDoc.exists) {
          return {
            ...organization,
            crmInstalled: false,
            clientesCount: 0,
            activeOpportunitiesCount: 0,
          };
        }

        const [clientesSnapshot, oportunidadesSnapshot] = await Promise.all([
          db
            .collection('crm_organizaciones')
            .where('organization_id', '==', organization.id)
            .where('isActive', '==', true)
            .count()
            .get(),
          db
            .collection('crm_oportunidades')
            .where('organization_id', '==', organization.id)
            .where('isActive', '==', true)
            .count()
            .get(),
        ]);

        return {
          ...organization,
          crmInstalled: true,
          clientesCount: clientesSnapshot.data().count,
          activeOpportunitiesCount: oportunidadesSnapshot.data().count,
        };
      })
    );

    const installedTenants = metrics
      .filter(metric => metric.crmInstalled)
      .sort((a, b) => {
        if (b.activeOpportunitiesCount !== a.activeOpportunitiesCount) {
          return b.activeOpportunitiesCount - a.activeOpportunitiesCount;
        }
        if (b.clientesCount !== a.clientesCount) {
          return b.clientesCount - a.clientesCount;
        }
        return a.name.localeCompare(b.name, 'es');
      });

    const organizationsUsingCrm = installedTenants.length;
    const totalOrganizations = organizations.length;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalOrganizations,
          organizationsUsingCrm,
          adoptionRate:
            totalOrganizations > 0
              ? Math.round((organizationsUsingCrm / totalOrganizations) * 100)
              : 0,
          totalClientes: installedTenants.reduce(
            (sum, tenant) => sum + tenant.clientesCount,
            0
          ),
          totalActiveOpportunities: installedTenants.reduce(
            (sum, tenant) => sum + tenant.activeOpportunitiesCount,
            0
          ),
        },
        tenants: installedTenants,
      },
    });
  } catch (error) {
    console.error('[super-admin/capabilities/crm/metrics][GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudieron cargar las metricas de adopcion CRM',
      },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
