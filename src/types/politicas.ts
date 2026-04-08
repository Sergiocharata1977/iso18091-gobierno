export interface Politica {
  id: string;
  organization_id: string;
  codigo: string; // Ej: "POL-QMS-001"
  titulo: string;
  descripcion: string;
  contenido?: string; // Contenido completo de la política
  proposito?: string;
  alcance?: string;
  version: string;
  fecha_aprobacion?: string;
  fecha_revision?: string;
  fecha_proxima_revision?: string;
  aprobador_id?: string;
  aprobador_nombre?: string;
  estado: 'borrador' | 'en_revision' | 'vigente' | 'obsoleta';
  procesos_relacionados?: string[]; // IDs de procesos
  departamentos_aplicables?: string[]; // IDs de departamentos
  puntos_norma?: string[]; // Ej: ["4.1", "5.2", "6.2"]
  documento_url?: string;
  adjuntos?: { nombre: string; url: string }[];
  createdAt?: string;
  updatedAt?: string;
  created_by?: string;
  updated_by?: string;
  isActive?: boolean;
}

export interface CreatePoliticaData {
  organization_id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  contenido?: string;
  proposito?: string;
  alcance?: string;
  version?: string;
  fecha_aprobacion?: string;
  fecha_revision?: string;
  fecha_proxima_revision?: string;
  aprobador_id?: string;
  estado: string;
  procesos_relacionados?: string[];
  departamentos_aplicables?: string[];
  puntos_norma?: string[];
  documento_url?: string;
  adjuntos?: { nombre: string; url: string }[];
}

export interface UpdatePoliticaData extends Partial<CreatePoliticaData> {
  id: string;
}

export type PoliticaEstado =
  | 'borrador'
  | 'en_revision'
  | 'vigente'
  | 'obsoleta';
