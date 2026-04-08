/**
 * Tipos para las colecciones de Planificación
 * Prefijo: plan_
 *
 * Colecciones:
 * - plan_identidad
 * - plan_alcance
 * - plan_contexto
 * - plan_estructura
 * - plan_politicas
 */

// ============================================
// INTERFAZ BASE
// ============================================

export interface PlanBase {
  id: string;
  organization_id: string;
  estado: 'borrador' | 'vigente' | 'historico';
  version_numero: number;
  fecha_vigencia?: string;
  reunion_id?: string;
  reunion_nombre?: string;
  created_at: string;
  created_by: string;
  updated_at?: string;
  updated_by?: string;
}

// ============================================
// TIPOS ESPECÍFICOS POR COLECCIÓN
// ============================================

export interface PlanIdentidad extends PlanBase {
  mision: string;
  vision: string;
  valores: string;
  objetivos_estrategicos: string;
}

export interface PlanAlcance extends PlanBase {
  alcance_sgc: string;
  productos_servicios: string;
  ubicaciones: string;
  exclusiones: string;
}

export interface PlanContexto extends PlanBase {
  contexto_interno: string;
  contexto_externo: string;
  partes_interesadas: string;
  // Nota: requisitos_legales en detalle van en módulo Normas
}

export interface PlanEstructura extends PlanBase {
  // Organigrama - URLs separadas para cada fuente
  organigrama_upload_url?: string;
  organigrama_ia_url?: string;
  organigrama_active_source?: 'upload' | 'ia'; // Cuál es el vigente
  organigrama_image_url?: string; // Deprecated - mantener por compatibilidad
  organigrama_image_source?: 'upload' | 'ia'; // Deprecated

  // Procesos relacionados - misma lógica
  procesos_relacionados: string[]; // IDs de procesos
  procesos_imagen_upload_url?: string;
  procesos_imagen_ia_url?: string;
  procesos_imagen_active_source?: 'upload' | 'ia';

  descripcion_breve?: string;
  observaciones?: string;
}

export interface PlanPoliticas extends PlanBase {
  politica_calidad: string;
  otras_politicas: string;
}

// ============================================
// NOMBRES DE COLECCIONES
// ============================================

export const PLAN_COLLECTIONS = {
  identidad: 'plan_identidad',
  alcance: 'plan_alcance',
  contexto: 'plan_contexto',
  estructura: 'plan_estructura',
  politicas: 'plan_politicas',
} as const;

export type PlanCollectionType = keyof typeof PLAN_COLLECTIONS;

// ============================================
// TÍTULOS PARA UI Y DOCUMENTOS
// ============================================

export const PLAN_TITULOS: Record<PlanCollectionType, string> = {
  identidad: 'Identidad Organizacional',
  alcance: 'Alcance del SGC',
  contexto: 'Contexto de la Organización',
  estructura: 'Estructura Organizacional',
  politicas: 'Políticas',
};

// ============================================
// CAMPOS POR TIPO (para formularios dinámicos)
// ============================================

export const PLAN_CAMPOS: Record<
  PlanCollectionType,
  { key: string; label: string; rows?: number; isoClauseKey?: string }[]
> = {
  identidad: [
    {
      key: 'mision',
      label: 'Misión',
      rows: 3,
      isoClauseKey: '4.1',
    },
    {
      key: 'vision',
      label: 'Visión',
      rows: 3,
      isoClauseKey: '5.1',
    },
    {
      key: 'valores',
      label: 'Valores',
      rows: 3,
      isoClauseKey: '5.1',
    },
    {
      key: 'objetivos_estrategicos',
      label: 'Objetivos Estratégicos',
      rows: 3,
      isoClauseKey: '5.1',
    },
  ],
  alcance: [
    {
      key: 'alcance_sgc',
      label: 'Alcance del SGC',
      rows: 4,
      isoClauseKey: '4.3',
    },
    {
      key: 'productos_servicios',
      label: 'Productos y Servicios',
      rows: 3,
      isoClauseKey: '4.3',
    },
    {
      key: 'ubicaciones',
      label: 'Ubicaciones',
      rows: 2,
      isoClauseKey: '4.3',
    },
    {
      key: 'exclusiones',
      label: 'Exclusiones (No Aplicabilidad)',
      rows: 2,
      isoClauseKey: '4.3',
    },
  ],
  contexto: [
    {
      key: 'contexto_interno',
      label: 'Contexto Interno (Fortalezas/Debilidades)',
      rows: 4,
      isoClauseKey: '4.1',
    },
    {
      key: 'contexto_externo',
      label: 'Contexto Externo (Oportunidades/Amenazas)',
      rows: 4,
      isoClauseKey: '4.1',
    },
    {
      key: 'partes_interesadas',
      label: 'Partes Interesadas',
      rows: 3,
      isoClauseKey: '4.2',
    },
  ],
  estructura: [
    {
      key: 'descripcion_breve',
      label: 'Descripción de la Estructura',
      rows: 3,
      isoClauseKey: '5.3',
    },
    {
      key: 'observaciones',
      label: 'Observaciones',
      rows: 3,
      isoClauseKey: '5.3',
    },
  ],
  politicas: [
    {
      key: 'politica_calidad',
      label: 'Política de Calidad',
      rows: 8,
      isoClauseKey: '5.2.1',
    },
    {
      key: 'otras_politicas',
      label: 'Otras Políticas',
      rows: 4,
      isoClauseKey: '5.2',
    },
  ],
};

// ============================================
// VALORES POR DEFECTO
// ============================================

export function getDefaultPlanData<T extends PlanBase>(
  tipo: PlanCollectionType,
  organizationId: string,
  userEmail: string
): Omit<T, 'id'> {
  const base: Omit<PlanBase, 'id'> = {
    organization_id: organizationId,
    estado: 'borrador',
    version_numero: 1,
    created_at: new Date().toISOString(),
    created_by: userEmail,
  };

  // Campos específicos por tipo (todos vacíos)
  const campos = PLAN_CAMPOS[tipo];
  const camposVacios: Record<string, string> = {};
  campos.forEach(c => {
    camposVacios[c.key] = '';
  });

  return { ...base, ...camposVacios } as Omit<T, 'id'>;
}
