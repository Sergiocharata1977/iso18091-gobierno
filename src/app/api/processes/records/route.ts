import { withAuth } from '@/lib/api/withAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
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

export const GET = withAuth(
  async (_request, _context, auth) => {
    try {
      const recordsRef = collection(db, 'processRecords');
      const snapshot =
        auth.role === 'super_admin'
          ? await getDocs(recordsRef)
          : await getDocs(
              query(
                recordsRef,
                where('organizationId', '==', auth.organizationId)
              )
            );

      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({
        success: true,
        data: records,
        count: records.length,
      });
    } catch (error) {
      console.error('Error fetching process records:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener registros de procesos' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const {
        name,
        description,
        processDefinitionId,
        processDefinitionName,
        status = 'activo',
      } = body;

      if (!name || !description || !processDefinitionId) {
        return NextResponse.json(
          { success: false, error: 'Faltan campos requeridos' },
          { status: 400 }
        );
      }

      const recordData = {
        name,
        description,
        processDefinitionId,
        processDefinitionName,
        status,
        createdBy: auth.uid,
        organizationId: auth.organizationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        kanbanStats: {
          totalCards: 0,
          pendingCards: 0,
          inProgressCards: 0,
          completedCards: 0,
        },
        isActive: true,
      };

      const docRef = await addDoc(collection(db, 'processRecords'), recordData);
      return NextResponse.json({
        success: true,
        data: { id: docRef.id, ...recordData },
        message: 'Registro de proceso creado exitosamente',
      });
    } catch (error) {
      console.error('Error creating process record:', error);
      return NextResponse.json(
        { success: false, error: 'Error al crear registro de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
