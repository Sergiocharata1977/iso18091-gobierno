import { adminDb } from '@/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const orgId = auth.organizationId;
      if (!orgId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      const { id } = await params;
      const ref = adminDb.collection('compras').doc(id);
      const snap = await ref.get();

      if (!snap.exists || snap.data()?.organization_id !== orgId) {
        return NextResponse.json(
          { success: false, error: 'No encontrado' },
          { status: 404 }
        );
      }

      const body = (await request.json()) as Record<string, unknown>;
      delete body.id;
      delete body.organization_id;
      delete body.created_at;
      delete body.created_by;
      delete body.numero;

      await ref.update({
        ...body,
        updated_at: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('[compras/[id]][PATCH] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar la compra' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
