export interface ReunionTrabajo {
  id: string;
  organization_id: string;
  tipo:
    | 'management_review'
    | 'proceso'
    | 'departamental'
    | 'general'
    | 'auditoria';
  titulo: string;
  fecha: string; // Fecha y hora de la reunión
  duracion_minutos?: number;
  lugar?: string;
  modalidad: 'presencial' | 'virtual' | 'hibrida';
  organizador_id: string;
  organizador_nombre?: string;
  facilitador_id?: string;
  facilitador_nombre?: string;
  participantes: Array<{
    usuario_id: string;
    usuario_nombre: string;
    rol?: 'asistente' | 'invitado' | 'observador';
    asistio: boolean;
  }>;
  agenda: Array<{
    orden: number;
    tema: string;
    responsable_presentacion?: string;
    tiempo_estimado?: number;
    estado: 'planificado' | 'tratado' | 'aplazado';
  }>;
  puntos_tratados: Array<{
    tema: string;
    discusion: string;
    decisiones: string[];
    responsables_acciones?: string[];
  }>;
  acuerdos: Array<{
    descripcion: string;
    responsable_id: string;
    responsable_nombre?: string;
    fecha_compromiso?: string;
    estado: 'pendiente' | 'en_proceso' | 'cumplido' | 'cancelado';
  }>;
  acta_url?: string;
  grabacion_url?: string;
  adjuntos?: { nombre: string; url: string }[];
  estado: 'planificada' | 'realizada' | 'cancelada' | 'aplazada';
  relacionada_proceso_id?: string;
  relacionada_auditoria_id?: string;
  createdAt: string;
  updatedAt: string;
  created_by?: string;
  isActive?: boolean;
}

export interface CreateReunionData {
  tipo: string;
  titulo: string;
  fecha: string;
  duracion_minutos?: number;
  lugar?: string;
  modalidad: string;
  organizador_id: string;
  facilitador_id?: string;
  participantes: Array<{ usuario_id: string; rol?: string }>;
  agenda?: Array<{ orden: number; tema: string; tiempo_estimado?: number }>;
  relacionada_proceso_id?: string;
  relacionada_auditoria_id?: string;
}

export interface UpdateReunionData extends Partial<CreateReunionData> {
  id: string;
  puntos_tratados?: Array<{
    tema: string;
    discusion: string;
    decisiones: string[];
    responsables_acciones?: string[];
  }>;
  acuerdos?: Array<{
    descripcion: string;
    responsable_id: string;
    fecha_compromiso?: string;
  }>;
  acta_url?: string;
  grabacion_url?: string;
  adjuntos?: { nombre: string; url: string }[];
  estado?: string;
}

export type ReunionTipo =
  | 'management_review'
  | 'proceso'
  | 'departamental'
  | 'general'
  | 'auditoria';
export type ReunionModalidad = 'presencial' | 'virtual' | 'hibrida';
export type ReunionEstado =
  | 'planificada'
  | 'realizada'
  | 'cancelada'
  | 'aplazada';
export type ParticipanteRol = 'asistente' | 'invitado' | 'observador';
export type AgendaEstado = 'planificado' | 'tratado' | 'aplazado';
export type AcuerdoEstado =
  | 'pendiente'
  | 'en_proceso'
  | 'cumplido'
  | 'cancelado';
