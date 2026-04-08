import {
  buildBootstrapFeatureFlags,
  buildBootstrapIntegrations,
  buildEffectiveRoleSet,
  getActiveInstalledCapabilities,
} from '@/lib/mobile/operaciones/bootstrap';
import type { InstalledCapability } from '@/types/plugins';

function makeCapability(
  capabilityId: string,
  overrides: Partial<InstalledCapability> = {}
): InstalledCapability {
  return {
    id: capabilityId,
    capability_id: capabilityId,
    system_id: 'mobile_operaciones',
    version_installed: '1.0.0',
    industry_type: null,
    submodules_enabled: [],
    status: 'enabled',
    enabled: true,
    settings: {},
    installed_by: 'user-1',
    installed_at: new Date('2026-03-30T00:00:00.000Z'),
    enabled_at: new Date('2026-03-30T00:00:00.000Z'),
    disabled_at: null,
    updated_at: new Date('2026-03-30T00:00:00.000Z'),
    ...overrides,
  };
}

const supervisorProfile = {
  key: 'supervisor_operativo',
  label: 'Supervisor Operativo',
  can_convert_to_crm: true,
  can_manage_assignments: true,
  can_manage_purchases: true,
};

describe('mobile operaciones bootstrap helpers', () => {
  it('returns only active capabilities plus required mobile capability', () => {
    const result = getActiveInstalledCapabilities([
      makeCapability('crm'),
      makeCapability('legacy_disabled', { enabled: false, status: 'disabled' }),
    ]);

    expect(result.map(item => item.capability_id)).toEqual([
      'crm',
      'dealer_solicitudes',
    ]);
  });

  it('builds default feature flags from active capabilities and profile', () => {
    const flags = buildBootstrapFeatureFlags({
      organizationData: {},
      installedCapabilities: [makeCapability('crm')],
      operationalProfile: supervisorProfile,
    });

    expect(flags).toEqual({
      solicitudes: true,
      evidencias: true,
      compras: true,
      catalogo: true,
      mapa_clientes: true,
      crm_handoff: true,
      offline_sync: true,
    });
  });

  it('honors tenant config overrides but does not enable crm handoff without crm capability', () => {
    const flags = buildBootstrapFeatureFlags({
      organizationData: {
        mobile_operaciones: {
          feature_flags: {
            compras: false,
            crm_handoff: true,
          },
        },
      },
      installedCapabilities: [],
      operationalProfile: supervisorProfile,
    });

    expect(flags.compras).toBe(false);
    expect(flags.crm_handoff).toBe(false);
  });

  it('resolves crm integration from tenant config and keeps conversion gated by profile', () => {
    const integrations = buildBootstrapIntegrations({
      organizationData: {
        integrations: {
          crm_android: {
            enabled: false,
          },
        },
      },
      installedCapabilities: [makeCapability('crm')],
      operationalProfile: {
        ...supervisorProfile,
        can_convert_to_crm: false,
      },
    });

    expect(integrations.crm).toEqual({
      active: false,
      installed: true,
      namespace: '/api/mobile/crm',
      can_convert_from_operaciones: false,
      shared_events: [
        'cliente_actualizado',
        'oportunidad_actualizada',
        'solicitud_convertida_a_oportunidad',
      ],
      source: 'tenant_config',
    });
  });

  it('builds the effective role set with platform and operational roles', () => {
    expect(
      buildEffectiveRoleSet({
        role: 'jefe',
        operationalProfile: supervisorProfile,
      })
    ).toEqual(['jefe', 'supervisor_operativo']);
  });
});
