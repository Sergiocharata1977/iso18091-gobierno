/**
 * withTerminalAuth - Middleware de autenticacion para terminales (agente local)
 *
 * Analogo a withAuth.ts pero para terminales fisicas, no usuarios web.
 * Verifica un JWT firmado con TERMINAL_JWT_SECRET usando crypto nativo de Node.js
 * (no se requiere libreria externa: jose ni jsonwebtoken no estan en package.json).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export interface TerminalAuthContext {
  terminal: {
    id: string
    organization_id: string
    status: string
    personnel_id: string
    puesto_id: string
    departamento_id: string
    puesto_nombre: string
    departamento_nombre: string
    agent_version: string
    hostname: string
    [key: string]: unknown
  }
  organization_id: string
}

type TerminalAuthHandler = (
  req: NextRequest,
  ctx: TerminalAuthContext
) => Promise<NextResponse | Response>

// ---------------------------------------------------------------------------
// Verificacion JWT minima con crypto nativo (HS256)
// No usamos jose ni jsonwebtoken porque no estan en package.json
// ---------------------------------------------------------------------------

function base64UrlDecode(str: string): string {
  // Reemplazar caracteres URL-safe y agregar padding
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return Buffer.from(padded, 'base64').toString('utf8')
}

async function verifyHS256JWT(
  token: string,
  secret: string
): Promise<{ terminal_id: string; organization_id: string }> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('JWT malformado: se esperan 3 partes')
  }

  const [headerB64, payloadB64, signatureB64] = parts

  // Verificar firma con HMAC-SHA256 usando crypto nativo de Node
  const crypto = await import('crypto')
  const signingInput = `${headerB64}.${payloadB64}`
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url')

  if (expectedSig !== signatureB64) {
    throw new Error('Firma JWT invalida')
  }

  // Decodificar payload
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64))
  } catch {
    throw new Error('Payload JWT no es JSON valido')
  }

  // Verificar expiracion si existe
  if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT expirado')
  }

  // Verificar campos requeridos
  if (typeof payload.terminal_id !== 'string' || typeof payload.organization_id !== 'string') {
    throw new Error('JWT no contiene terminal_id u organization_id')
  }

  return {
    terminal_id: payload.terminal_id,
    organization_id: payload.organization_id,
  }
}

// ---------------------------------------------------------------------------
// Middleware principal
// ---------------------------------------------------------------------------

export function withTerminalAuth(handler: TerminalAuthHandler) {
  return async (req: NextRequest): Promise<NextResponse | Response> => {
    try {
      const authHeader = req.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, error: 'MISSING_TOKEN' },
          { status: 401 }
        )
      }
      const token = authHeader.slice(7)

      const secret = process.env.TERMINAL_JWT_SECRET
      if (!secret) {
        return NextResponse.json(
          { success: false, error: 'SERVER_MISCONFIGURED' },
          { status: 500 }
        )
      }

      // Verificar y decodificar token con HMAC-SHA256 nativo
      let payload: { terminal_id: string; organization_id: string }
      try {
        payload = await verifyHS256JWT(token, secret)
      } catch (jwtError) {
        console.warn('[withTerminalAuth] JWT invalido:', jwtError instanceof Error ? jwtError.message : jwtError)
        return NextResponse.json(
          { success: false, error: 'INVALID_TOKEN' },
          { status: 401 }
        )
      }

      const db = getAdminFirestore()
      const terminalDoc = await db
        .collection('organizations')
        .doc(payload.organization_id)
        .collection('terminals')
        .doc(payload.terminal_id)
        .get()

      if (!terminalDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'TERMINAL_NOT_FOUND' },
          { status: 401 }
        )
      }

      const terminal = { id: terminalDoc.id, ...terminalDoc.data() } as TerminalAuthContext['terminal']

      if (terminal.status === 'quarantined') {
        return NextResponse.json(
          { success: false, error: 'TERMINAL_QUARANTINED' },
          { status: 403 }
        )
      }

      if (terminal.status !== 'active') {
        return NextResponse.json(
          { success: false, error: 'TERMINAL_NOT_ACTIVE' },
          { status: 401 }
        )
      }

      return handler(req, {
        terminal: terminal as TerminalAuthContext['terminal'],
        organization_id: payload.organization_id,
      })
    } catch (error) {
      console.error('[withTerminalAuth]', error)
      return NextResponse.json(
        { success: false, error: 'INVALID_TOKEN' },
        { status: 401 }
      )
    }
  }
}
