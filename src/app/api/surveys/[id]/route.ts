import { withAuth } from '@/lib/api/withAuth';
import { SurveyService } from '@/services/surveys/SurveyService';
import { NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

export const GET = withAuth(
  async (_request, { params }) => {
    try {
      const { id } = await params;
      const survey = await SurveyService.getById(id);

      if (!survey) {
        return NextResponse.json(
          { success: false, error: 'Encuesta no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: survey,
      });
    } catch (error) {
      console.error('Error in GET /api/surveys/[id]:', error);
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

export const DELETE = withAuth(
  async (_request, { params }) => {
    try {
      const { id } = await params;
      await SurveyService.delete(id);

      return NextResponse.json({
        success: true,
        message: 'Encuesta eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error in DELETE /api/surveys/[id]:', error);
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

export const PATCH = withAuth(
  async (_request, { params }) => {
    try {
      const { id } = await params;
      await SurveyService.complete(id);

      return NextResponse.json({
        success: true,
        message: 'Encuesta completada exitosamente',
      });
    } catch (error) {
      console.error('Error in PATCH /api/surveys/[id]:', error);
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
