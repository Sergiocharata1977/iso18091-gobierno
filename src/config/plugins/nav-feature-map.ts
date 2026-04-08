/**
 * Mapa canónico: Plugin ID → Feature IDs del nav estático (navigation.ts)
 *
 * Usado por:
 * - Sidebar.tsx → LEGACY_MODULE_ALIASES (filtra nav por módulos habilitados)
 * - /api/admin/sync-modules → calcula modulos_habilitados desde installed_plugins
 *
 * Cuando se instala un plugin, sus feature IDs se añaden a modulos_habilitados
 * del usuario para que el Sidebar muestre solo los items correspondientes.
 */

/** Features siempre activas (core ISO 9001 — sin plugin). */
export const CORE_NAV_FEATURES: string[] = [
  'noticias',
  'mi-sgc',
  'calendario',
  'planificacion',
  'procesos',
  'puntos-norma',
  'mejoras',
  'rrhh',
  'documentos',
  'dashboard-ejecutivo',
  'admin',
];

/**
 * Mapeo Plugin ID → Feature IDs usados en navigation.ts.
 * Los plugins sin feature gate estático (dynamic-nav only) tienen array vacío.
 */
export const PLUGIN_NAV_FEATURES: Record<string, string[]> = {
  crm: ['crm'],
  crm_risk_scoring: ['crm'],
  crm_whatsapp_inbox: ['crm_whatsapp_inbox'],
  dealer_solicitudes: ['dealer_solicitudes', 'dealer_compras'],

  // Pack HSE y sus sub-plugins comparten el mismo feature gate
  pack_hse: ['pack_hse'],
  iso_environment_14001: ['pack_hse'],
  iso_sst_45001: ['pack_hse'],
  ptw_seguridad: ['pack_hse'],

  // SGSI — cada sección tiene su propio feature gate
  iso_sgsi_27001: [
    'isms_compliance_dashboard',
    'isms_contexto',
    'isms_riesgos',
    'isms_soa',
    'isms_controles',
    'isms_activos',
    'isms_accesos',
    'sec_incident_response',
    'sec_audit_log',
    'isms_proveedores',
    'isms_continuidad',
    'sec_data_classification',
    'sec_vulnerability_mgmt',
    'isms_framework_mapper',
  ],

  // Estos plugins usan nav dinámica — sin feature gate estático
  iso_infrastructure: [],
  iso_design_development: [],
  iso_audit_19011: [],
  contabilidad_central: [],

  // Bundles comerciales (instalan sub-plugins, sin feature gate propio)
  pack_sgsi_plus: [],
  pack_sig_integrado: [],
  pack_gov: [],
};

/**
 * Dada una lista de plugin IDs instalados, retorna el set completo de
 * features que deben estar en modulos_habilitados del usuario.
 * Siempre incluye CORE_NAV_FEATURES.
 */
export function buildModulosHabilitados(installedPluginIds: string[]): string[] {
  const features = new Set<string>(CORE_NAV_FEATURES);
  for (const pluginId of installedPluginIds) {
    const navFeatures = PLUGIN_NAV_FEATURES[pluginId] ?? [];
    navFeatures.forEach(f => features.add(f));
  }
  return Array.from(features);
}
