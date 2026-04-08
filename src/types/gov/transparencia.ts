export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
};

export const TRANSPARENCIA_CATEGORIAS = [
  'presupuesto',
  'compras',
  'actos_administrativos',
  'indicadores_gestion',
] as const;

export type TransparenciaCategoria =
  (typeof TRANSPARENCIA_CATEGORIAS)[number];

export const TRANSPARENCIA_ESTADOS = [
  'borrador',
  'publicado',
  'archivado',
] as const;

export type TransparenciaEstado = (typeof TRANSPARENCIA_ESTADOS)[number];

export interface TransparenciaRegistro {
  id: string;
  organization_id: string;
  codigo: string;
  categoria: TransparenciaCategoria;
  titulo: string;
  resumen: string;
  periodo: string;
  fecha_publicacion: string;
  area_responsable: string;
  monto?: number;
  unidad?: string;
  valor_actual?: number;
  meta?: number;
  url_documento?: string;
  etiquetas: string[];
  publicado: boolean;
  destacado: boolean;
  estado: TransparenciaEstado;
  datos: Record<string, unknown>;
  created_by?: string;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}

export interface TransparenciaRegistroSerialized
  extends Omit<TransparenciaRegistro, 'created_at' | 'updated_at'> {
  created_at: string | null;
  updated_at: string | null;
}
