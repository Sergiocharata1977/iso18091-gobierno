import { withAuth } from '@/lib/api/withAuth';
import { ProcessGovernanceService } from '@/services/processes/ProcessGovernanceService';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, context, auth) => {
  try {
    // Escaneo completo de la organización del usuario
    const result = await ProcessGovernanceService.runComplianceScan(
      auth.organizationId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error running governance scan:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
