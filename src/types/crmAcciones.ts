/**
 * Tipos para el Módulo de Acciones Comerciales (CRM)
 * Basa el CRM en actividades (Activity-Based)
 */

export type CRMAccionTipo =
  | 'llamada'
  | 'mail'
  | 'visita'
  | 'whatsapp'
  | 'reunion'
  | 'cotizacion'
  | 'seguimiento'
  | 'tarea'
  | 'otro';

export type CRMAccionResultado =
  | 'pendiente'
  | 'realizada'
  | 'no_contesta'
  | 'reprogramada'
  | 'interesado'
  | 'no_interesado'
  | 'venta'
  | 'perdida'
  | 'enviado' // Para WhatsApp/Mail
  | 'recibido'; // Para WhatsApp/Mail

export type CRMAccionCanal =
  | 'telefono'
  | 'email'
  | 'presencial'
  | 'whatsapp'
  | 'meet'
  | 'otro';

export type CRMAccionEstado =
  | 'programada'
  | 'en_progreso'
  | 'completada'
  | 'cancelada'
  | 'vencida';

export interface CRMAccion {
  id: string;

  organization_id: string;

  // Relación
  cliente_id?: string; // Opcional si es una tarea general, pero recomendado
  cliente_nombre?: string; // Desnormalizado para listas rápidas
  oportunidad_id?: string; // Vinculación clave con el pipeline
  oportunidad_titulo?: string; // Desnormalizado

  // Clasificación
  tipo: CRMAccionTipo;
  canal: CRMAccionCanal;

  // Contenido
  titulo: string; // Resumen corto. Ej: "Llamada seguimiento"
  descripcion?: string; // Detalles, notas de la reunión, cuerpo del mensaje
  resultado?: CRMAccionResultado;

  // Planificación
  fecha_programada?: string; // ISO string. Cuándo se DEBE hacer
  fecha_realizada?: string; // ISO string. Cuándo SE HIZO
  duracion_min?: number; // Tiempo invertido

  // Responsables
  vendedor_id: string; // Usuario responsable
  vendedor_nombre?: string; // Desnormalizado

  // Evidencias / adjuntos (opcional)
  evidencias?: Array<{
    label: string;
    url: string;
    type?: 'audio' | 'imagen' | 'pdf' | 'link' | 'otro';
  }>;

  // Tags
  tags?: string[];

  // Estados
  estado: CRMAccionEstado;

  // Integraciones
  calendar_event_id?: string; // Si se sincronizó con calendario
  whatsapp_message_sid?: string; // Si viene de Twilio

  // Auditoría
  createdAt: string;
  updatedAt: string;
  createdBy: string; // User ID
}

/**
 * Filtros para listado de acciones
 */
export interface FiltrosCRMAccion {
  cliente_id?: string;
  oportunidad_id?: string;
  vendedor_id?: string;
  tipo?: CRMAccionTipo;
  estado?: CRMAccionEstado;
  fecha_desde?: string;
  fecha_hasta?: string;
}
