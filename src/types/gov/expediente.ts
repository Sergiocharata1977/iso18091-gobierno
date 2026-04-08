type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
};

export type EstadoExpediente =
  | 'recibido'
  | 'admitido'
  | 'en_analisis'
  | 'derivado'
  | 'observado'
  | 'resuelto'
  | 'archivado';

export interface HistorialEstado {
  estado: EstadoExpediente;
  fecha: FirestoreTimestamp;
  responsable_id: string;
  responsable_nombre: string;
  comentario?: string;
}

export interface Expediente {
  id: string;
  organization_id: string;
  numero: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  ciudadano_id?: string;
  ciudadano_nombre?: string;
  estado: EstadoExpediente;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  area_responsable_id?: string;
  area_responsable_nombre?: string;
  responsable_id?: string;
  responsable_nombre?: string;
  canal_ingreso: 'presencial' | 'whatsapp' | 'web' | 'telefono' | 'email';
  sla_horas?: number;
  fecha_vencimiento?: FirestoreTimestamp;
  historial: HistorialEstado[];
  adjuntos?: string[];
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}
