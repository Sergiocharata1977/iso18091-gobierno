import { withAuth } from '@/lib/api/withAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function denyByOrg(
  auth: { role: string; organizationId: string },
  data?: Record<string, any>
) {
  const orgId = data?.organizationId;
  return (
    auth.role !== 'super_admin' && !!orgId && orgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const docRef = doc(db, 'processDefinitions', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return NextResponse.json(
          { success: false, error: 'Definicion de proceso no encontrada' },
          { status: 404 }
        );
      }

      const data = docSnap.data() as Record<string, any>;
      if (denyByOrg(auth, data)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { id: docSnap.id, ...data },
      });
    } catch (error) {
      console.error('Error fetching process definition:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener definicion de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const docRef = doc(db, 'processDefinitions', id);
      const current = await getDoc(docRef);

      if (!current.exists()) {
        return NextResponse.json(
          { success: false, error: 'Definicion de proceso no encontrada' },
          { status: 404 }
        );
      }

      const currentData = current.data() as Record<string, any>;
      if (denyByOrg(auth, currentData)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const updateData = {
        ...body,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(docRef, updateData);
      return NextResponse.json({
        success: true,
        message: 'Definicion de proceso actualizada exitosamente',
      });
    } catch (error) {
      console.error('Error updating process definition:', error);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar definicion de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const docRef = doc(db, 'processDefinitions', id);
      const current = await getDoc(docRef);

      if (!current.exists()) {
        return NextResponse.json(
          { success: false, error: 'Definicion de proceso no encontrada' },
          { status: 404 }
        );
      }

      const currentData = current.data() as Record<string, any>;
      if (denyByOrg(auth, currentData)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      await deleteDoc(docRef);
      return NextResponse.json({
        success: true,
        message: 'Definicion de proceso eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error deleting process definition:', error);
      return NextResponse.json(
        { success: false, error: 'Error al eliminar definicion de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
