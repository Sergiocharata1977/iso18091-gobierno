// Tipo estructural compatible con firebase-admin/firestore y firebase/firestore
type FirestoreTimestamp = {
  seconds: number
  nanoseconds: number
  toDate(): Date
}

export type TerminalStatus = 'pending' | 'active' | 'offline' | 'quarantined'

export type ToolName =
  | 'browser_navigate'
  | 'browser_screenshot'
  | 'browser_click'
  | 'browser_fill_form'
  | 'file_read'
  | 'file_write'
  | 'clipboard_read'
  | 'clipboard_write'
  | 'app_open'
  | 'don_candido_chat'

export interface Terminal {
  id: string
  organization_id: string
  nombre: string
  hostname: string
  os: 'windows' | 'macos' | 'linux'
  ip_local?: string
  mac_address?: string
  personnel_id: string
  puesto_id: string
  departamento_id: string
  puesto_nombre: string
  departamento_nombre: string
  personnel_nombre?: string
  personnel_email?: string
  personnel_telefono?: string
  personnel_estado?: string
  status: TerminalStatus
  agent_version: string
  last_heartbeat: FirestoreTimestamp
  last_ip?: string
  pending_approvals?: number
  requires_human_approval?: boolean
  policy_summary?: string
  pairing_code?: string
  pairing_expires_at?: FirestoreTimestamp
  created_at: FirestoreTimestamp
  activated_at?: FirestoreTimestamp
}

export interface TerminalHeartbeat {
  terminal_id: string
  status: 'online' | 'idle' | 'active'
  agent_version: string
  ip_local: string
  last_seen: FirestoreTimestamp
}
