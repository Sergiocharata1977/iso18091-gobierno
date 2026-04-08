// SIG Core — tipos transversales a todas las normas ISO
// Usados por auditorías, hallazgos, acciones, plugins normativos

export type NormaISO =
  | 'ISO_9001'
  | 'ISO_14001'
  | 'ISO_45001'
  | 'ISO_27001'
  | 'ISO_27002'
  | 'ISO_18091'
  | 'ISO_31000'
  | 'PTW'
  | 'CUSTOM';

export interface ClausulaReferencia {
  norma: NormaISO;
  clausula: string;      // ej: '8.1', '6.1.2'
  descripcion?: string;
}

export type NivelRiesgo = 'muy_bajo' | 'bajo' | 'medio' | 'alto' | 'critico';

export type EstadoCumplimiento =
  | 'conforme'
  | 'observacion'
  | 'no_conforme'
  | 'no_aplica'
  | 'pendiente_revision';

// Contexto normativo para hallazgos, acciones y auditorías multi-norma
export interface SIGContextRef {
  norma?: NormaISO;
  clausula?: string;
  proceso_id?: string;
  plugin_origen?: string; // ej: 'pack_hse', 'isms_context'
}

// Origen de un hallazgo (extendible por cada plugin)
export type OrigenHallazgo =
  | 'auditoria'
  | 'incidente_sst'
  | 'aspecto_ambiental'
  | 'ptw'
  | 'sgsi_control'
  | 'registro_configurable'
  | 'manual';
