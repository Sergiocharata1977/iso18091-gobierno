// GET /api/direct-actions/pending/[id]
// Carga una confirmación pendiente por ID (para la página /confirm-action/[id])

import { withAuth } from '@/lib/api/withAuth';
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const GET = withAuth(
  async (_req: NextRequest, context, auth) => {
    const { id: actionId } = await context.params as { id: string };

    const snap = await getDoc(doc(db, 'direct_action_confirmations', actionId));

    if (!snap.exists()) {
      return NextResponse.json({ error: 'Acción no encontrada' }, { status: 404 });
    }

    const data = snap.data();

    // Solo el dueño de la acción puede verla
    if (data.userId !== auth.uid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({ confirmation: data });
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
