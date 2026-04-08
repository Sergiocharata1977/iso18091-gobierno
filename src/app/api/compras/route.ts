import { adminDb } from '@/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'super_admin',
] as const;

const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object') {
    const candidate = value as {
      toMillis?: () => number;
      _seconds?: number;
      seconds?: number;
    };
    if (typeof candidate.toMillis === 'function') {
      return candidate.toMillis();
    }
    const seconds = candidate._seconds ?? candidate.seconds;
    if (typeof seconds === 'number') return seconds * 1000;
  }
  return 0;
}

function calculateMontoEstimado(items: unknown): number {
  if (!Array.isArray(items)) return 0;

  return items.reduce((total, item) => {
    const row = item as {
      cantidad?: number | string;
      precio_unitario_estimado?: number | string;
    };
    const cantidad = Number(row.cantidad) || 0;
    const precio = Number(row.precio_unitario_estimado) || 0;
    return total + cantidad * precio;
  }, 0);
}

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

      const snapshot = await adminDb
        .collection('compras')
        .where('organization_id', '==', orgId)
        .get();

      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort(
          (a, b) =>
            toMillis((b as Record<string, unknown>).created_at) -
            toMillis((a as Record<string, unknown>).created_at)
        );

      return NextResponse.json({
        success: true,
        data,
        count: data.length,
      });
    } catch (error) {
      console.error('[compras][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener las compras' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const orgId = auth.organizationId;
      if (!orgId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      const body = (await request.json()) as Record<string, unknown>;
      const snapshot = await adminDb
        .collection('compras')
        .where('organization_id', '==', orgId)
        .get();

      const numero = snapshot.size + 1;
      const items = Array.isArray(body.items) ? body.items : [];
      const monto_estimado = calculateMontoEstimado(items);

      const payload = {
        ...body,
        items,
        numero,
        monto_estimado,
        organization_id: orgId,
        created_by: auth.uid,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      const ref = await adminDb.collection('compras').add(payload);

      return NextResponse.json({
        success: true,
        id: ref.id,
        numero,
      });
    } catch (error) {
      console.error('[compras][POST] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear la compra' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
