import type { Edition } from '@/types/edition';

export type EditionTaxonomy = {
  cliente: string;
  clientes: string;
  oportunidad: string;
  organizacion: string;
  vendedor: string;
  pipeline: string;
};

export const EDITION_TAXONOMY: Record<Edition, EditionTaxonomy> = {
  enterprise: {
    cliente: 'Cliente',
    clientes: 'Clientes',
    oportunidad: 'Oportunidad',
    organizacion: 'Mi empresa',
    vendedor: 'Vendedor',
    pipeline: 'Pipeline',
  },
  government: {
    cliente: 'Ciudadano',
    clientes: 'Ciudadanos',
    oportunidad: 'Expediente',
    organizacion: 'Municipio',
    vendedor: 'Agente',
    pipeline: 'Mesa de Entradas',
  },
};

export function getEditionTaxonomy(edition?: string): EditionTaxonomy {
  return EDITION_TAXONOMY[edition as Edition] ?? EDITION_TAXONOMY.enterprise;
}

export function getEditionLabel(edition?: string): string {
  return edition === 'government' ? 'Gobierno Local' : '';
}
