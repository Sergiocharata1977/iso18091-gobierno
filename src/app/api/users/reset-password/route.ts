// API endpoint to send password reset email
// Protected: requires authenticated user

import { getAdminAuth } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, _context, auth) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    const adminAuth = getAdminAuth();

    console.log(
      '[API /users/reset-password] Sending reset email to:',
      email,
      'requested by:',
      auth.email
    );

    // Generate password reset link
    await adminAuth.generatePasswordResetLink(email);

    console.log('[API /users/reset-password] Reset link generated');

    return NextResponse.json({
      success: true,
      message: 'Email de restablecimiento enviado exitosamente',
    });
  } catch (error) {
    console.error('[API /users/reset-password] Error:', error);

    // Handle specific Firebase Auth errors
    if (error && typeof error === 'object' && 'errorInfo' in error) {
      const firebaseError = error as {
        errorInfo: { code: string; message: string };
      };

      if (firebaseError.errorInfo.code === 'auth/user-not-found') {
        return NextResponse.json(
          {
            error: 'Usuario no encontrado',
            message: 'No existe un usuario con este email.',
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Error al enviar email de restablecimiento',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
