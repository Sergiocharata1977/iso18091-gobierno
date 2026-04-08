import { withAuth } from '@/lib/api/withAuth';
import { ProcessDefinitionServiceAdmin } from '@/services/processRecords/ProcessDefinitionServiceAdmin';
import { ProcessRecordServiceAdmin } from '@/services/processRecords/ProcessRecordServiceAdmin';
import { ProcessRecordStageServiceAdmin } from '@/services/processRecords/ProcessRecordStageServiceAdmin';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const definitionId = searchParams.get('definition_id');
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      let records;
      if (definitionId) {
        records =
          await ProcessRecordServiceAdmin.getByDefinitionId(definitionId);
      } else {
        records = await ProcessRecordServiceAdmin.getAll(
          organizationId || undefined
        );
      }

      const filtered =
        auth.role === 'super_admin' || !auth.organizationId
          ? records
          : records.filter(
              (r: any) =>
                !r.organization_id || r.organization_id === auth.organizationId
            );

      return NextResponse.json(filtered);
    } catch (error) {
      console.error('Error getting process records:', error);
      return NextResponse.json(
        { error: 'Error al obtener registros de procesos' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();

      const orgId =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;
      if (!orgId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const definition =
        await ProcessDefinitionServiceAdmin.getByIdWithRelations(
          body.process_definition_id
        );
      if (!definition) {
        return NextResponse.json(
          { error: 'Definición de proceso no encontrada' },
          { status: 404 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        definition.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      if (definition.tipo_registros === 'vincular') {
        return NextResponse.json(
          {
            error:
              'Este proceso usa registros exclusivos en otro módulo y no admite ABM de registros de proceso.',
            modulo_vinculado: definition.modulo_vinculado || null,
          },
          { status: 400 }
        );
      }

      const userId = auth.uid || body.created_by || 'system';
      const recordId = await ProcessRecordServiceAdmin.create(
        {
          ...body,
          process_definition_nombre:
            body.process_definition_nombre || definition.nombre,
          organization_id: orgId,
        },
        userId
      );

      const defaultStages = Array.isArray(body.etapas_default)
        ? body.etapas_default
        : definition.etapas_default || [];

      if (defaultStages.length > 0) {
        await ProcessRecordStageServiceAdmin.createFromDefaults(
          recordId,
          defaultStages
        );
      }

      return NextResponse.json(
        { id: recordId, message: 'Registro de proceso creado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating process record:', error);
      const message =
        error instanceof Error ? error.message : 'Error al crear registro';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
