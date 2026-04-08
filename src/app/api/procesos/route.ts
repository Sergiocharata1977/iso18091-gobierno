import { withAuth } from '@/lib/api/withAuth';
import { ProcessService } from '@/services/procesos/ProcessService';
import {
  processDefinitionFiltersSchema,
  processDefinitionSchema,
} from '@/lib/validations/procesos';
import { ProcessDefinition } from '@/types/procesos';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);

      const filters = processDefinitionFiltersSchema.parse({
        search: searchParams.get('search') || undefined,
        estado:
          (searchParams.get('estado') as 'activo' | 'inactivo') || undefined,
        responsable: searchParams.get('responsable') || undefined,
      });

      const processes = await ProcessService.getFiltered(
        filters.search,
        filters.estado,
        filters.responsable
      );

      return NextResponse.json(processes);
    } catch (error) {
      console.error('Error in procesos GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener definiciones de procesos' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const validatedData = processDefinitionSchema.parse(body);

      const processData: Omit<
        ProcessDefinition,
        'id' | 'createdAt' | 'updatedAt'
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

      const process = await ProcessService.create(processData);

      return NextResponse.json(process, { status: 201 });
    } catch (error) {
      console.error('Error in procesos POST:', error);

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
        { error: 'Error al crear definicion de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
