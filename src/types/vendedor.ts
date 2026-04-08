// src/types/vendedor.ts
// Tipos para la App Vendedor PWA - Sistema Multi-tenant

/**
 * Cliente local almacenado en IndexedDB para uso offline
 */
export interface ClienteLocal {
  id: string;
  organizationId: string; // Multi-tenant
  razonSocial: string;
  cuit: string;
  direccion: string;
  localidad: string;
  provincia: string;
  ubicacion?: {
    lat: number;
    lng: number;
  };
  telefono?: string;
  email?: string;
  vendedorId: string;
  estado: 'activo' | 'inactivo' | 'prospecto';
  ultimaVisita?: string;
  proximaVisita?: string;
  notas?: string;
  // Sincronización
  lastSyncAt: string;
  version: number;
}

/**
 * Visita registrada localmente (offline-first)
 */
export interface VisitaLocal {
  id: string;
  organizationId: string; // Multi-tenant
  clienteId: string;
  vendedorId: string;

  // Datos de visita
  fecha: string;
  horaInicio: string;
  horaFin?: string;
  tipo: 'visita_campo' | 'visita_oficina' | 'llamada' | 'videollamada' | 'otro';
  objetivo: string;
  notas: string;
  resultado?: 'exitosa' | 'sin_contacto' | 'reprogramar' | 'cancelada';

  // Ubicación GPS
  ubicacionInicio?: UbicacionGPS;
  ubicacionFin?: UbicacionGPS;

  // Evidencias (IDs de fotos/audios locales)
  fotosIds: string[];
  audiosIds: string[];

  // Checklist configurable
  checklist: ChecklistItem[];

  // Firma del cliente
  firmaCliente?: string; // Base64 de la firma

  // Próxima acción
  proximaAccion?: {
    tipo: string;
    fecha: string;
    descripcion: string;
  };

  // Estado de sincronización
  syncStatus: SyncStatus;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

/**
 * Ubicación GPS capturada
 */
export interface UbicacionGPS {
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number;
  timestamp: string;
}

/**
 * Foto capturada localmente
 */
export interface FotoLocal {
  id: string;
  organizationId: string;
  visitaId: string;
  clienteId: string;

  // Almacenamiento local
  blobUrl: string; // URL del blob en IndexedDB
  thumbnailUrl: string;

  // Metadata
  descripcion: string;
  tipo: 'campo' | 'instalacion' | 'maquinaria' | 'documento' | 'otro';
  ubicacion?: UbicacionGPS;
  timestamp: string;

  // Sincronización
  syncStatus: SyncStatus;
  remoteUrl?: string; // URL en Firebase Storage después de sincronizar
  createdAt: string;
  syncedAt?: string;
}

/**
 * Audio grabado localmente
 */
export interface AudioLocal {
  id: string;
  organizationId: string;
  visitaId: string;
  clienteId: string;

  // Almacenamiento local
  blobUrl: string;
  duracionSegundos: number;

  // Transcripción
  transcripcion?: string;
  transcripcionStatus: 'pending' | 'processing' | 'done' | 'error';

  // Metadata
  timestamp: string;

  // Sincronización
  syncStatus: SyncStatus;
  remoteUrl?: string;
  createdAt: string;
  syncedAt?: string;
}

/**
 * Item de checklist configurable
 */
export interface ChecklistItem {
  id: string;
  texto: string;
  completado: boolean;
  obligatorio: boolean;
  orden: number;
}

/**
 * Plantilla de checklist (configurable por organización)
 */
export interface ChecklistTemplate {
  id: string;
  organizationId: string;
  nombre: string;
  descripcion?: string;
  items: Omit<ChecklistItem, 'completado'>[];
  activo: boolean;
}

/**
 * Estado de sincronización
 */
export type SyncStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'error'
  | 'conflict';

/**
 * Item en la cola de sincronización
 */
/**
 * Acción registrada localmente (offline-first)
 * Reemplaza/Generaliza VisitaLocal
 */
export interface AccionLocal {
  id: string;
  organizationId: string;
  clienteId?: string;
  vendedorId: string;

  // Datos
  tipo: string; // 'visita', 'llamada', etc
  canal: string;
  titulo: string;
  descripcion?: string;
  resultado?: string;

  // Metadata
  fechaProgramada?: string;
  fechaRealizada?: string;
  duracionMin?: number;

  // Evidencias
  evidenciasIds: string[]; // IDs de fotos/audios locales

  // Sync
  syncStatus: SyncStatus;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

/**
 * Item en la cola de sincronización
 */
export interface SyncQueueItem {
  id: string;
  organizationId: string;
  tipo: 'visita' | 'foto' | 'audio' | 'accion';
  entityId: string;
  prioridad: 1 | 2 | 3; // 1 = alta (datos), 2 = media (ubicación), 3 = baja (archivos)
  intentos: number;
  maxIntentos: number;
  ultimoError?: string;
  createdAt: string;
  nextRetryAt?: string;
}

/**
 * Configuración del vendedor
 */
export interface VendedorConfig {
  id: string;
  organizationId: string;
  userId: string;

  // Preferencias de captura
  autoGPS: boolean;
  compresionFotos: 'alta' | 'media' | 'baja';
  maxFotosPorVisita: number;

  // Sincronización
  syncOnlyWifi: boolean;
  syncInterval: number; // minutos

  // UI
  theme: 'light' | 'dark' | 'system';

  // Datos precargados
  clientesPrecargados: number;
}

/**
 * Estado global de la app vendedor
 */
export interface VendedorAppState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSync: number;
  lastSyncAt?: string;
  currentLocation?: UbicacionGPS;
  vendedorId: string;
  organizationId: string;
}

/**
 * Estadísticas del vendedor
 */
export interface VendedorStats {
  visitasHoy: number;
  visitasSemana: number;
  visitasMes: number;
  clientesVisitados: number;
  clientesAsignados: number;
  kmRecorridos?: number;
  pendientesSync: number;
}

// ============ SOLICITUDES MOBILE ============

export type TipoSolicitudMobile = 'repuesto' | 'servicio';
export type EstadoSolicitudMobile =
  | 'nueva'
  | 'en_proceso'
  | 'presupuestada'
  | 'aprobada'
  | 'cerrada'
  | 'cancelada';

export interface SolicitudMobile {
  id: string;
  organizationId: string;
  tipo: TipoSolicitudMobile;
  estado: EstadoSolicitudMobile;
  nombre_contacto: string;
  email_contacto?: string;
  telefono_contacto?: string;
  // Repuesto
  codigo_repuesto?: string;
  descripcion_repuesto?: string;
  // Servicio
  descripcion_servicio?: string;
  equipo_modelo?: string;
  numero_serie?: string;
  // CRM link
  crm_oportunidad_id?: string;
  crm_cliente_id?: string;
  // Meta
  createdAt: string;
  updatedAt: string;
  syncedAt?: string; // cuándo fue descargada de Firestore
  pendingSync?: boolean; // si tiene cambio local no sincronizado
}
