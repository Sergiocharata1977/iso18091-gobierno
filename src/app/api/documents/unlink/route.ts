import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(
  async () => {
    try {
      return NextResponse.json(
        {
          success: false,
          message: 'Endpoint temporalmente deshabilitado - en refactorizacion',
        },
        { status: 503 }
      );
    } catch (error) {
      console.error('[API] Error en unlink:', error);
      return NextResponse.json(
        { error: 'Error al desvincular documento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
