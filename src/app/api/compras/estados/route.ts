import { adminDb } from '@/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { DEFAULT_ESTADOS_COMPRAS } from '@/lib/compras/defaultEstados';
import { NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'super_admin',
] as const;

const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

export const GET = withAuth(
  async (_request, _context, auth) => {
    try {
      const orgId = auth.organizationId;
      if (!orgId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      const ref = adminDb
        .collection('organizations')
        .doc(orgId)
        .collection('kanban_configs')
        .doc('compras');
      const snap = await ref.get();
      const estados = snap.exists
        ? (snap.data()?.estados as unknown[] | undefined)
        : undefined;

      return NextResponse.json({
        success: true,
        estados:
          estados && estados.length > 0 ? estados : DEFAULT_ESTADOS_COMPRAS,
      });
    } catch (error) {
      console.error('[compras/estados][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los estados' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const PUT = withAuth(
  async (request, _context, auth) => {
    try {
      const orgId = auth.organizationId;
      if (!orgId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      const body = (await request.json()) as { estados?: unknown[] };
      const estados = Array.isArray(body.estados) ? body.estados : [];

      await adminDb
        .collection('organizations')
        .doc(orgId)
        .collection('kanban_configs')
        .doc('compras')
        .set(
          {
            estados,
            updated_at: new Date().toISOString(),
            updated_by: auth.uid,
          },
          { merge: true }
        );

      return NextResponse.json({ success: true, estados });
    } catch (error) {
      console.error('[compras/estados][PUT] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron guardar los estados' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
