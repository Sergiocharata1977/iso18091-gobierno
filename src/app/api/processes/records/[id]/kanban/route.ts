import { withAuth } from '@/lib/api/withAuth';
import { collection, doc, getDocs, addDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
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
      const recordRef = doc(db, 'processRecords', id);
      const recordDoc = await getDoc(recordRef);

      if (!recordDoc.exists()) {
        return NextResponse.json(
          { success: false, error: 'Registro de proceso no encontrado' },
          { status: 404 }
        );
      }

      const recordData = recordDoc.data() as Record<string, any>;
      if (denyByOrg(auth, recordData)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const listsRef = collection(db, 'processRecords', id, 'kanbanLists');
      const listsSnapshot = await getDocs(listsRef);
      const lists = listsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const listsWithCards = await Promise.all(
        lists.map(async list => {
          const cardsRef = collection(
            db,
            'processRecords',
            id,
            'kanbanLists',
            list.id,
            'cards'
          );
          const cardsSnapshot = await getDocs(cardsRef);
          const cards = cardsSnapshot.docs.map(cardDoc => ({
            id: cardDoc.id,
            ...cardDoc.data(),
          }));
          return { ...list, cards };
        })
      );

      return NextResponse.json({
        success: true,
        data: {
          record: { id: recordDoc.id, ...recordData },
          lists: listsWithCards,
        },
      });
    } catch (error) {
      console.error('Error fetching kanban board:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener tablero Kanban' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const recordDoc = await getDoc(doc(db, 'processRecords', id));
      if (!recordDoc.exists()) {
        return NextResponse.json(
          { success: false, error: 'Registro de proceso no encontrado' },
          { status: 404 }
        );
      }

      const recordData = recordDoc.data() as Record<string, any>;
      if (denyByOrg(auth, recordData)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const { title, description, color = 'bg-gray-100', position } = body;

      if (!title) {
        return NextResponse.json(
          { success: false, error: 'El titulo de la lista es requerido' },
          { status: 400 }
        );
      }

      const listData = {
        title,
        description: description || '',
        color,
        position: position || 0,
        createdBy: auth.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const listRef = await addDoc(
        collection(db, 'processRecords', id, 'kanbanLists'),
        listData
      );

      return NextResponse.json({
        success: true,
        data: { id: listRef.id, ...listData },
        message: 'Lista creada exitosamente',
      });
    } catch (error) {
      console.error('Error creating kanban list:', error);
      return NextResponse.json(
        { success: false, error: 'Error al crear lista del Kanban' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
