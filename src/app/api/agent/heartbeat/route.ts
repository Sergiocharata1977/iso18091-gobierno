import { withTerminalAuth } from '@/lib/api/withTerminalAuth'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

const heartbeatSchema = z.object({
  status: z.enum(['online', 'idle', 'active']),
  ip_local: z.string().trim().min(1, 'ip_local es requerido'),
  agent_version: z.string().trim().min(1, 'agent_version es requerido'),
})

export const dynamic = 'force-dynamic'

export const POST = withTerminalAuth(async (req: NextRequest, ctx) => {
  try {
    const body = heartbeatSchema.parse(await req.json())
    const db = getAdminFirestore()
    const now = Timestamp.now()
    const orgRef = db.collection('organizations').doc(ctx.organization_id)

    const heartbeat = {
      terminal_id: ctx.terminal.id,
      status: body.status,
      agent_version: body.agent_version,
      ip_local: body.ip_local,
      last_seen: now,
    }

    await Promise.all([
      orgRef.collection('terminal_heartbeats').doc(ctx.terminal.id).set(heartbeat, {
        merge: true,
      }),
      orgRef.collection('terminals').doc(ctx.terminal.id).set(
        {
          last_heartbeat: now,
          last_ip: body.ip_local,
          agent_version: body.agent_version,
        },
        { merge: true }
      ),
    ])

    return NextResponse.json({
      success: true,
      data: { received_at: new Date().toISOString() },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAYLOAD' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    )
  }
})
