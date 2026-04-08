import { withAuth } from '@/lib/api/withAuth';
import { processDefinitionSchema } from '@/lib/validations/procesos';
import { ProcessService } from '@/services/procesos/ProcessService';
import { ProcessDefinition } from '@/types/procesos';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, { params }) => {
    try {
      const { id } = await params;
      const process = await ProcessService.getById(id);

      if (!process) {
        return NextResponse.json(
          { error: 'Definicion de proceso no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json(process);
    } catch (error) {
      console.error('Error in proceso GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener definicion de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const PUT = withAuth(
  async (request, { params }) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const validatedData = processDefinitionSchema.parse(body);

      const transformedData: Partial<
        Omit<ProcessDefinition, 'id' | 'createdAt'>
      > = {
        ...validatedData,
        entradas: validatedData.entradas.map(e =>
          typeof e === 'string' ? e : e.value
        ),
        salidas: validatedData.salidas.map(s =>
          typeof s === 'string' ? s : s.value
        ),
        controles: validatedData.controles.map(c =>
          typeof c === 'string' ? c : c.value
        ),
        indicadores: validatedData.indicadores.map(i =>
          typeof i === 'string' ? i : i.value
        ),
        documentos: validatedData.documentos.map(d =>
          typeof d === 'string' ? d : d.value
        ),
      };

      const process = await ProcessService.update(id, transformedData);

      return NextResponse.json(process);
    } catch (error) {
      console.error('Error in proceso PUT:', error);

      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'ZodError'
      ) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: (error as any).errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Error al actualizar definicion de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }) => {
    try {
      const { id } = await params;
      await ProcessService.delete(id);

      return NextResponse.json({
        message: 'Definicion de proceso eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error in proceso DELETE:', error);
      return NextResponse.json(
        { error: 'Error al eliminar definicion de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, { params }) => {
    try {
      const { id } = await params;
      const body = await request.json();

      if (body.action === 'toggle_estado') {
        const process = await ProcessService.toggleEstado(id);
        return NextResponse.json(process);
      }

      return NextResponse.json({ error: 'Accion no valida' }, { status: 400 });
    } catch (error) {
      console.error('Error in proceso PATCH:', error);
      return NextResponse.json(
        { error: 'Error al actualizar definicion de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
