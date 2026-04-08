/**
 * Unified Organizational Data
 * Estructura unificada que consolida datos de múltiples módulos
 * según el modelo solicitado con separación por TABs
 */

// ===== TAB 1: IDENTIDAD ORGANIZACIONAL =====
export interface IdentidadOrganizacional {
  NOMBRE_ORGANIZACION: string;
  SECTOR: string;
  DESCRIPCION: string;
  TOTAL_EMPLEADOS: number;
  EMPLEADOS_CON_ACCESO: number;
  MISION: string;
  VISION: string;
}

// ===== TAB 2: ALCANCE DEL SGC =====
export interface AlcanceSGC {
  DESCRIPCION: string;
  LIMITES: string;
  PRODUCTOS_SERVICIOS: Array<{
    nombre: string;
    tipo: string;
    descripcion: string;
  }>;
  UBICACIONES: Array<{
    nombre: string;
    tipo: string;
    direccion?: string;
  }>;
}

// ===== TAB 3: CONTEXTO =====
export interface Contexto {
  FECHA_ANALISIS: string;
  FRECUENCIA_REVISION: string;
  CUESTIONES_EXTERNAS: Array<{
    tipo: string;
    descripcion: string;
    impacto: string;
    nivel_impacto: string;
    ambito: string;
  }>;
  CUESTIONES_INTERNAS: Array<{
    tipo: string;
    descripcion: string;
    estado_actual: string;
    fortaleza_debilidad: string;
  }>;
}

// ===== TAB 4: ESTRUCTURA =====
export interface Estructura {
  ORGANIGRAMA_URL?: string;
  OTROS_DATOS?: {
    departamentos_principales?: string[];
    procesos_clave?: string[];
    [key: string]: any;
  };
}

// ===== REGISTRO UNIFICADO COMPLETO =====
export interface UnifiedOrganizationalData {
  IdentidadOrganizacional: IdentidadOrganizacional;
  AlcanceSGC: AlcanceSGC;
  Contexto: Contexto;
  Estructura: Estructura;
}
