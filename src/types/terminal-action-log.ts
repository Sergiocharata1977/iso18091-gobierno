import { ToolName } from './terminal'

// Tipo estructural compatible con firebase-admin/firestore y firebase/firestore
type FirestoreTimestamp = {
  seconds: number
  nanoseconds: number
  toDate(): Date
}

export type ActionResult = 'success' | 'blocked' | 'pending_approval' | 'error'

export interface TerminalActionLog {
  id: string
  organization_id: string
  terminal_id: string
  personnel_id: string
  puesto_id: string
  departamento_id: string
  proceso_id?: string
  tool: ToolName
  params: Record<string, unknown>
  result: ActionResult
  block_reason?: string
  required_approval: boolean
  approved_by?: string
  approved_at?: FirestoreTimestamp
  timestamp: FirestoreTimestamp
  duration_ms?: number
}
