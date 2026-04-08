export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
};

export type CanalAtencion =
  | 'presencial'
  | 'web'
  | 'whatsapp'
  | 'telefono'
  | 'email';

export interface ServicioPublico {
  id: string;
  organization_id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  area_responsable_id: string;
  area_responsable_nombre: string;
  canal_atencion: CanalAtencion[];
  requisitos: string[];
  sla_horas: number;
  sla_descripcion: string;
  costo?: number;
  moneda?: string;
  normativa_ids?: string[];
  activo: boolean;
  publico: boolean;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}
