import { withAuth } from '@/lib/api/withAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, _context, auth) => {
    try {
      const definitionsQuery =
        auth.role === 'super_admin'
          ? collection(db, 'processDefinitions')
          : query(
              collection(db, 'processDefinitions'),
              where('organizationId', '==', auth.organizationId)
            );
      const definitionsSnapshot = await getDocs(definitionsQuery as any);
      const definitionsCount = definitionsSnapshot.size;

      const recordsQuery =
        auth.role === 'super_admin'
          ? collection(db, 'processRecords')
          : query(
              collection(db, 'processRecords'),
              where('organizationId', '==', auth.organizationId)
            );
      const recordsSnapshot = await getDocs(recordsQuery as any);
      const recordsCount = recordsSnapshot.size;

      let kanbanListsCount = 0;
      let kanbanCardsCount = 0;

      if (recordsCount > 0) {
        const firstRecord = recordsSnapshot.docs[0];
        const listsSnapshot = await getDocs(
          collection(db, 'processRecords', firstRecord.id, 'kanbanLists')
        );
        kanbanListsCount = listsSnapshot.size;

        for (const listDoc of listsSnapshot.docs) {
          const cardsSnapshot = await getDocs(
            collection(
              db,
              'processRecords',
              firstRecord.id,
              'kanbanLists',
              listDoc.id,
              'cards'
            )
          );
          kanbanCardsCount += cardsSnapshot.size;
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          processDefinitions: {
            count: definitionsCount,
            status: definitionsCount > 0 ? 'populated' : 'empty',
          },
          processRecords: {
            count: recordsCount,
            status: recordsCount > 0 ? 'populated' : 'empty',
          },
          kanbanLists: {
            count: kanbanListsCount,
            status: kanbanListsCount > 0 ? 'populated' : 'empty',
          },
          kanbanCards: {
            count: kanbanCardsCount,
            status: kanbanCardsCount > 0 ? 'populated' : 'empty',
          },
        },
        summary: {
          totalDefinitions: definitionsCount,
          totalRecords: recordsCount,
          totalKanbanLists: kanbanListsCount,
          totalKanbanCards: kanbanCardsCount,
          overallStatus:
            definitionsCount > 0 && recordsCount > 0
              ? 'ready'
              : 'needs_seeding',
        },
      });
    } catch (error) {
      console.error('Error checking collections:', error);
      return NextResponse.json(
        { success: false, error: 'Error al verificar colecciones' },
        { status: 500 }
      );
    }
  },
  { roles: ['super_admin'] }
);
