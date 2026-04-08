import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { withTerminalAuth } from '@/lib/api/withTerminalAuth'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { TerminalPolicyService } from '@/services/terminal/TerminalPolicyService'
import { SystemActivityLogService } from '@/services/system/SystemActivityLogService'
import { ToolName } from '@/types/terminal'
import { ActionResult } from '@/types/terminal-action-log'

export const dynamic = 'force-dynamic'

const TOOL_NAMES: [ToolName, ...ToolName[]] = [
  'browser_navigate',
  'browser_screenshot',
  'browser_click',
  'browser_fill_form',
  'file_read',
  'file_write',
  'clipboard_read',
  'clipboard_write',
  'app_open',
  'don_candido_chat',
]

const LogActionSchema = z.object({
  tool: z.enum(TOOL_NAMES),
  params: z.record(z.string(), z.unknown()),
  result: z.enum(['success', 'blocked', 'error'] as [ActionResult, ...ActionResult[]]),
  duration_ms: z.number().int().nonnegative().optional(),
  proceso_id: z.string().optional(),
})

function mapCentralStatus(result: ActionResult): 'success' | 'failure' | 'denied' {
  if (result === 'blocked') {
    return 'denied'
  }

  if (result === 'error') {
    return 'failure'
  }

  return 'success'
}

function buildActionDescription(tool: ToolName, processLabel?: string | null): string {
  if (processLabel) {
    return `Terminal ejecuta ${tool} sobre proceso ${processLabel}`
  }

  return `Terminal ejecuta ${tool}`
}

async function resolveProcessLabel(
  db: ReturnType<typeof getAdminFirestore>,
  procesoId?: string
): Promise<string | null> {
  if (!procesoId) {
    return null
  }

  try {
    const processDoc = await db.collection('processes').doc(procesoId).get()

    if (!processDoc.exists) {
      return procesoId
    }

    const processData = processDoc.data() as
      | {
          codigo?: unknown
          process_code?: unknown
        }
      | undefined

    const processCode =
      typeof processData?.codigo === 'string'
        ? processData.codigo
        : typeof processData?.process_code === 'string'
          ? processData.process_code
          : null

    return processCode || procesoId
  } catch (error) {
    console.warn('[POST /api/agent/action/log] Error resolving process label:', error)
    return procesoId
  }
}

export const POST = withTerminalAuth(async (req: NextRequest, ctx) => {
  try {
    const body: unknown = await req.json()
    const parsed = LogActionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { tool, params, duration_ms, proceso_id } = parsed.data
    let result: ActionResult = parsed.data.result
    let block_reason: string | undefined

    const effectivePolicy = await TerminalPolicyService.resolvePolicy(
      ctx.terminal.id,
      ctx.organization_id
    )

    if (!effectivePolicy.allowed_tools.includes(tool)) {
      result = 'blocked'
      block_reason = 'TOOL_NOT_ALLOWED'
    }

    const db = getAdminFirestore()

    const docData: Record<string, unknown> = {
      terminal_id: ctx.terminal.id,
      personnel_id: ctx.terminal.personnel_id,
      puesto_id: ctx.terminal.puesto_id,
      departamento_id: ctx.terminal.departamento_id,
      organization_id: ctx.organization_id,
      tool,
      params,
      result,
      required_approval: false,
      timestamp: FieldValue.serverTimestamp(),
    }

    if (block_reason !== undefined) {
      docData.block_reason = block_reason
    }
    if (proceso_id !== undefined) {
      docData.proceso_id = proceso_id
    }
    if (duration_ms !== undefined) {
      docData.duration_ms = duration_ms
    }

    const docRef = await db
      .collection('organizations')
      .doc(ctx.organization_id)
      .collection('terminal_action_log')
      .add(docData)

    const processLabel = await resolveProcessLabel(db, proceso_id)
    const centralStatus = mapCentralStatus(result)
    const centralActionType =
      result === 'blocked' ? 'terminal_tool_blocked' : 'terminal_tool_executed'

    const centralLogId = await SystemActivityLogService.logSystemAction({
      organization_id: ctx.organization_id,
      occurred_at: new Date(),
      actor_type: 'terminal',
      actor_user_id: ctx.terminal.id,
      actor_display_name:
        typeof ctx.terminal.hostname === 'string' && ctx.terminal.hostname.trim().length > 0
          ? ctx.terminal.hostname
          : ctx.terminal.id,
      actor_role: 'local_agent',
      actor_department_id: ctx.terminal.departamento_id,
      actor_department_name:
        typeof ctx.terminal.departamento_nombre === 'string'
          ? ctx.terminal.departamento_nombre
          : null,
      source_module: 'terminales',
      source_submodule: 'agent_action_log',
      channel: 'terminal',
      entity_type: 'terminal_action',
      entity_id: docRef.id,
      entity_code: processLabel,
      action_type: centralActionType,
      action_label: tool,
      description: buildActionDescription(tool, processLabel),
      status: centralStatus,
      severity: result === 'error' ? 'medium' : result === 'blocked' ? 'low' : 'info',
      correlation_id: null,
      related_entities: [
        { entity_type: 'terminal', entity_id: ctx.terminal.id, relation: 'origin' },
        { entity_type: 'personnel', entity_id: ctx.terminal.personnel_id, relation: 'owner' },
        { entity_type: 'puesto', entity_id: ctx.terminal.puesto_id, relation: 'position' },
        {
          entity_type: 'departamento',
          entity_id: ctx.terminal.departamento_id,
          relation: 'department',
        },
        ...(proceso_id
          ? [
              {
                entity_type: 'process',
                entity_id: proceso_id,
                entity_code: processLabel,
                relation: 'iso_process',
              } as const,
            ]
          : []),
      ],
      metadata: {
        terminal_id: ctx.terminal.id,
        personnel_id: ctx.terminal.personnel_id,
        puesto_id: ctx.terminal.puesto_id,
        departamento_id: ctx.terminal.departamento_id,
        proceso_id: proceso_id ?? null,
        tool,
        result,
        duration_ms: duration_ms ?? null,
        block_reason: block_reason ?? null,
      },
    })

    if (!centralLogId) {
      console.warn('[POST /api/agent/action/log] Central system activity log write failed')
    }

    return NextResponse.json(
      { success: true, data: { log_id: docRef.id } },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/agent/action/log]', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    )
  }
})
