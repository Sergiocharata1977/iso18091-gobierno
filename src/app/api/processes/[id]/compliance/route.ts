import { withAuth } from '@/lib/api/withAuth';
import { ProcessComplianceEngine } from '@/services/processes/ProcessComplianceEngine';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, context, auth) => {
  try {
    const { id } = await context.params;

    // Generar reporte verificando que el proceso pertenezca a la organización del usuario
    const report = await ProcessComplianceEngine.generateReport(
      id,
      auth.organizationId
    );

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);

    // Manejar error de acceso denegado
    if (error instanceof Error && error.message.includes('Acceso denegado')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
