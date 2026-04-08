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
      const definitionsRef = collection(db, 'processDefinitions');
      const snapshot =
        auth.role === 'super_admin'
          ? await getDocs(definitionsRef)
          : await getDocs(
              query(
                definitionsRef,
                where('organizationId', '==', auth.organizationId)
              )
            );

      const definitions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({
        success: true,
        data: definitions,
        count: definitions.length,
      });
    } catch (error) {
      console.error('Error fetching process definitions:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener definiciones de procesos' },
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
        category,
        responsible,
        department,
        version,
        status = 'activo',
      } = body;

      if (!name || !description || !responsible) {
        return NextResponse.json(
          { success: false, error: 'Faltan campos requeridos' },
          { status: 400 }
        );
      }

      const definitionData = {
        name,
        description,
        category: category || 'general',
        responsible,
        department: department || null,
        version: version || '1.0',
        status,
        createdBy: auth.uid,
        organizationId: auth.organizationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };

      const docRef = await addDoc(
        collection(db, 'processDefinitions'),
        definitionData
      );

      return NextResponse.json({
        success: true,
        data: { id: docRef.id, ...definitionData },
        message: 'Definicion de proceso creada exitosamente',
      });
    } catch (error) {
      console.error('Error creating process definition:', error);
      return NextResponse.json(
        { success: false, error: 'Error al crear definicion de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
