/**
 * TerminalPolicyService
 *
 * Resuelve la politica efectiva de una terminal aplicando merge progresivo
 * de politicas por departamento, puesto y terminal especifica.
 * Mayor especificidad gana (departamento < puesto < terminal).
 */

import { getAdminFirestore } from '@/lib/firebase/admin'
import { EffectivePolicy, MINIMAL_POLICY } from '@/types/terminal-policy'
import { ToolName } from '@/types/terminal'

export class TerminalPolicyService {
  static async resolvePolicy(
    terminalId: string,
    orgId: string
  ): Promise<EffectivePolicy> {
    const db = getAdminFirestore()
    const orgRef = db.collection('organizations').doc(orgId)

    // 1. Obtener terminal para saber departamento_id y puesto_id
    const terminalDoc = await orgRef.collection('terminals').doc(terminalId).get()
    if (!terminalDoc.exists) return { ...MINIMAL_POLICY }

    const terminal = terminalDoc.data()!
    const { departamento_id, puesto_id } = terminal

    // 2. Cargar todas las politicas activas de la org ordenadas por prioridad
    const policiesSnap = await orgRef
      .collection('terminal_policies')
      .where('activo', '==', true)
      .orderBy('prioridad', 'asc')
      .get()

    const policies = policiesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<{
      id: string
      departamento_id?: string
      puesto_id?: string
      terminal_id?: string
      allowed_tools?: string[]
      require_approval_for?: string[]
      allowed_hours?: EffectivePolicy['allowed_hours']
      [key: string]: unknown
    }>

    // 3. Separar por scope (de menos especifico a mas especifico)
    const deptPolicies = policies.filter(p => p.departamento_id === departamento_id)
    const puestoPolicies = policies.filter(p => p.puesto_id === puesto_id)
    const terminalPolicies = policies.filter(p => p.terminal_id === terminalId)

    // 4. Merge progresivo: mayor especificidad gana sobre campos escalares,
    //    allowed_tools hace union acumulativa
    const effective: EffectivePolicy = { ...MINIMAL_POLICY }

    for (const p of [...deptPolicies, ...puestoPolicies, ...terminalPolicies]) {
      if (p.allowed_tools?.length) {
        // Union de tools: las politicas mas especificas agregan, no reemplazan
        const existing = new Set(effective.allowed_tools)
        p.allowed_tools.forEach((t: string) => existing.add(t as ToolName))
        effective.allowed_tools = Array.from(existing) as ToolName[]
      }
      if (p.require_approval_for?.length) {
        // La politica mas especifica reemplaza el listado de aprobacion requerida
        effective.require_approval_for = p.require_approval_for as ToolName[]
      }
      if (p.allowed_hours) {
        // La politica mas especifica reemplaza las horas permitidas
        effective.allowed_hours = p.allowed_hours
      }
    }

    return effective
  }
}
