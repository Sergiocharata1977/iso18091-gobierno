import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { withTerminalAuth } from '@/lib/api/withTerminalAuth'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { ToolName } from '@/types/terminal'

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

const ApprovalRequestSchema = z.object({
  tool: z.enum(TOOL_NAMES),
  params: z.record(z.string(), z.unknown()),
  proceso_id: z.string().optional(),
  justification: z.string().min(1),
})

export const POST = withTerminalAuth(async (req: NextRequest, ctx) => {
  try {
    const body: unknown = await req.json()
    const parsed = ApprovalRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { tool, params, proceso_id, justification } = parsed.data

    const db = getAdminFirestore()

    const docData: Record<string, unknown> = {
      terminal_id: ctx.terminal.id,
      personnel_id: ctx.terminal.personnel_id,
      puesto_id: ctx.terminal.puesto_id,
      departamento_id: ctx.terminal.departamento_id,
      organization_id: ctx.organization_id,
      tool,
      params,
      result: 'pending_approval',
      required_approval: true,
      justification,
      timestamp: FieldValue.serverTimestamp(),
    }

    if (proceso_id !== undefined) {
      docData.proceso_id = proceso_id
    }

    const docRef = await db
      .collection('organizations')
      .doc(ctx.organization_id)
      .collection('terminal_action_log')
      .add(docData)

    return NextResponse.json(
      { success: true, data: { log_id: docRef.id, status: 'pending' } },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/agent/action/request]', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    )
  }
})
