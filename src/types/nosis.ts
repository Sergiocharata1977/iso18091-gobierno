/**
 * Tipos TypeScript para Integración API Nosis
 * Servicio API VR con gestión de credenciales multi-tenant
 */

// ============================================================================
// CONFIGURACIÓN DE API NOSIS
// ============================================================================

/**
 * Estado de una API Key
 */
export type EstadoApiKey = 'activa' | 'inactiva' | 'expirada' | 'revocada';

/**
 * API Key encriptada
 */
export interface NosisApiKey {
  id: string;
  nombre: string; // "API Key Principal", "Key Backup 1"
  keyEncriptada: string; // Encriptada con AES-256
  ultimosDigitos: string; // "...XXXX" para identificación
  estado: EstadoApiKey;
  fechaCreacion: string;
  fechaExpiracion?: string;
  ultimoUso?: string;
  usosTotal: number;
}

/**
 * Configuración de Nosis por organización (multi-tenant)
 */
export interface NosisConfig {
  id: string;
  organizationId: string; // Multi-tenant: cada org tiene su config

  // API Keys (hasta 3)
  apiKeys: NosisApiKey[];

  // Endpoints
  endpoint: string; // URL base de la API
  endpointSandbox?: string; // Para testing
  usarSandbox: boolean;

  // Configuración de consultas
  timeout: number; // ms, default 30000
  reintentos: number; // default 3

  // Bloqueo automático
  bloqueoAutomatico: {
    habilitado: boolean;
    umbralScore: number; // Si score < umbral, bloquear línea
    accionBloqueo: 'suspender' | 'reducir_50' | 'alertar';
  };

  // Notificaciones
  notificaciones: {
    errorConexion: boolean;
    consultaExitosa: boolean;
    scoreDebajo: boolean;
    emailsNotificacion: string[];
  };

  // Estado del servicio
  estadoConexion: 'conectado' | 'desconectado' | 'error';
  ultimaVerificacion?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// CONSULTAS A NOSIS
// ============================================================================

/**
 * Tipos de consulta disponibles
 */
export type TipoConsultaNosis =
  | 'veraz' // Solo Veraz
  | 'nosis_score' // Score Nosis
  | 'informe_comercial' // Informe comercial completo
  | 'situacion_crediticia' // Situación en BCRA
  | 'completo'; // Todos los anteriores

/**
 * Estado de una consulta
 */
export type EstadoConsulta =
  | 'pendiente'
  | 'procesando'
  | 'exitoso'
  | 'error'
  | 'timeout';

/**
 * Consulta realizada a Nosis
 */
export interface NosisConsulta {
  id: string;
  organizationId: string; // Multi-tenant
  clienteId: string;
  clienteCuit: string;
  clienteNombre: string;

  // Tipo de consulta
  tipoConsulta: TipoConsultaNosis;

  // Request
  requestTimestamp: string;
  requestXML?: string; // Para auditoría técnica
  requestJSON?: object;

  // Response
  responseTimestamp?: string;
  responseXML?: string; // Respuesta bruta XML
  responseJSON?: object; // Respuesta parseada
  tiempoRespuestaMs: number;

  // Resultados principales
  scoreObtenido?: number; // Score Nosis (0-999)
  categoriaRiesgo?: string; // Según Nosis
  situacionBCRA?: string; // Situación en Central de Deudores

  // Datos extraídos
  datosExtraidos?: NosisResultado;

  // Estado
  estado: EstadoConsulta;
  errorCodigo?: string;
  errorMensaje?: string;
  errorDetalle?: string;

  // Auditoría
  apiKeyUsada: string; // ID de la key utilizada
  usuarioSolicitante: string;
  ipOrigen?: string;

  // Metadata
  createdAt: string;
}

/**
 * Resultado parseado de consulta Nosis
 */
export interface NosisResultado {
  // Identificación
  cuit: string;
  razonSocial: string;
  tipoPersona: 'fisica' | 'juridica';

  // Score
  score: number; // 0-999
  scoreCategoria: 'A' | 'B' | 'C' | 'D' | 'E';
  scoreFechaCalculo: string;

  // Situación BCRA
  bcra: {
    situacionActual: number; // 1-5 (1=Normal, 5=Irrecuperable)
    situacionHistorica: number; // Peor situación últimos 24 meses
    entidadesInformantes: number;
    montoDeuda: number;
    montoEnSituacion2a5: number;
  };

  // Veraz / Informes comerciales
  cheques: {
    rechazados: number;
    montoRechazados: number;
    ultimoRechazo?: string;
  };

  juicios: {
    cantidad: number;
    montoTotal: number;
    activos: number;
  };

  concursos: {
    presentados: boolean;
    fechaPresentacion?: string;
    estado?: string;
  };

  inhabilitaciones: {
    cantidad: number;
    vigentes: boolean;
    motivos?: string[];
  };

  // Historial de consultas
  consultasPrevias: {
    ultimos30Dias: number;
    ultimos90Dias: number;
    ultimos365Dias: number;
  };

  // Fecha de los datos
  fechaActualizacion: string;
}

// ============================================================================
// DASHBOARD DE MONITOREO
// ============================================================================

/**
 * Estadísticas de uso del servicio
 */
export interface NosisEstadisticas {
  organizationId: string;
  periodo: 'hoy' | 'semana' | 'mes' | 'año';

  // Contadores
  consultasTotal: number;
  consultasExitosas: number;
  consultasFallidas: number;
  tasaExito: number; // %

  // Tiempos
  tiempoPromedioMs: number;
  tiempoMaximoMs: number;
  tiempoMinimoMs: number;

  // Por tipo
  consultasPorTipo: Record<TipoConsultaNosis, number>;

  // Errores
  erroresPorTipo: Record<string, number>;
}

/**
 * Log de errores
 */
export interface NosisErrorLog {
  id: string;
  organizationId: string;
  consultaId?: string;

  timestamp: string;
  nivel: 'warning' | 'error' | 'critical';

  codigo: string;
  mensaje: string;
  detalle?: string;
  stackTrace?: string;

  // Contexto
  cuitConsultado?: string;
  apiKeyUsada?: string;
  endpoint?: string;

  // Estado
  resuelto: boolean;
  resueltoPor?: string;
  fechaResolucion?: string;
  notasResolucion?: string;
}

/**
 * Estado del dashboard
 */
export interface NosisDashboard {
  organizationId: string;

  // Estado actual
  estadoServicio: 'operativo' | 'degradado' | 'caido';
  latenciaActual: number;
  ultimaConsulta?: NosisConsulta;

  // Estadísticas
  estadisticasHoy: NosisEstadisticas;

  // Últimas consultas
  ultimasConsultas: NosisConsulta[];

  // Errores recientes
  erroresRecientes: NosisErrorLog[];

  // Alertas activas
  alertas: {
    id: string;
    tipo:
      | 'error_conexion'
      | 'key_proxima_expiracion'
      | 'cuota_limite'
      | 'score_bajo';
    mensaje: string;
    fechaCreacion: string;
    prioridad: 'baja' | 'media' | 'alta';
  }[];
}

// ============================================================================
// TIPOS PARA CRUD Y API
// ============================================================================

export interface CreateNosisConfigData {
  endpoint: string;
  endpointSandbox?: string;
  usarSandbox: boolean;
  timeout?: number;
  reintentos?: number;
  bloqueoAutomatico?: NosisConfig['bloqueoAutomatico'];
}

export interface AddApiKeyData {
  nombre: string;
  apiKey: string; // Se encriptará antes de guardar
}

export interface ConsultarNosisData {
  clienteId: string;
  cuit: string;
  tipoConsulta: TipoConsultaNosis;
  forzarActualizacion?: boolean; // Ignorar caché
}

export interface NosisConsultaResponse {
  success: boolean;
  consultaId: string;
  resultado?: NosisResultado;
  error?: {
    codigo: string;
    mensaje: string;
  };
  tiempoMs: number;
}

// ============================================================================
// UTILIDADES DE ENCRIPTACIÓN
// ============================================================================

/**
 * Interfaz para servicio de encriptación
 */
export interface ICryptoService {
  encrypt(plainText: string): Promise<string>;
  decrypt(encryptedText: string): Promise<string>;
  hash(text: string): string;
  generateKey(): string;
}
