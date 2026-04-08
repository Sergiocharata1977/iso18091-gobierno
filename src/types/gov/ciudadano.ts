export type FirestoreTimestamp = {
  seconds: number
  nanoseconds: number
  toDate(): Date
}

export const CIUDADANO_TIPOS = [
  'vecino',
  'contribuyente',
  'organismo',
  'empresa',
  'otro',
] as const

export type CiudadanoTipo = (typeof CIUDADANO_TIPOS)[number]

export const CIUDADANO_CANALES_PREFERIDOS = [
  'presencial',
  'whatsapp',
  'web',
  'telefono',
  'email',
] as const

export type CiudadanoCanalPreferido =
  (typeof CIUDADANO_CANALES_PREFERIDOS)[number]

export interface Ciudadano {
  id: string
  organization_id: string
  dni?: string
  nombre: string
  apellido: string
  email?: string
  telefono?: string
  direccion?: string
  barrio?: string
  tipo: CiudadanoTipo
  canal_preferido: CiudadanoCanalPreferido
  etiquetas?: string[]
  activo: boolean
  created_at: FirestoreTimestamp
  updated_at: FirestoreTimestamp
}

export const RECLAMO_ESTADOS = [
  'abierto',
  'en_revision',
  'en_gestion',
  'resuelto',
  'cerrado',
  'cancelado',
] as const

export type ReclamoEstado = (typeof RECLAMO_ESTADOS)[number]

export interface Reclamo {
  id: string
  organization_id: string
  ciudadano_id: string
  titulo: string
  descripcion?: string
  canal: CiudadanoCanalPreferido
  estado: ReclamoEstado
  barrio?: string
  etiquetas?: string[]
  created_at: FirestoreTimestamp
  updated_at: FirestoreTimestamp
}

export const SOLICITUD_CIUDADANA_ESTADOS = [
  'pendiente',
  'en_proceso',
  'resuelta',
  'rechazada',
  'cancelada',
] as const

export type SolicitudCiudadanaEstado =
  (typeof SOLICITUD_CIUDADANA_ESTADOS)[number]

export interface Solicitud {
  id: string
  organization_id: string
  ciudadano_id: string
  tipo: string
  descripcion?: string
  canal: CiudadanoCanalPreferido
  estado: SolicitudCiudadanaEstado
  created_at: FirestoreTimestamp
  updated_at: FirestoreTimestamp
}
