/**
 * iso18091-gobierno - Defaults de la edicion gobierno local
 *
 * Define que plugins y capabilities estan siempre activos
 * en este deployment dedicado a municipios bajo ISO 18091.
 */

export const GOBIERNO_EDITION_DEFAULT_PLUGINS: string[] = [
  'pack_gov',
  'gov_ciudadano_360',
  'gov_expedientes',
  'gov_service_catalog',
  'gov_transparencia',
  'gov_participacion',
  'gov_maturity_18091',
];

export const GOBIERNO_EDITION_DEFAULT_CAPABILITIES: string[] = [
  'gov_ciudadano_360',
  'gov_expedientes',
  'gov_service_catalog',
  'gov_transparencia',
  'gov_participacion',
  'gov_maturity_18091',
];

/**
 * Capabilities que existen en el codigo pero no se muestran
 * en el nav de la edicion gobierno.
 */
export const GOBIERNO_EDITION_HIDDEN_CAPABILITIES: string[] = [
  'crm',
  'crm_risk_scoring',
  'crm_whatsapp_inbox',
  'dealer_solicitudes',
  'contabilidad_central',
];

export const EDITION = 'government' as const;
export type GobiernoEdition = typeof EDITION;
