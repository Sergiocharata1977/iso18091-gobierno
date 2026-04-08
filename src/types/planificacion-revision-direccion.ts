/**
 * Planificación y Revisión por la Dirección - REGISTRO UNIFICADO VERSIONADO
 * Consolida toda la información de Configuración Organizacional + Políticas
 * Versionado por fecha con historial
 */

// ===== IDENTIDAD ORGANIZACIONAL =====
export interface IdentidadOrganizacional {
  NOMBRE_ORGANIZACION: string;
  SECTOR: string;
  DESCRIPCION: string;
  TOTAL_EMPLEADOS: number;
  EMPLEADOS_CON_ACCESO: number;
  MISION: string;
  VISION: string;
}

// ===== ALCANCE DEL SGC =====
export interface AlcanceSGC {
  DESCRIPCION: string;
  LIMITES: string;
  PRODUCTOS_SERVICIOS: Array<{
    nombre: string;
    descripcion: string;
    tipo: 'producto' | 'servicio';
  }>;
  UBICACIONES: Array<{
    nombre: string;
    direccion?: string;
    tipo: 'sede_principal' | 'sucursal' | 'planta' | 'almacen' | 'oficina';
  }>;
}

// ===== CONTEXTO ORGANIZACIONAL =====
export interface Contexto {
  FECHA_ANALISIS: string;
  FRECUENCIA_REVISION: 'trimestral' | 'semestral' | 'anual';
  CUESTIONES_EXTERNAS: Array<{
    tipo:
      | 'economico'
      | 'tecnologico'
      | 'competitivo'
      | 'mercado'
      | 'cultural'
      | 'social'
      | 'legal'
      | 'ambiental';
    descripcion: string;
    impacto: 'positivo' | 'negativo' | 'neutral';
    nivel_impacto: 'bajo' | 'medio' | 'alto';
    ambito: 'internacional' | 'nacional' | 'regional' | 'local';
  }>;
  CUESTIONES_INTERNAS: Array<{
    tipo:
      | 'valores'
      | 'cultura'
      | 'conocimientos'
      | 'desempeño'
      | 'recursos'
      | 'capacidades'
      | 'estructura';
    descripcion: string;
    estado_actual: string;
    fortaleza_debilidad: 'fortaleza' | 'debilidad';
  }>;
}

// ===== ESTRUCTURA ORGANIZACIONAL =====
export interface Estructura {
  ORGANIGRAMA_URL?: string;
  OTROS_DATOS?: string;
}

// ===== POLÍTICA (individual) =====
export interface Politica {
  id: string;
  codigo: string; // Ej: "POL-QMS-001"
  titulo: string;
  descripcion: string;
  contenido?: string;
  proposito?: string;
  alcance?: string;
  version: string;
  fecha_aprobacion?: string;
  fecha_revision?: string;
  fecha_proxima_revision?: string;
  aprobador_id?: string;
  aprobador_nombre?: string;
  estado: 'borrador' | 'en_revision' | 'vigente' | 'obsoleta';
  procesos_relacionados?: string[];
  departamentos_aplicables?: string[];
  puntos_norma?: string[];
  documento_url?: string;
  adjuntos?: Array<{ nombre: string; url: string }>;
}

// ===== TRACKING DE COMPLETADO =====
export interface CompletadoTracking {
  identidad: boolean;
  alcance: boolean;
  contexto: boolean;
  estructura: boolean;
  politicas: boolean;
}

// ===== REGISTRO UNIFICADO VERSIONADO =====
export interface PlanificacionRevisionDireccion {
  id: string;

  // Versionado
  fecha_revision: string; // "2025-06-15"
  periodo: string; // "2025-S1"
  estado: 'borrador' | 'vigente' | 'historico';

  // Tracking de completado
  completado: CompletadoTracking;

  // TAB 1: Identidad Organizacional
  IdentidadOrganizacional: IdentidadOrganizacional;

  // TAB 2: Alcance del SGC
  AlcanceSGC: AlcanceSGC;

  // TAB 3: Contexto Organizacional
  Contexto: Contexto;

  // TAB 4: Estructura
  Estructura: Estructura;

  // TAB 5: Políticas (array de políticas)
  Politicas: Politica[];

  // ===== METADATA =====
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

// ===== DATOS PARA CREAR NUEVA REVISIÓN =====
export interface CreatePlanificacionRevisionDireccionData {
  fecha_revision: string;
  periodo: string;
  IdentidadOrganizacional?: Partial<IdentidadOrganizacional>;
  AlcanceSGC?: Partial<AlcanceSGC>;
  Contexto?: Partial<Contexto>;
  Estructura?: Partial<Estructura>;
  Politicas?: Politica[];
  created_by: string;
}

// ===== DATOS PARA ACTUALIZAR SECCIÓN =====
export interface UpdateSectionData {
  section:
    | 'IdentidadOrganizacional'
    | 'AlcanceSGC'
    | 'Contexto'
    | 'Estructura'
    | 'Politicas';
  data:
    | Partial<IdentidadOrganizacional>
    | Partial<AlcanceSGC>
    | Partial<Contexto>
    | Partial<Estructura>
    | Politica[];
  updated_by: string;
}

// ===== DATOS PARA CREAR/ACTUALIZAR POLÍTICA =====
export interface CreatePoliticaData {
  codigo: string;
  titulo: string;
  descripcion: string;
  contenido?: string;
  proposito?: string;
  alcance?: string;
  version?: string;
  fecha_aprobacion?: string;
  estado: 'borrador' | 'en_revision' | 'vigente' | 'obsoleta';
  procesos_relacionados?: string[];
  departamentos_aplicables?: string[];
  puntos_norma?: string[];
  documento_url?: string;
  adjuntos?: Array<{ nombre: string; url: string }>;
}

export interface UpdatePoliticaData extends Partial<CreatePoliticaData> {
  id: string;
}

// ===== TIPOS AUXILIARES =====
export type EstadoRevision = 'borrador' | 'vigente' | 'historico';
export type EstadoPolitica =
  | 'borrador'
  | 'en_revision'
  | 'vigente'
  | 'obsoleta';
export type FrecuenciaRevision = 'trimestral' | 'semestral' | 'anual';
export type TipoProductoServicio = 'producto' | 'servicio';
export type TipoUbicacion =
  | 'sede_principal'
  | 'sucursal'
  | 'planta'
  | 'almacen'
  | 'oficina';
