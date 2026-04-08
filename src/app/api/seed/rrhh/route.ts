import {
  isSeedExecutionBlockedInProduction,
  logSeedExecution,
  SEED_ALLOWED_ROLES,
} from '@/lib/api/seedSecurity';
import { withAuth } from '@/lib/api/withAuth';
import { seedRRHHData } from '@/lib/seed/rrhh-seed';
import { NextResponse } from 'next/server';

// Forzar ruta dinámica - no ejecutar durante build
export const dynamic = 'force-dynamic';

async function postInternal() {
  try {
    console.log('🚀 Iniciando seed de datos RRHH...');

    await seedRRHHData();

    return NextResponse.json({
      success: true,
      message: 'Datos RRHH sembrados exitosamente',
    });
  } catch (error) {
    console.error('❌ Error en seed RRHH:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al sembrar datos RRHH',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(
  async (request, _context, auth) => {
    if (isSeedExecutionBlockedInProduction()) {
      await logSeedExecution({
        request,
        auth,
        route: '/api/seed/rrhh',
        method: 'POST',
        status: 'blocked',
      });
      return NextResponse.json(
        { success: false, error: 'Endpoint de seed bloqueado en produccion' },
        { status: 403 }
      );
    }

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/rrhh',
      method: 'POST',
      status: 'attempt',
    });

    const response = await postInternal();

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/rrhh',
      method: 'POST',
      status: response.ok ? 'success' : 'error',
      details: { status: response.status },
    });

    return response;
  },
  { roles: SEED_ALLOWED_ROLES }
);
