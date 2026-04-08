import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async () => {
    try {
      return NextResponse.json(
        {
          success: true,
          references: [],
          count: 0,
          message: 'Endpoint temporalmente deshabilitado - en refactorizacion',
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('[API] Error en by-record:', error);
      return NextResponse.json(
        { error: 'Error al obtener documentos' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
