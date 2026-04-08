// src/types/crm-oportunidad.ts
// Tipos para la colección crm_oportunidades

import type { CreditWorkflowProjection } from '@/types/crm-credit-workflow';
import type { ClasificacionesMap } from './crm-clasificacion';

/**
 * Historial de cambios de estado de una oportunidad
 */
export interface HistorialEstadoOportunidad {
  estado_anterior_id: string;
  estado_anterior_nombre: string;
  estado_nuevo_id: string;
  estado_nuevo_nombre: string;
  fecha_cambio: string;
  usuario_id: string;
  usuario_nombre?: string;
  motivo?: string;
}

/**
 * Oportunidad de venta en el CRM
 * Esta es la entidad que se mueve por el Kanban
 */
export interface OportunidadCRM {
  id: string;
  organization_id: string; // Multi-tenant

  // Datos principales
  nombre: string; // "Venta de Semillas 2026"
  descripcion?: string;

  // Relación con Organización (cliente)
  crm_organizacion_id: string;
  organizacion_nombre: string; // Desnormalizado
  organizacion_cuit?: string; // Desnormalizado

  // Relación con Contacto
  contacto_id?: string;
  contacto_nombre?: string; // Desnormalizado

  // Vendedor asignado (desde Personal con rol vendedor)
  vendedor_id: string;
  vendedor_nombre: string; // Desnormalizado

  // Estado Kanban
  estado_kanban_id: string;
  estado_kanban_nombre: string; // Desnormalizado
  estado_kanban_color: string; // Desnormalizado
  historial_estados: HistorialEstadoOportunidad[];

  // Datos comerciales
  monto_estimado: number;
  probabilidad: number; // 0-100%
  fecha_cierre_estimada?: string;
  productos_interes?: string[];

  // Resultado final
  resultado?: 'ganada' | 'perdida' | 'cancelada';
  motivo_cierre?: string;
  fecha_cierre_real?: string;

  // Subprocesos especializados asociados a la oportunidad
  subprocesos?: {
    crediticio?: CreditWorkflowProjection;
  };

  // Trazabilidad de origen cuando la oportunidad se crea desde una solicitud dealer
  origen_solicitud?: {
    solicitud_id: string;
    solicitud_numero: string;
    solicitud_tipo: 'comercial';
  };

  // Clasificaciones comerciales editables
  classifications?: ClasificacionesMap;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  isActive: boolean;
}

/**
 * Datos para crear una nueva oportunidad
 */
export interface CreateOportunidadData {
  nombre: string;
  descripcion?: string;
  crm_organizacion_id: string;
  organizacion_nombre: string;
  organizacion_cuit?: string;
  contacto_id?: string;
  contacto_nombre?: string;
  vendedor_id: string;
  vendedor_nombre: string;
  estado_kanban_id: string;
  estado_kanban_nombre: string;
  estado_kanban_color: string;
  monto_estimado: number;
  probabilidad?: number;
  fecha_cierre_estimada?: string;
  productos_interes?: string[];
  origen_solicitud?: OportunidadCRM['origen_solicitud'];
}

/**
 * Datos para actualizar una oportunidad
 */
export interface UpdateOportunidadData {
  nombre?: string;
  descripcion?: string;
  contacto_id?: string;
  contacto_nombre?: string;
  vendedor_id?: string;
  vendedor_nombre?: string;
  monto_estimado?: number;
  probabilidad?: number;
  fecha_cierre_estimada?: string;
  productos_interes?: string[];
  resultado?: 'ganada' | 'perdida' | 'cancelada';
  motivo_cierre?: string;
}

/**
 * Datos para mover oportunidad en Kanban
 */
export interface MoverOportunidadData {
  oportunidad_id: string;
  estado_nuevo_id: string;
  estado_nuevo_nombre: string;
  estado_nuevo_color: string;
  usuario_id: string;
  usuario_nombre?: string;
  motivo?: string;
}
