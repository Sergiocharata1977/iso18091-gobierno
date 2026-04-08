// Tipos para el módulo Compras Dealer (capability: dealer_compras)
// Plugin configurable — las etapas del Kanban las define el tenant

export type CompraType =
  | 'repuesto'
  | 'insumo'
  | 'servicio_externo'
  | 'herramienta'
  | 'consumible'
  | 'logistica'
  | 'otro';

export type CompraPrioridad = 'normal' | 'urgente' | 'critica';

// Etapa del Kanban — definida por el tenant en Firestore
// Colección: organizations/{orgId}/kanban_configs/compras
export interface EstadoKanban {
  id: string;           // slug (ej: 'solicitada', 'en_cotizacion')
  nombre: string;       // label visible
  color: string;        // slate | blue | indigo | amber | emerald | green | rose | cyan | violet
  orden: number;
  tipo: 'activo' | 'cerrado' | 'cancelado';
  es_default: boolean;  // estado inicial de nuevas compras
  bloqueado: boolean;   // no se puede eliminar (ej: cerrada, cancelada)
  descripcion?: string;
}

export interface CompraItem {
  id: string;
  descripcion: string;
  codigo_parte?: string;
  cantidad: number;
  cantidad_recibida?: number;
  unidad: string;
  precio_unitario_estimado?: number;
  precio_unitario_real?: number;
  marca_referencia?: string;
  observaciones?: string;
  conforme?: boolean;
}

export interface Compra {
  id?: string;
  numero?: number;
  tipo: CompraType;
  estado: string;              // id de EstadoKanban (dinámico)
  prioridad: CompraPrioridad;

  // Solicitante
  solicitante_id?: string;
  solicitante_nombre: string;
  area: string;
  motivo: string;
  justificacion?: string;

  // Fechas
  fecha_requerida?: any;
  fecha_aprobacion?: any;
  fecha_orden?: any;
  fecha_recepcion?: any;
  fecha_cierre?: any;

  // Proveedor
  proveedor_nombre?: string;
  proveedor_cuit?: string;
  proveedor_contacto?: string;

  // Ítems
  items: CompraItem[];

  // Montos (calculados al guardar)
  monto_estimado?: number;
  monto_real?: number;
  moneda?: string;

  // Vínculos opcionales
  orden_servicio_id?: string;
  oportunidad_crm_id?: string;
  hallazgo_id?: string;

  // ISO amendment 2024 — opcional
  impacto_ambiental?: boolean;
  criterio_ambiental?: string;

  // Recepción
  recepcion_tipo?: 'total' | 'parcial' | 'rechazada';
  recepcion_observaciones?: string;

  notas?: string;

  // Trazabilidad
  organization_id: string;
  created_at: any;
  updated_at: any;
  created_by: string;
}
