// ─── PUNTO DE EXTENSIÓN ───────────────────────────────────────────────────────
// Interfaces para módulos de seguridad futuros.
// NO implementar nada aquí — solo declarar contratos.
// Futuro: organizations/{orgId}/terminal_security_events/{eventId}
// ─────────────────────────────────────────────────────────────────────────────
import { Timestamp } from 'firebase/firestore'
import { Terminal, TerminalHeartbeat } from './terminal'
import { TerminalActionLog } from './terminal-action-log'

export interface TerminalSecurityEvent {
  terminal_id: string
  organization_id: string
  event_type: string
  severity: 'info' | 'warning' | 'critical'
  payload: Record<string, unknown>
  source_module: string
  timestamp: Timestamp
}

export interface TerminalSecurityModule {
  name: string
  version: string
  analyze(event: TerminalActionLog): Promise<TerminalSecurityEvent | null>
  onHeartbeat(terminal: Terminal, hb: TerminalHeartbeat): Promise<TerminalSecurityEvent | null>
}
