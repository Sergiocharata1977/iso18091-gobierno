/**
 * POST /api/auth/logout
 *
 * Elimina la session cookie y revoca los refresh tokens del usuario.
 */

import { getAdminAuth } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;

    if (sessionCookie) {
      try {
        // Verificar la session cookie y obtener el UID
        const auth = getAdminAuth();
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);

        // Revocar todos los refresh tokens del usuario
        await auth.revokeRefreshTokens(decodedClaims.uid);

        console.log(
          '[API /auth/logout] Session revoked for user:',
          decodedClaims.uid
        );
      } catch (error) {
        // Si la cookie ya es inválida, continuamos con la eliminación
        console.log(
          '[API /auth/logout] Invalid session cookie, proceeding with deletion'
        );
      }
    }

    // Crear respuesta y eliminar la cookie
    const response = NextResponse.json(
      { success: true, message: 'Sesión cerrada exitosamente' },
      { status: 200 }
    );

    // Eliminar la session cookie
    response.cookies.set('session', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[API /auth/logout] Error during logout:', error);

    // Incluso si hay error, eliminamos la cookie
    const response = NextResponse.json(
      { success: true, message: 'Sesión cerrada' },
      { status: 200 }
    );

    response.cookies.set('session', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  }
}
