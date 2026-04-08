import { getAdminFirestore } from '@/lib/firebase/admin'
import { TerminalPolicyService } from '@/services/terminal/TerminalPolicyService'
import type { TerminalActionLog } from '@/types/terminal-action-log'
import type { EffectivePolicy } from '@/types/terminal-policy'
import type { Terminal, TerminalStatus, ToolName } from '@/types/terminal'

// ---------------------------------------------------------------------------
// Flat DTO — "última milla operativa" legible para negocio, IA y dashboards
// ---------------------------------------------------------------------------

export interface TerminalNarrativeResult {
  terminalId: string
  nombre_display: string
  persona: {
    nombre: string
    puesto: string
    departamento?: string
  } | null
  estado: 'activo' | 'cuarentena' | 'pendiente_aprobacion' | 'inactivo'
  politica_resumen: string
  approvals_pendientes: number
  canal_principal: 'terminal' | 'whatsapp' | 'email'
  descripcion_negocio: string
  requiere_aprobacion_humana: boolean
  ultima_actividad?: string
}

type FirestoreDoc = Record<string, unknown>

export interface TerminalNarrativePerson {
  id: string
  displayName: string
  nombres?: string
  apellidos?: string
  puestoNombre?: string
  departamentoNombre?: string
}

export interface TerminalNarrativeApproval {
  id: string
  tool: ToolName
  requestedAt: TerminalActionLog['timestamp']
  justification: string | null
  businessLabel: string
}

export interface TerminalNarrativeState {
  code: TerminalStatus
  label: string
  businessLabel: string
  isQuarantined: boolean
  requiresHumanApproval: boolean
}

export interface TerminalNarrativePolicy {
  allowedTools: ToolName[]
  approvalRequiredFor: ToolName[]
  allowedHours?: EffectivePolicy['allowed_hours']
  humanApprovalRequired: boolean
}

export interface TerminalNarrativeSummary {
  terminal: Terminal
  person: TerminalNarrativePerson
  state: TerminalNarrativeState
  policy: TerminalNarrativePolicy
  pendingApprovals: TerminalNarrativeApproval[]
  businessExplanation: string
  phrasing: {
    directedAction: string
    quarantine: string
    humanApproval: string
  }
}

export class TerminalNarrativeService {
  static async getNarrativeByTerminal(
    orgId: string,
    terminalId: string
  ): Promise<TerminalNarrativeSummary | null> {
    const db = getAdminFirestore()
    const terminalDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('terminals')
      .doc(terminalId)
      .get()

    if (!terminalDoc.exists) {
      return null
    }

    const terminal = {
      id: terminalDoc.id,
      ...(terminalDoc.data() as Omit<Terminal, 'id'>),
    }

    return this.buildNarrative(orgId, terminal)
  }

  static async getNarrativesByOrganization(
    orgId: string
  ): Promise<TerminalNarrativeSummary[]> {
    const db = getAdminFirestore()
    const snapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('terminals')
      .where('organization_id', '==', orgId)
      .orderBy('last_heartbeat', 'desc')
      .get()

    const terminals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Terminal, 'id'>),
    }))

    return Promise.all(terminals.map(terminal => this.buildNarrative(orgId, terminal)))
  }

  static buildDirectedActionLabel(personName: string, terminalName: string): string {
    return `accion dirigida a ${personName} en ${terminalName}`
  }

  static buildTerminalStateLabel(status: TerminalStatus): string {
    if (status === 'quarantined') {
      return 'terminal en cuarentena'
    }

    return TERMINAL_STATUS_COPY[status].businessLabel
  }

  static buildHumanApprovalLabel(hasPendingApprovals: boolean): string {
    return hasPendingApprovals ? 'requiere aprobacion humana' : 'operacion sin aprobacion humana pendiente'
  }

  private static async buildNarrative(
    orgId: string,
    terminal: Terminal
  ): Promise<TerminalNarrativeSummary> {
    const [person, effectivePolicy, pendingApprovals] = await Promise.all([
      this.resolvePerson(orgId, terminal.personnel_id, terminal),
      TerminalPolicyService.resolvePolicy(terminal.id, orgId),
      this.getPendingApprovals(orgId, terminal.id),
    ])

    const state = this.buildState(terminal.status, pendingApprovals.length > 0)
    const policy = this.buildPolicy(effectivePolicy)
    const phrasing = {
      directedAction: this.buildDirectedActionLabel(person.displayName, terminal.nombre),
      quarantine: this.buildTerminalStateLabel(terminal.status),
      humanApproval: this.buildHumanApprovalLabel(
        pendingApprovals.length > 0 || policy.humanApprovalRequired
      ),
    }

    return {
      terminal,
      person,
      state,
      policy,
      pendingApprovals,
      businessExplanation: this.buildBusinessExplanation({
        terminal,
        personName: person.displayName,
        state,
        policy,
        pendingApprovals,
      }),
      phrasing,
    }
  }

  private static buildState(
    status: TerminalStatus,
    requiresHumanApproval: boolean
  ): TerminalNarrativeState {
    const copy = TERMINAL_STATUS_COPY[status]

    return {
      code: status,
      label: copy.label,
      businessLabel: copy.businessLabel,
      isQuarantined: status === 'quarantined',
      requiresHumanApproval,
    }
  }

  private static buildPolicy(effectivePolicy: EffectivePolicy): TerminalNarrativePolicy {
    return {
      allowedTools: effectivePolicy.allowed_tools,
      approvalRequiredFor: effectivePolicy.require_approval_for,
      allowedHours: effectivePolicy.allowed_hours,
      humanApprovalRequired: effectivePolicy.require_approval_for.length > 0,
    }
  }

  private static async resolvePerson(
    orgId: string,
    personnelId: string,
    terminal: Terminal
  ): Promise<TerminalNarrativePerson> {
    const db = getAdminFirestore()
    const nestedRef = db
      .collection('organizations')
      .doc(orgId)
      .collection('personnel')
      .doc(personnelId)

    const [nestedDoc, globalDoc] = await Promise.all([
      nestedRef.get(),
      db.collection('personnel').doc(personnelId).get(),
    ])

    const source =
      (nestedDoc.exists ? (nestedDoc.data() as FirestoreDoc) : null) ??
      (globalDoc.exists ? (globalDoc.data() as FirestoreDoc) : null)

    const displayName = this.resolvePersonDisplayName(source, personnelId)

    return {
      id: personnelId,
      displayName,
      nombres: this.readOptionalString(source, 'nombres'),
      apellidos: this.readOptionalString(source, 'apellidos'),
      puestoNombre:
        this.readOptionalString(source, 'puesto_nombre') ||
        this.readOptionalString(source, 'puesto') ||
        terminal.puesto_nombre,
      departamentoNombre:
        this.readOptionalString(source, 'departamento_nombre') ||
        this.readOptionalString(source, 'departamento') ||
        terminal.departamento_nombre,
    }
  }

  private static async getPendingApprovals(
    orgId: string,
    terminalId: string
  ): Promise<TerminalNarrativeApproval[]> {
    const db = getAdminFirestore()
    const snapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('terminal_action_log')
      .where('terminal_id', '==', terminalId)
      .where('result', '==', 'pending_approval')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get()

    return snapshot.docs.map(doc => {
      const log = {
        id: doc.id,
        ...(doc.data() as Omit<TerminalActionLog, 'id'>),
      }

      return {
        id: log.id,
        tool: log.tool,
        requestedAt: log.timestamp,
        justification: this.extractJustification(log.params),
        businessLabel: this.formatToolLabel(log.tool),
      }
    })
  }

  private static buildBusinessExplanation({
    terminal,
    personName,
    state,
    policy,
    pendingApprovals,
  }: {
    terminal: Terminal
    personName: string
    state: TerminalNarrativeState
    policy: TerminalNarrativePolicy
    pendingApprovals: TerminalNarrativeApproval[]
  }): string {
    if (state.code === 'quarantined') {
      return `${terminal.nombre} de ${personName} esta en cuarentena. Sentinel quedo bloqueado hasta intervencion humana.`
    }

    if (state.code === 'pending') {
      return `${terminal.nombre} fue asignada a ${personName}, pero todavia espera activacion con pairing code para operar.`
    }

    if (pendingApprovals.length > 0) {
      return `${personName} tiene ${pendingApprovals.length} aprobacion${pendingApprovals.length === 1 ? '' : 'es'} pendiente${pendingApprovals.length === 1 ? '' : 's'} en ${terminal.nombre}. Sentinel espera decision humana antes de continuar.`
    }

    if (policy.humanApprovalRequired) {
      return `Sentinel puede operar en ${terminal.nombre} para ${personName}, pero las acciones sensibles requieren aprobacion humana segun la politica vigente.`
    }

    if (state.code === 'offline') {
      return `${terminal.nombre} pertenece a ${personName} y conserva su politica operativa, pero la terminal esta offline y no reporta actividad reciente.`
    }

    return `Sentinel esta activo en ${terminal.nombre} para ${personName}, con politica aplicada y trazabilidad lista para operar sobre la ultima milla.`
  }

  private static resolvePersonDisplayName(
    source: FirestoreDoc | null,
    fallbackId: string
  ): string {
    if (!source) {
      return fallbackId
    }

    const nombres = this.readOptionalString(source, 'nombres')
    const apellidos = this.readOptionalString(source, 'apellidos')
    const fullName = [nombres, apellidos].filter(Boolean).join(' ').trim()

    return (
      fullName ||
      this.readOptionalString(source, 'nombre_completo') ||
      this.readOptionalString(source, 'full_name') ||
      this.readOptionalString(source, 'nombre') ||
      fallbackId
    )
  }

  private static extractJustification(params: Record<string, unknown>): string | null {
    const candidateKeys = ['justification', 'reason', 'motivo', 'context', 'prompt']

    for (const key of candidateKeys) {
      const value = params[key]
      if (typeof value === 'string' && value.trim()) {
        return value.trim()
      }
    }

    return null
  }

  private static formatToolLabel(tool: ToolName): string {
    return TOOL_LABELS[tool] ?? tool
  }

  private static readOptionalString(
    source: FirestoreDoc | null,
    key: string
  ): string | undefined {
    const value = source?.[key]
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
  }
}

const TERMINAL_STATUS_COPY: Record<
  TerminalStatus,
  { label: string; businessLabel: string }
> = {
  pending: {
    label: 'Pendiente',
    businessLabel: 'terminal pendiente de activacion',
  },
  active: {
    label: 'Activa',
    businessLabel: 'terminal operativa',
  },
  offline: {
    label: 'Offline',
    businessLabel: 'terminal sin conexion reciente',
  },
  quarantined: {
    label: 'En cuarentena',
    businessLabel: 'terminal en cuarentena',
  },
}

const TOOL_LABELS: Partial<Record<ToolName, string>> = {
  browser_navigate: 'navegacion asistida',
  browser_screenshot: 'captura de navegador',
  browser_click: 'interaccion en navegador',
  browser_fill_form: 'carga automatizada de formulario',
  file_read: 'lectura de archivo',
  file_write: 'escritura de archivo',
  clipboard_read: 'lectura de portapapeles',
  clipboard_write: 'escritura de portapapeles',
  app_open: 'apertura de aplicacion',
  don_candido_chat: 'chat con Don Candido',
}
