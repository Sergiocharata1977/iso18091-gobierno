/**
 * Configuración del sistema CRM
 * Estados Kanban, clasificación de clientes y métricas
 */

import { type EstadoClienteKanban } from '@/types/crm';

// ============================================================================
// ESTADOS KANBAN
// ============================================================================

/**
 * Estados Kanban predeterminados para flujo de oportunidades de venta
 * Nota: organization_id y tipo se asignan dinámicamente al crear los estados
 */
export const ESTADOS_KANBAN_DEFAULT: Omit<
  EstadoClienteKanban,
  'id' | 'created_at' | 'updated_at'
>[] = [
  {
    nombre: 'Prospecto',
    color: '#94a3b8', // Gris
    orden: 1,
    descripcion: 'Lead generado, primer contacto pendiente',
    es_estado_final: false,
    permite_edicion: false,
    organization_id: '', // Se asigna al crear
    tipo: 'crm',
  },
  {
    nombre: 'Contactado',
    color: '#60a5fa', // Azul claro
    orden: 2,
    descripcion: 'Primer contacto realizado, en calificación',
    es_estado_final: false,
    permite_edicion: false,
    organization_id: '',
    tipo: 'crm',
  },
  {
    nombre: 'Gestión Crediticia',
    color: '#fbbf24', // Amarillo
    orden: 3,
    descripcion: 'Subflujo de análisis y gestión crediticia de la oportunidad',
    requires_credit_workflow: true,
    credit_workflow_trigger: 'entry',
    es_estado_final: false,
    permite_edicion: false,
    organization_id: '',
    tipo: 'crm',
  },
  {
    nombre: 'Crédito Aprobado',
    color: '#34d399', // Verde claro
    orden: 4,
    descripcion: 'Línea de crédito aprobada, listo para negociar',
    es_estado_final: false,
    permite_edicion: false,
    organization_id: '',
    tipo: 'crm',
  },
  {
    nombre: 'En Negociación',
    color: '#a78bfa', // Púrpura
    orden: 5,
    descripcion: 'Negociando condiciones de venta para campaña',
    es_estado_final: false,
    permite_edicion: false,
    organization_id: '',
    tipo: 'crm',
  },
  {
    nombre: 'Venta Cerrada',
    color: '#10b981', // Verde
    orden: 6,
    descripcion: 'Venta confirmada para la campaña',
    es_estado_final: true,
    permite_edicion: false,
    organization_id: '',
    tipo: 'crm',
  },
  {
    nombre: 'Oportunidad Perdida',
    color: '#ef4444', // Rojo
    orden: 7,
    descripcion: 'No concretó venta en esta campaña',
    es_estado_final: true,
    permite_edicion: false,
    organization_id: '',
    tipo: 'crm',
  },
  {
    nombre: 'Crédito Rechazado',
    color: '#991b1b', // Rojo oscuro
    orden: 8,
    descripcion: 'Scoring insuficiente, crédito denegado',
    es_estado_final: true,
    permite_edicion: false,
    organization_id: '',
    tipo: 'crm',
  },
];

// ============================================================================
// CLASIFICACIÓN DE CLIENTES
// ============================================================================

/**
 * Criterios para clasificación automática de clientes
 */
export const CRITERIOS_CLASIFICACION_CLIENTE = {
  POSIBLE_CLIENTE: {
    descripcion: 'Sin compras realizadas',
    condicion: (totalCompras12m: number) => totalCompras12m === 0,
  },
  CLIENTE_FRECUENTE: {
    descripcion: 'Al menos 3 compras en últimos 12 meses',
    condicion: (totalCompras12m: number, diasDesdeUltimaCompra: number) =>
      totalCompras12m >= 3 && diasDesdeUltimaCompra <= 365,
  },
  CLIENTE_ANTIGUO: {
    descripcion: 'Última compra hace más de 12 meses',
    condicion: (totalCompras12m: number, diasDesdeUltimaCompra: number) =>
      totalCompras12m > 0 && diasDesdeUltimaCompra > 365,
  },
};

// ============================================================================
// ALERTAS Y MÉTRICAS
// ============================================================================

/**
 * Umbrales para alertas de clientes no atendidos
 */
export const UMBRALES_ALERTAS = {
  DIAS_SIN_CONTACTO_ADVERTENCIA: 30,
  DIAS_SIN_CONTACTO_CRITICO: 60,
  DIAS_SIN_CONTACTO_PERDIDO: 90,
};

/**
 * Configuración de métricas de penetración de mercado
 */
export const CONFIG_METRICAS_PENETRACION = {
  TASA_CONVERSION_OBJETIVO: 40, // 40% de conversión de leads
  TASA_RETENCION_OBJETIVO: 75, // 75% de retención de clientes
  DIAS_CICLO_VENTA_PROMEDIO: 45, // 45 días promedio de ciclo de venta
};
