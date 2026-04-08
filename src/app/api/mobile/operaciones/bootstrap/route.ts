import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  buildOperationalProfile,
  mobileErrorResponse,
  mobileSuccessResponse,
  resolveMobileOrganizationId,
  withMobileOperacionesAuth,
} from '@/lib/mobile/operaciones/contracts';
import {
  buildBootstrapFeatureFlags,
  buildBootstrapIntegrations,
  buildEffectiveRoleSet,
  getActiveInstalledCapabilities,
} from '@/lib/mobile/operaciones/bootstrap';
import type { InstalledCapability } from '@/types/plugins';

export const dynamic = 'force-dynamic';

function sortStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function normalizeInstalledCapability(
  id: string,
  data: Record<string, unknown>
): InstalledCapability {
  return {
    id,
    capability_id:
      typeof data.capability_id === 'string' ? data.capability_id : id,
    system_id: typeof data.system_id === 'string' ? data.system_id : 'iso9001',
    version_installed:
      typeof data.version_installed === 'string'
        ? data.version_installed
        : '1.0.0',
    industry_type:
      typeof data.industry_type === 'string' ? data.industry_type : null,
    submodules_enabled: Array.isArray(data.submodules_enabled)
      ? data.submodules_enabled.filter(
          (value): value is string => typeof value === 'string'
        )
      : [],
    status:
      data.status === 'enabled' ||
      data.status === 'installed' ||
      data.status === 'disabled' ||
      data.status === 'uninstalled'
        ? data.status
        : 'installed',
    enabled: Boolean(data.enabled),
    settings:
      data.settings && typeof data.settings === 'object'
        ? (data.settings as Record<string, unknown>)
        : {},
    installed_by:
      typeof data.installed_by === 'string' ? data.installed_by : 'unknown',
    installed_at: new Date(),
    enabled_at: null,
    disabled_at: null,
    updated_at: new Date(),
  };
}

export const GET = withMobileOperacionesAuth(
  async (request, _context, auth) => {
    try {
      const requestedOrganizationId =
        request.nextUrl.searchParams.get('organization_id') ||
        request.nextUrl.searchParams.get('organizationId');
      const organizationScope = await resolveMobileOrganizationId(
        auth,
        requestedOrganizationId
      );

      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const db = getAdminFirestore();
      const organizationId = organizationScope.organizationId;
      const [organizationDoc, installedCapabilitiesSnapshot] = await Promise.all([
        db.collection('organizations').doc(organizationId).get(),
        db
          .collection('organizations')
          .doc(organizationId)
          .collection('installed_capabilities')
          .get(),
      ]);

      const organizationData = organizationDoc.exists
        ? (organizationDoc.data() as Record<string, unknown>)
        : {};
      const installedCapabilities = installedCapabilitiesSnapshot.docs.map(doc =>
        normalizeInstalledCapability(doc.id, doc.data() as Record<string, unknown>)
      );
      const activeInstalledCapabilities = getActiveInstalledCapabilities(
        installedCapabilities
      );
      const activeCapabilityIds = sortStrings(
        activeInstalledCapabilities.map(capability => capability.capability_id)
      );
      const operationalProfile = buildOperationalProfile({
        role: auth.role,
        permissions: auth.permissions,
      });
      const effectiveRoles = buildEffectiveRoleSet({
        role: auth.role,
        operationalProfile,
      });
      const featureFlags = buildBootstrapFeatureFlags({
        organizationData,
        installedCapabilities,
        operationalProfile,
      });
      const integrations = buildBootstrapIntegrations({
        organizationData,
        installedCapabilities,
        operationalProfile,
      });

      return mobileSuccessResponse(
        {
          user: {
            id: auth.uid,
            email: auth.email,
            role: auth.role,
            permissions: sortStrings(auth.permissions),
            personnel_id: auth.user.personnel_id,
            status: auth.user.status,
          },
          organization: {
            id: organizationId,
            name:
              typeof organizationData.name === 'string'
                ? organizationData.name
                : typeof organizationData.nombre === 'string'
                  ? organizationData.nombre
                  : organizationId,
            slug:
              typeof organizationData.slug === 'string'
                ? organizationData.slug
                : null,
            tenant_type:
              typeof organizationData.tenant_type === 'string'
                ? organizationData.tenant_type
                : null,
          },
          operational_profile: operationalProfile,
          roles: {
            platform_role: auth.role,
            operational_profile: operationalProfile.key,
            effective_roles: effectiveRoles,
          },
          effective_access: {
            web_role: auth.role,
            operational_profile: operationalProfile.key,
            effective_roles: effectiveRoles,
            effective_permissions: sortStrings(auth.permissions),
            installed_capabilities: activeCapabilityIds,
          },
          feature_flags: featureFlags,
          modules: [
            { key: 'solicitudes', enabled: featureFlags.solicitudes },
            { key: 'evidencias', enabled: featureFlags.evidencias },
            { key: 'compras', enabled: featureFlags.compras },
            { key: 'catalogo', enabled: featureFlags.catalogo },
            { key: 'mapa_clientes', enabled: featureFlags.mapa_clientes },
          ].filter(module => module.enabled),
          integrations,
        },
        {
          organization_id: organizationId,
        },
        { includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/operaciones/bootstrap] GET error:', error);
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo construir el bootstrap operativo.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);
