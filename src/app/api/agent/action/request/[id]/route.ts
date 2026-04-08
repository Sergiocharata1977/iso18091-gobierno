import { NextRequest, NextResponse } from 'next/server'
import { withTerminalAuth, TerminalAuthContext } from '@/lib/api/withTerminalAuth'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { ActionResult } from '@/types/terminal-action-log'

export const dynamic = 'force-dynamic'

async function handler(
  _req: NextRequest,
  ctx: TerminalAuthContext,
  logId: string
): Promise<NextResponse> {
  const db = getAdminFirestore()

  const docSnap = await db
    .collection('organizations')
    .doc(ctx.organization_id)
    .collection('terminal_action_log')
    .doc(logId)
    .get()

  if (!docSnap.exists) {
    return NextResponse.json(
      { success: false, error: 'LOG_NOT_FOUND' },
      { status: 404 }
    )
  }

  const logData = docSnap.data()!

  // Security: the log must belong to the requesting terminal
  if (logData.terminal_id !== ctx.terminal.id) {
    return NextResponse.json(
      { success: false, error: 'LOG_NOT_FOUND' },
      { status: 404 }
    )
  }

  const status = logData.result as ActionResult
  const approved_by: string | null =
    typeof logData.approved_by === 'string' ? logData.approved_by : null

  return NextResponse.json({
    success: true,
    data: { status, approved_by },
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse | Response> {
  const { id } = await params
  return withTerminalAuth((r, ctx) => handler(r, ctx, id))(req)
}
