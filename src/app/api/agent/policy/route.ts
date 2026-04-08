import { withTerminalAuth } from '@/lib/api/withTerminalAuth'
import { TerminalPolicyService } from '@/services/terminal/TerminalPolicyService'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export const GET = withTerminalAuth(async (_req: NextRequest, ctx) => {
  try {
    const effectivePolicy = await TerminalPolicyService.resolvePolicy(
      ctx.terminal.id,
      ctx.organization_id
    )

    return NextResponse.json(
      { success: true, data: effectivePolicy },
      {
        headers: {
          'Cache-Control': 'max-age=300',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    )
  }
})
