import { withAuth } from '@/lib/api/withAuth';
import { FlujogramaService } from '@/services/flujogramas/FlujogramaService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const estado = searchParams.get('estado');
      const procesoId = searchParams.get('proceso_id');
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const flujogramas = await FlujogramaService.getAll({
        organization_id: organizationId,
        estado: estado || undefined,
        proceso_id: procesoId || undefined,
      });
      return NextResponse.json(flujogramas);
    } catch (error) {
      console.error('Error fetching flujogramas:', error);
      return NextResponse.json(
        { error: 'Error al obtener flujogramas' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const data = await request.json();
      const organizationId =
        auth.role === 'super_admin'
          ? data.organization_id || auth.organizationId
          : auth.organizationId;
      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const userId = auth.uid || data.created_by || 'system';
      const flujogramaId = await FlujogramaService.create(
        { ...data, organization_id: organizationId },
        userId
      );
      return NextResponse.json({ id: flujogramaId }, { status: 201 });
    } catch (error) {
      console.error('Error creating flujograma:', error);
      return NextResponse.json(
        { error: 'Error al crear flujograma' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
