// Types for Knowledge Base (Base de Conocimientos)

export interface KnowledgeArticle {
  id: string;
  titulo: string;
  contenido: string;
  categoria: KnowledgeCategory;
  subcategoria?: string;
  tags: string[];
  clausula_iso?: string; // e.g., "4.1", "7.5.3"
  nivel_implementacion?: ImplementationLevel;
  enlaces_externos?: ExternalLink[];
  documentos_relacionados?: string[]; // IDs de documentos
  created_at: Date;
  updated_at: Date;
  autor?: string;
  version: number;
  activo: boolean;
}

export type KnowledgeCategory =
  | 'norma_iso' // Explicación de cláusulas ISO 9001
  | 'implementacion' // Guías de implementación
  | 'auditoria' // Guías de auditoría
  | 'mejora_continua' // Metodologías de mejora
  | 'documentacion' // Cómo documentar
  | 'capacitacion' // Material de capacitación
  | 'faq' // Preguntas frecuentes
  | 'casos_estudio'; // Casos de estudio

export type ImplementationLevel =
  | 'diagnostico' // Etapa 1: Diagnóstico inicial
  | 'planificacion' // Etapa 2: Planificación
  | 'documentacion' // Etapa 3: Documentación
  | 'implementacion' // Etapa 4: Implementación
  | 'auditoria_interna' // Etapa 5: Auditoría interna
  | 'certificacion' // Etapa 6: Certificación
  | 'mantenimiento'; // Etapa 7: Mantenimiento

export interface ExternalLink {
  titulo: string;
  url: string;
  tipo: 'iso_org' | 'iram' | 'gobierno' | 'otro';
  descripcion?: string;
}

export interface ImplementationPhase {
  id: string;
  nivel: ImplementationLevel;
  nombre: string;
  descripcion: string;
  duracion_estimada: string; // e.g., "2-4 semanas"
  objetivos: string[];
  actividades: string[];
  entregables: string[];
  recursos_necesarios: string[];
  articulos_relacionados: string[]; // IDs de KnowledgeArticle
  orden: number;
}

// Para búsqueda y filtros
export interface KnowledgeFilters {
  categoria?: KnowledgeCategory;
  nivel_implementacion?: ImplementationLevel;
  clausula_iso?: string;
  tags?: string[];
  search?: string;
}
