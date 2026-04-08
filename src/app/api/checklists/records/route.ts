import { withAuth } from '@/lib/api/withAuth';
import { ChecklistRecordServiceAdmin } from '@/services/checklists/ChecklistRecordServiceAdmin';
import { NextResponse } from 'next/server';

const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'super_admin',
] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const processRecordId = searchParams.get('process_record_id');

      let records;
      if (processRecordId) {
        records =
          await ChecklistRecordServiceAdmin.getByProcessRecord(processRecordId);
        if (auth.role !== 'super_admin') {
          records = records.filter(
            (r: any) =>
              !r.organization_id || r.organization_id === auth.organizationId
          );
        }
      } else {
        records = await ChecklistRecordServiceAdmin.getAll(auth.organizationId);
      }

      return NextResponse.json(records);
    } catch (error) {
      console.error('Error getting checklist records:', error);
      return NextResponse.json(
        { error: 'Error al obtener registros' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const id = await ChecklistRecordServiceAdmin.create(
        body,
        auth.organizationId,
        auth.uid
      );
      return NextResponse.json(
        { id, message: 'Checklist creado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating checklist record:', error);
      const message =
        error instanceof Error ? error.message : 'Error al crear checklist';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: [...WRITE_ROLES] }
);
