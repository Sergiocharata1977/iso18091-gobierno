export interface RelacionProcesos {
  id: string;
  organization_id: string;
  proceso_origen_id: string;
  proceso_origen_nombre?: string;
  proceso_destino_id: string;
  proceso_destino_nombre?: string;
  tipo_relacion:
    | 'entrada'
    | 'salida'
    | 'proveedor'
    | 'cliente'
    | 'interaccion'
    | 'dependencia'
    | 'colaboracion';
  descripcion: string;
  elemento_relacionado?: {
    tipo: 'documento' | 'informacion' | 'producto' | 'servicio' | 'recurso';
    nombre: string;
    descripcion?: string;
    codigo_referencia?: string;
  };
  frecuencia?:
    | 'continua'
    | 'diaria'
    | 'semanal'
    | 'mensual'
    | 'trimestral'
    | 'anual'
    | 'evento';
  importancia: 'baja' | 'media' | 'alta' | 'critica';
  canales_comunicacion?: string[]; // Ej: ["Email", "Sistema ERP", "Reuniones"]
  responsable_gestion?: string; // ID usuario
  responsable_nombre?: string;
  indicadores_relacion?: Array<{
    nombre: string;
    tipo: 'tiempo' | 'calidad' | 'cantidad' | 'costo';
    meta?: number;
    unidad?: string;
  }>;
  riesgos_asociados?: Array<{
    descripcion: string;
    probabilidad: 'baja' | 'media' | 'alta';
    impacto: 'bajo' | 'medio' | 'alto';
    mitigacion?: string;
  }>;
  documentos_asociados?: Array<{
    tipo: string;
    codigo?: string;
    nombre: string;
    url?: string;
  }>;
  estado: 'activa' | 'suspendida' | 'obsoleta';
  fecha_establecida?: string;
  fecha_ultima_revision?: string;
  createdAt: string;
  updatedAt: string;
  created_by?: string;
  isActive?: boolean;
}

export interface CreateRelacionProcesosData {
  proceso_origen_id: string;
  proceso_destino_id: string;
  tipo_relacion: string;
  descripcion: string;
  elemento_relacionado?: {
    tipo: string;
    nombre: string;
    descripcion?: string;
    codigo_referencia?: string;
  };
  frecuencia?: string;
  importancia: string;
  canales_comunicacion?: string[];
  responsable_gestion?: string;
  indicadores_relacion?: Array<{
    nombre: string;
    tipo: string;
    meta?: number;
    unidad?: string;
  }>;
  riesgos_asociados?: Array<{
    descripcion: string;
    probabilidad: string;
    impacto: string;
    mitigacion?: string;
  }>;
  documentos_asociados?: Array<{
    tipo: string;
    codigo?: string;
    nombre: string;
    url?: string;
  }>;
  estado?: string;
  fecha_establecida?: string;
}

export interface UpdateRelacionProcesosData
  extends Partial<CreateRelacionProcesosData> {
  id: string;
  fecha_ultima_revision?: string;
}

export type TipoRelacion =
  | 'entrada'
  | 'salida'
  | 'proveedor'
  | 'cliente'
  | 'interaccion'
  | 'dependencia'
  | 'colaboracion';
export type TipoElementoRelacionado =
  | 'documento'
  | 'informacion'
  | 'producto'
  | 'servicio'
  | 'recurso';
export type FrecuenciaRelacion =
  | 'continua'
  | 'diaria'
  | 'semanal'
  | 'mensual'
  | 'trimestral'
  | 'anual'
  | 'evento';
export type ImportanciaRelacion = 'baja' | 'media' | 'alta' | 'critica';
export type TipoIndicador = 'tiempo' | 'calidad' | 'cantidad' | 'costo';
export type ProbabilidadRiesgo = 'baja' | 'media' | 'alta';
export type ImpactoRiesgo = 'bajo' | 'medio' | 'alto';
export type EstadoRelacion = 'activa' | 'suspendida' | 'obsoleta';
