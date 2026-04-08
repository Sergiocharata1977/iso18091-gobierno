import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { NextRequest, NextResponse } from 'next/server';

const VALID_STATUS = new Set(['pending', 'contacted', 'closed']);

export const PATCH = withAuth(async (request: NextRequest, { params }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const status = String(body?.status || '').trim();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID requerido' },
        { status: 400 }
      );
    }

    if (!VALID_STATUS.has(status)) {
      return NextResponse.json(
        { success: false, error: 'Estado invalido' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    await db.collection('demo_requests').doc(id).update({
      status,
      updated_at: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
