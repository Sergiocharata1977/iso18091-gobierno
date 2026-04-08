export interface AnalisisFODA {
  id: string;
  organization_id: string;
  codigo: string; // Ej: "FODA-2025-Q1"
  titulo: string;
  descripcion?: string;
  tipo_analisis: 'organizacional' | 'proceso' | 'departamento' | 'proyecto';
  ambito_id?: string; // ID del proceso/departamento/proyecto
  ambito_nombre?: string;
  fecha_analisis: string;
  fecha_proxima_revision?: string;
  responsable_id: string;
  responsable_nombre?: string;
  participantes: Array<{
    usuario_id: string;
    usuario_nombre: string;
    rol?: string;
  }>;
  fortalezas: Array<{
    descripcion: string;
    impacto: 'bajo' | 'medio' | 'alto';
    acciones_asociadas?: string[]; // IDs de acciones de mejora
  }>;
  oportunidades: Array<{
    descripcion: string;
    impacto: 'bajo' | 'medio' | 'alto';
    probabilidad: 'baja' | 'media' | 'alta';
    acciones_asociadas?: string[];
  }>;
  debilidades: Array<{
    descripcion: string;
    impacto: 'bajo' | 'medio' | 'alto';
    acciones_asociadas?: string[];
  }>;
  amenazas: Array<{
    descripcion: string;
    impacto: 'bajo' | 'medio' | 'alto';
    probabilidad: 'baja' | 'media' | 'alta';
    acciones_asociadas?: string[];
  }>;
  matriz_priorizacion?: Array<{
    categoria: 'FO' | 'DO' | 'FA' | 'DA';
    item_id: string; // Referencia a fortaleza/oportunidad/debilidad/amenaza
    prioridad: number; // 1-10
    estrategia?: string;
  }>;
  estado: 'en_proceso' | 'completado' | 'archivado';
  documento_url?: string;
  adjuntos?: { nombre: string; url: string }[];
  createdAt: string;
  updatedAt: string;
  created_by?: string;
  isActive?: boolean;
}

export interface CreateAnalisisFODAData {
  codigo: string;
  titulo: string;
  descripcion?: string;
  tipo_analisis: string;
  ambito_id?: string;
  fecha_analisis: string;
  fecha_proxima_revision?: string;
  responsable_id: string;
  participantes?: Array<{ usuario_id: string; rol?: string }>;
  fortalezas?: Array<{ descripcion: string; impacto: string }>;
  oportunidades?: Array<{
    descripcion: string;
    impacto: string;
    probabilidad: string;
  }>;
  debilidades?: Array<{ descripcion: string; impacto: string }>;
  amenazas?: Array<{
    descripcion: string;
    impacto: string;
    probabilidad: string;
  }>;
  estado?: string;
}

export interface UpdateAnalisisFODAData
  extends Partial<CreateAnalisisFODAData> {
  id: string;
  matriz_priorizacion?: Array<{
    categoria: string;
    item_id: string;
    prioridad: number;
    estrategia?: string;
  }>;
  documento_url?: string;
  adjuntos?: { nombre: string; url: string }[];
}

export type TipoAnalisisFODA =
  | 'organizacional'
  | 'proceso'
  | 'departamento'
  | 'proyecto';
export type ImpactoFODA = 'bajo' | 'medio' | 'alto';
export type ProbabilidadFODA = 'baja' | 'media' | 'alta';
export type CategoriaMatriz = 'FO' | 'DO' | 'FA' | 'DA';
export type EstadoAnalisisFODA = 'en_proceso' | 'completado' | 'archivado';
