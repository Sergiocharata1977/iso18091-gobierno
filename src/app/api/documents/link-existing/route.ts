import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const POST = withAuth(
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
      console.error('[API] Error en link-existing:', error);
      return NextResponse.json(
        { error: 'Error al vincular documento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
