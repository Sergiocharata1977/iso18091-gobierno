import { withAuth } from '@/lib/api/withAuth';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
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

async function getRecord(recordId: string) {
  const ref = doc(db, 'processRecords', recordId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Record<string, any>) : null;
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const recordData = await getRecord(id);
      if (!recordData) {
        return NextResponse.json(
          { success: false, error: 'Registro de proceso no encontrado' },
          { status: 404 }
        );
      }

      if (denyByOrg(auth, recordData)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const listsRef = collection(db, 'processRecords', id, 'kanbanLists');
      const listsSnapshot = await getDocs(listsRef);
      const allCards: any[] = [];

      for (const listDoc of listsSnapshot.docs) {
        const cardsRef = collection(listDoc.ref, 'cards');
        const cardsSnapshot = await getDocs(cardsRef);
        const cards = cardsSnapshot.docs.map(cardDoc => ({
          id: cardDoc.id,
          listId: listDoc.id,
          ...cardDoc.data(),
        }));
        allCards.push(...cards);
      }

      return NextResponse.json({
        success: true,
        data: allCards,
        count: allCards.length,
      });
    } catch (error) {
      console.error('Error fetching kanban cards:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener tarjetas del Kanban' },
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
      const recordData = await getRecord(id);
      if (!recordData) {
        return NextResponse.json(
          { success: false, error: 'Registro de proceso no encontrado' },
          { status: 404 }
        );
      }

      if (denyByOrg(auth, recordData)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const {
        title,
        description,
        listId,
        assignedTo,
        dueDate,
        priority = 'medium',
        tags = [],
      } = body;

      if (!title || !listId) {
        return NextResponse.json(
          { success: false, error: 'Titulo y lista son requeridos' },
          { status: 400 }
        );
      }

      const cardData = {
        title,
        description: description || '',
        listId,
        assignedTo: assignedTo || null,
        dueDate: dueDate || null,
        priority,
        tags,
        status: 'pending',
        createdBy: auth.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const cardRef = await addDoc(
        collection(db, 'processRecords', id, 'kanbanLists', listId, 'cards'),
        cardData
      );
      await updateRecordStats(id);

      return NextResponse.json({
        success: true,
        data: { id: cardRef.id, ...cardData },
        message: 'Tarjeta creada exitosamente',
      });
    } catch (error) {
      console.error('Error creating kanban card:', error);
      return NextResponse.json(
        { success: false, error: 'Error al crear tarjeta del Kanban' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

async function updateRecordStats(recordId: string) {
  try {
    const listsRef = collection(db, 'processRecords', recordId, 'kanbanLists');
    const listsSnapshot = await getDocs(listsRef);

    let totalCards = 0;
    let pendingCards = 0;
    let inProgressCards = 0;
    let completedCards = 0;

    for (const listDoc of listsSnapshot.docs) {
      const cardsRef = collection(listDoc.ref, 'cards');
      const cardsSnapshot = await getDocs(cardsRef);

      totalCards += cardsSnapshot.size;
      const listData = listDoc.data();
      if (listData.title?.toLowerCase().includes('pendiente')) {
        pendingCards += cardsSnapshot.size;
      } else if (listData.title?.toLowerCase().includes('progreso')) {
        inProgressCards += cardsSnapshot.size;
      } else if (listData.title?.toLowerCase().includes('completado')) {
        completedCards += cardsSnapshot.size;
      }
    }

    await updateDoc(doc(db, 'processRecords', recordId), {
      'kanbanStats.totalCards': totalCards,
      'kanbanStats.pendingCards': pendingCards,
      'kanbanStats.inProgressCards': inProgressCards,
      'kanbanStats.completedCards': completedCards,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating record stats:', error);
  }
}
