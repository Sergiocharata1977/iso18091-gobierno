import { withAuth } from '@/lib/api/withAuth';
import { SurveyService } from '@/services/surveys/SurveyService';
import { NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

export const GET = withAuth(
  async (_request, { params }) => {
    try {
      const { id } = await params;
      const responses = await SurveyService.getResponses(id);

      return NextResponse.json({
        success: true,
        data: responses,
      });
    } catch (error) {
      console.error('Error in GET /api/surveys/[id]/responses:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request, { params }) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const responseId = await SurveyService.addResponse(id, body);

      return NextResponse.json({
        success: true,
        data: { id: responseId },
        message: 'Respuesta guardada exitosamente',
      });
    } catch (error) {
      console.error('Error in POST /api/surveys/[id]/responses:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
