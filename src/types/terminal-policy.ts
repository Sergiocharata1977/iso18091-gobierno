import { ToolName } from './terminal'

// Tipo estructural compatible con firebase-admin/firestore y firebase/firestore
type FirestoreTimestamp = {
  seconds: number
  nanoseconds: number
  toDate(): Date
}

export interface AllowedHours {
  from: string  // "HH:MM"
  to: string    // "HH:MM"
}

export interface TerminalPolicy {
  id: string
  organization_id: string
  nombre: string
  departamento_id?: string
  puesto_id?: string
  terminal_id?: string
  prioridad: number
  allowed_tools: ToolName[]
  require_approval_for: ToolName[]
  allowed_hours?: AllowedHours
  max_actions_per_hour?: number
  activo: boolean
  created_at: FirestoreTimestamp
  updated_at: FirestoreTimestamp
}

export interface EffectivePolicy {
  allowed_tools: ToolName[]
  require_approval_for: ToolName[]
  allowed_hours?: AllowedHours
}

export const MINIMAL_POLICY: EffectivePolicy = {
  allowed_tools: ['don_candido_chat'],
  require_approval_for: [],
}
