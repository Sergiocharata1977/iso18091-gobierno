export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
};

export const NORMATIVA_TIPOS = [
  'ordenanza',
  'decreto',
  'resolucion',
  'disposicion',
] as const;

export type NormativaTipo = (typeof NORMATIVA_TIPOS)[number];

export const NORMATIVA_ESTADOS = [
  'borrador',
  'vigente',
  'derogada',
  'archivada',
] as const;

export type NormativaEstado = (typeof NORMATIVA_ESTADOS)[number];

export interface NormativaMunicipal {
  id: string;
  organization_id: string;
  tipo: NormativaTipo;
  numero: string;
  anio: number;
  titulo: string;
  resumen: string;
  estado: NormativaEstado;
  fecha_sancion?: FirestoreTimestamp;
  fecha_promulgacion?: FirestoreTimestamp;
  fecha_publicacion?: FirestoreTimestamp;
  area_responsable_id?: string;
  area_responsable_nombre?: string;
  emisor?: string;
  tema_tags?: string[];
  documento_url?: string;
  expediente_relacionado_id?: string;
  observaciones?: string;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}
