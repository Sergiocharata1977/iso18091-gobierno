import { withAuth } from '@/lib/api/withAuth';
import { ESTADOS_KANBAN_DEFAULT } from '@/data/crm/scoring-config';
import { db } from '@/firebase/config';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (_request, _context, auth) => {
    try {
      const organizationId = auth.organizationId;
      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const estadosRef = collection(db, 'kanban_estados');
      const snapshot = await getDocs(
        query(estadosRef, where('organization_id', '==', organizationId))
      );

      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'kanban_estados', docSnap.id));
      }

      const now = new Date().toISOString();
      const estadosCreados: any[] = [];
      for (const estadoDefault of ESTADOS_KANBAN_DEFAULT) {
        const estadoData = {
          ...estadoDefault,
          organization_id: organizationId,
          created_at: now,
          updated_at: now,
        };
        const docRef = await addDoc(estadosRef, estadoData);
        estadosCreados.push({ id: docRef.id, ...estadoData });
      }

      return NextResponse.json({
        success: true,
        message: 'Estados Kanban actualizados correctamente',
        data: {
          estados_eliminados: snapshot.size,
          estados_creados: estadosCreados.length,
          nuevos_estados: estadosCreados.map(e => e.nombre),
        },
      });
    } catch (error: any) {
      console.error('Error reseteando estados Kanban:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to reset Kanban states',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['super_admin'] }
);
