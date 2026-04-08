export interface Flujograma {
  id: string;
  organization_id: string;
  codigo: string; // Ej: "FL-PRO-VENTAS-001"
  nombre: string;
  descripcion?: string;
  proceso_id?: string; // ID del proceso relacionado
  proceso_nombre?: string;
  version: number;
  fecha_creacion: string;
  fecha_ultima_actualizacion: string;
  estado: 'borrador' | 'aprobado' | 'vigente' | 'obsoleto';
  elementos: Array<{
    elemento_id: string; // ID único del elemento
    tipo:
      | 'inicio'
      | 'proceso'
      | 'decisión'
      | 'documento'
      | 'conector'
      | 'fin'
      | 'subproceso'
      | 'nota';
    etiqueta: string;
    posicion_x: number;
    posicion_y: number;
    ancho?: number;
    alto?: number;
    metadata?: {
      descripcion?: string;
      responsable?: string;
      documentos_asociados?: string[];
      tiempo_estimado?: number;
      criterio_decision?: string; // Para tipo 'decisión'
      condiciones_salida?: Array<{ etiqueta: string; destino_id: string }>; // Para decisión
    };
  }>;
  conexiones: Array<{
    conexion_id: string;
    desde_id: string; // ID del elemento origen
    hacia_id: string; // ID del elemento destino
    etiqueta?: string; // Para flujos de decisión (Sí/No, etc.)
    tipo_linea?: 'recta' | 'curva' | 'elbow';
  }>;
  configuracion_visual?: {
    tema_color?: string;
    orientacion?: 'vertical' | 'horizontal';
    mostrar_grid?: boolean;
    zoom?: number;
  };
  aprobador_id?: string;
  aprobador_nombre?: string;
  fecha_aprobacion?: string;
  documento_url?: string; // Exportación en PDF/PNG
  adjuntos?: { nombre: string; url: string }[];
  createdAt: string;
  updatedAt: string;
  created_by?: string;
  isActive?: boolean;
}

export interface CreateFlujogramaData {
  codigo: string;
  nombre: string;
  descripcion?: string;
  proceso_id?: string;
  version?: number;
  estado?: string;
  elementos?: Array<{
    elemento_id: string;
    tipo: string;
    etiqueta: string;
    posicion_x: number;
    posicion_y: number;
    ancho?: number;
    alto?: number;
    metadata?: {
      descripcion?: string;
      responsable?: string;
      documentos_asociados?: string[];
      tiempo_estimado?: number;
      criterio_decision?: string;
      condiciones_salida?: Array<{ etiqueta: string; destino_id: string }>;
    };
  }>;
  conexiones?: Array<{
    conexion_id: string;
    desde_id: string;
    hacia_id: string;
    etiqueta?: string;
    tipo_linea?: string;
  }>;
  configuracion_visual?: {
    tema_color?: string;
    orientacion?: string;
    mostrar_grid?: boolean;
    zoom?: number;
  };
  aprobador_id?: string;
  fecha_aprobacion?: string;
  documento_url?: string;
  adjuntos?: { nombre: string; url: string }[];
}

export interface UpdateFlujogramaData extends Partial<CreateFlujogramaData> {
  id: string;
}

export type FlujogramaEstado = 'borrador' | 'aprobado' | 'vigente' | 'obsoleto';
export type ElementoTipo =
  | 'inicio'
  | 'proceso'
  | 'decisión'
  | 'documento'
  | 'conector'
  | 'fin'
  | 'subproceso'
  | 'nota';
export type TipoLinea = 'recta' | 'curva' | 'elbow';
export type OrientacionFlujograma = 'vertical' | 'horizontal';
