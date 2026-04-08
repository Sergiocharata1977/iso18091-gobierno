export type Edition = 'enterprise' | 'government';

export interface EditionTaxonomy {
  cliente: string;
  oportunidad: string;
  vendedor: string;
  producto: string;
  pipeline: string;
  cuenta: string;
  proveedor: string;
  organizacion: string;
}

export const EDITION_TAXONOMY: Record<Edition, EditionTaxonomy> = {
  enterprise: {
    cliente: 'Cliente',
    oportunidad: 'Oportunidad',
    vendedor: 'Vendedor',
    producto: 'Producto',
    pipeline: 'Pipeline',
    cuenta: 'Cuenta',
    proveedor: 'Proveedor',
    organizacion: 'Organización',
  },
  government: {
    cliente: 'Ciudadano',
    oportunidad: 'Expediente',
    vendedor: 'Agente',
    producto: 'Servicio Público',
    pipeline: 'Mesa de Entradas',
    cuenta: 'Contribuyente',
    proveedor: 'Proveedor',
    organizacion: 'Municipio',
  },
};
