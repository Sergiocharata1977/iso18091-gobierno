/**
 * POST /api/auth/session
 *
 * Crea una session cookie a partir de un ID token de Firebase.
 * Esta cookie se usa para autenticación server-side en middleware.
 */

import { checkRateLimit } from '@/lib/api/rateLimit';
import { getAdminAuth } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

// Duración de la sesión: 14 días
const SESSION_DURATION = 60 * 60 * 24 * 14 * 1000; // 14 días en milisegundos

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token es requerido' },
        { status: 400 }
      );
    }

    // Verificar el ID token
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    // Crear session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION,
    });

    // Configurar la cookie en la respuesta
    const response = NextResponse.json(
      {
        success: true,
        uid: decodedToken.uid,
        email: decodedToken.email,
      },
      { status: 200 }
    );

    // Establecer la cookie con opciones seguras
    response.cookies.set('session', sessionCookie, {
      maxAge: SESSION_DURATION / 1000, // en segundos
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[API /auth/session] Error creating session:', error);

    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string };

      if (firebaseError.code === 'auth/id-token-expired') {
        return NextResponse.json(
          {
            error: 'Token expirado',
            message: 'El token de autenticación ha expirado',
          },
          { status: 401 }
        );
      }

      if (firebaseError.code === 'auth/invalid-id-token') {
        return NextResponse.json(
          {
            error: 'Token inválido',
            message: 'El token de autenticación es inválido',
          },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Error al crear sesión', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
