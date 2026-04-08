export interface Organigrama {
  id: string;
  organization_id: string;
  codigo: string; // Ej: "ORG-2025"
  nombre: string;
  descripcion?: string;
  version: number;
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta?: string;
  estado: 'borrador' | 'vigente' | 'historico';
  estructura: Array<{
    nodo_id: string; // ID único del nodo
    tipo: 'departamento' | 'puesto' | 'persona';
    referencia_id?: string; // ID del departamento/puesto/persona
    referencia_nombre?: string;
    padre_id?: string; // ID del nodo padre (null para raíz)
    nivel: number; // 0 = raíz
    orden: number; // Orden horizontal
    posicion_x?: number; // Coordenadas para visualización
    posicion_y?: number;
    metadata?: {
      color?: string;
      icono?: string;
      descripcion_cargo?: string;
      responsabilidades?: string[];
    };
  }>;
  configuracion_visual?: {
    orientacion: 'vertical' | 'horizontal';
    estilo: 'clasico' | 'moderno' | 'organico';
    mostrar_fotos?: boolean;
    colores_departamentos?: Record<string, string>;
  };
  aprobador_id?: string;
  aprobador_nombre?: string;
  fecha_aprobacion?: string;
  documento_url?: string;
  adjuntos?: { nombre: string; url: string }[];
  createdAt: string;
  updatedAt: string;
  created_by?: string;
  isActive?: boolean;
}

export interface CreateOrganigramaData {
  codigo: string;
  nombre: string;
  descripcion?: string;
  version?: number;
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta?: string;
  estado?: string;
  estructura?: Array<{
    nodo_id: string;
    tipo: string;
    referencia_id?: string;
    padre_id?: string;
    nivel: number;
    orden: number;
    posicion_x?: number;
    posicion_y?: number;
    metadata?: {
      color?: string;
      icono?: string;
      descripcion_cargo?: string;
      responsabilidades?: string[];
    };
  }>;
  configuracion_visual?: {
    orientacion: string;
    estilo: string;
    mostrar_fotos?: boolean;
    colores_departamentos?: Record<string, string>;
  };
  aprobador_id?: string;
  fecha_aprobacion?: string;
  documento_url?: string;
  adjuntos?: { nombre: string; url: string }[];
}

export interface UpdateOrganigramaData extends Partial<CreateOrganigramaData> {
  id: string;
}

export type OrganigramaEstado = 'borrador' | 'vigente' | 'historico';
export type NodoTipo = 'departamento' | 'puesto' | 'persona';
export type OrientacionVisual = 'vertical' | 'horizontal';
export type EstiloVisual = 'clasico' | 'moderno' | 'organico';
