import { withAuth } from '@/lib/api/withAuth';
import { processRecordSchema } from '@/lib/validations/procesos';
import { ProcessRecordService } from '@/services/procesos/ProcessRecordService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, { params }) => {
    try {
      const { recordId } = await params;
      const record = await ProcessRecordService.getById(recordId);

      if (!record) {
        return NextResponse.json(
          { error: 'Registro de proceso no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json(record);
    } catch (error) {
      console.error('Error in registro GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener registro de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const PUT = withAuth(
  async (request, { params }) => {
    try {
      const { recordId } = await params;
      const body = await request.json();
      const validatedData = processRecordSchema.parse(body);

      const record = await ProcessRecordService.update(recordId, validatedData);

      return NextResponse.json(record);
    } catch (error) {
      console.error('Error in registro PUT:', error);

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
        { error: 'Error al actualizar registro de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }) => {
    try {
      const { recordId } = await params;
      await ProcessRecordService.delete(recordId);

      return NextResponse.json({
        message: 'Registro de proceso eliminado exitosamente',
      });
    } catch (error) {
      console.error('Error in registro DELETE:', error);
      return NextResponse.json(
        { error: 'Error al eliminar registro de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const POST = withAuth(
  async (request, { params }) => {
    try {
      const { recordId } = await params;
      const body = await request.json();

      if (body.action === 'move') {
        const { estado } = body;
        if (
          !estado ||
          !['pendiente', 'en-progreso', 'completado'].includes(estado)
        ) {
          return NextResponse.json(
            { error: 'Estado invalido' },
            { status: 400 }
          );
        }

        const record = await ProcessRecordService.moveToState(recordId, estado);
        return NextResponse.json(record);
      }

      return NextResponse.json({ error: 'Accion no valida' }, { status: 400 });
    } catch (error) {
      console.error('Error in registro POST (move):', error);
      return NextResponse.json(
        { error: 'Error al mover registro de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
