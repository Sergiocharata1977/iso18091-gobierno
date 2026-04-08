import { withAuth } from '@/lib/api/withAuth';
import { DeclarationService } from '@/services/declarations/DeclarationService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, { params }) => {
  try {
    const { id } = await params;
    const declaration = await DeclarationService.getById(id);

    if (!declaration) {
      return NextResponse.json(
        { success: false, error: 'Declaracion no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: declaration,
    });
  } catch (error) {
    console.error('Error in GET /api/declarations/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const body = await request.json();
      await DeclarationService.review(id, body, auth.uid, auth.email);

      return NextResponse.json({
        success: true,
        message: 'Declaracion revisada exitosamente',
      });
    } catch (error) {
      console.error('Error in PATCH /api/declarations/[id]:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }) => {
    try {
      const { id } = await params;
      await DeclarationService.delete(id);

      return NextResponse.json({
        success: true,
        message: 'Declaracion eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error in DELETE /api/declarations/[id]:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
