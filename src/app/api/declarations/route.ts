import { withAuth } from '@/lib/api/withAuth';
import { DeclarationService } from '@/services/declarations/DeclarationService';
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
  async request => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status') || undefined;

      const declarations = await DeclarationService.list(status);

      return NextResponse.json({
        success: true,
        data: declarations,
      });
    } catch (error) {
      console.error('Error in GET /api/declarations:', error);
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
  async request => {
    try {
      const body = await request.json();
      const declarationId = await DeclarationService.create(body);

      return NextResponse.json({
        success: true,
        data: { id: declarationId },
        message: 'Declaracion creada exitosamente',
      });
    } catch (error) {
      console.error('Error in POST /api/declarations:', error);
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
