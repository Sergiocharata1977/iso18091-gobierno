/**
 * POST /api/agent/pair
 *
 * Endpoint publico (sin autenticacion) para que un agente local active su terminal
 * usando un pairing_code de un solo uso generado previamente en la UI.
 *
 * Flujo:
 * 1. Valida el body con Zod.
 * 2. Busca en Firestore el terminal con pairing_code + status === 'pending'.
 * 3. Verifica que pairing_expires_at > now.
 * 4. Actualiza el documento a status 'active' con los datos del agente.
 * 5. Genera un JWT firmado con TERMINAL_JWT_SECRET (HMAC-SHA256 nativo).
 * 6. Devuelve { success: true, data: { terminal_id, terminal_token, organization_id } }.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminFirestore } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Validacion de entrada
// ---------------------------------------------------------------------------

const PairBodySchema = z.object({
  pairing_code: z.string().min(1),
  organization_id: z.string().min(1),
  hostname: z.string().min(1),
  os: z.enum(['windows', 'macos', 'linux']),
  ip_local: z.string().optional(),
  mac_address: z.string().optional(),
  agent_version: z.string().min(1),
})

type PairBody = z.infer<typeof PairBodySchema>

// ---------------------------------------------------------------------------
// Generacion JWT minima con HMAC-SHA256 nativo (Node.js crypto)
// Mismo patron que withTerminalAuth.ts — no se usa jose ni jsonwebtoken
// ---------------------------------------------------------------------------

async function signHS256JWT(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const crypto = await import('crypto')

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signingInput = `${header}.${body}`

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url')

  return `${signingInput}.${signature}`
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parsear y validar body
  let body: PairBody
  try {
    const raw: unknown = await req.json()
    const parsed = PairBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    body = parsed.data
  } catch {
    return NextResponse.json(
      { success: false, error: 'INVALID_JSON' },
      { status: 400 }
    )
  }

  // 2. Buscar terminal con pairing_code === body.pairing_code AND status === 'pending'
  try {
    const db = getAdminFirestore()
    const terminalsRef = db
      .collection('organizations')
      .doc(body.organization_id)
      .collection('terminals')

    const snapshot = await terminalsRef
      .where('pairing_code', '==', body.pairing_code)
      .where('status', '==', 'pending')
      .limit(1)
      .get()

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAIRING_CODE' },
        { status: 400 }
      )
    }

    const terminalDoc = snapshot.docs[0]
    const terminalData = terminalDoc.data()

    // 3. Verificar que pairing_expires_at > now
    const expiresAt: Timestamp | undefined = terminalData.pairing_expires_at as Timestamp | undefined
    if (!expiresAt || expiresAt.toMillis() <= Date.now()) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAIRING_CODE' },
        { status: 400 }
      )
    }

    // 4. Actualizar el documento — activar terminal con datos del agente
    await terminalDoc.ref.update({
      status: 'active',
      hostname: body.hostname,
      os: body.os,
      ...(body.ip_local !== undefined ? { ip_local: body.ip_local } : {}),
      ...(body.mac_address !== undefined ? { mac_address: body.mac_address } : {}),
      agent_version: body.agent_version,
      activated_at: Timestamp.now(),
      pairing_code: FieldValue.delete(),
      pairing_expires_at: FieldValue.delete(),
    })

    // 5. Generar terminal_token (JWT HS256, expiry 1 year)
    const secret = process.env.TERMINAL_JWT_SECRET
    if (!secret) {
      console.error('[pair] TERMINAL_JWT_SECRET no configurado')
      return NextResponse.json(
        { success: false, error: 'INTERNAL_SERVER_ERROR' },
        { status: 500 }
      )
    }

    const nowSec = Math.floor(Date.now() / 1000)
    const oneYearSec = 365 * 24 * 60 * 60

    const jwtPayload = {
      terminal_id: terminalDoc.id,
      organization_id: body.organization_id,
      iat: nowSec,
      exp: nowSec + oneYearSec,
    }

    const terminal_token = await signHS256JWT(jwtPayload, secret)

    // 6. Responder con exito
    return NextResponse.json(
      {
        success: true,
        data: {
          terminal_id: terminalDoc.id,
          terminal_token,
          organization_id: body.organization_id,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[pair] Error de Firestore u otro error interno:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}
