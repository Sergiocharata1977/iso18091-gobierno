import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  qualityIndicatorFiltersSchema,
  qualityIndicatorSchema,
} from '@/lib/validations/quality';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

const COLLECTION_NAME = 'quality_indicators';
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
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const filters = qualityIndicatorFiltersSchema.parse({
        search: searchParams.get('search') || undefined,
        status: (searchParams.get('status') as any) || undefined,
        type: (searchParams.get('type') as any) || undefined,
        process_definition_id:
          searchParams.get('process_definition_id') || undefined,
        objective_id: searchParams.get('objective_id') || undefined,
        responsible_user_id:
          searchParams.get('responsible_user_id') || undefined,
      });

      const db = getAdminFirestore();
      let query = db.collection(COLLECTION_NAME) as any;
      if (auth.role !== 'super_admin') {
        query = query.where('organization_id', '==', auth.organizationId);
      }
      if (filters.process_definition_id) {
        query = query.where(
          'process_definition_id',
          '==',
          filters.process_definition_id
        );
      }
      if (filters.objective_id) {
        query = query.where('objective_id', '==', filters.objective_id);
      }

      const snapshot = await query.get();
      let indicators = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at:
            data.created_at?.toDate?.().toISOString() || data.created_at,
          updated_at:
            data.updated_at?.toDate?.().toISOString() || data.updated_at,
          last_measurement_date:
            data.last_measurement_date?.toDate?.().toISOString() ||
            data.last_measurement_date,
        } as any;
      });

      if (filters.search) {
        indicators = indicators.filter(
          (ind: any) =>
            ind.name?.toLowerCase().includes(filters.search!.toLowerCase()) ||
            ind.code?.toLowerCase().includes(filters.search!.toLowerCase()) ||
            ind.description
              ?.toLowerCase()
              .includes(filters.search!.toLowerCase())
        );
      }
      if (filters.status)
        indicators = indicators.filter(
          (ind: any) => ind.status === filters.status
        );
      if (filters.type)
        indicators = indicators.filter((ind: any) => ind.type === filters.type);
      if (filters.responsible_user_id)
        indicators = indicators.filter(
          (ind: any) => ind.responsible_user_id === filters.responsible_user_id
        );

      return NextResponse.json(indicators);
    } catch (error) {
      console.error('Error in quality indicators GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener indicadores de calidad' },
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
      const validatedData = qualityIndicatorSchema.parse(body);

      const db = getAdminFirestore();
      const now = Timestamp.now();
      const docData = {
        ...validatedData,
        status: (validatedData as any).status || 'activo',
        trend: 'estable',
        is_active: true,
        organization_id: auth.organizationId,
        created_by: auth.uid,
        created_at: now,
        updated_at: now,
      };

      const docRef = await db.collection(COLLECTION_NAME).add(docData);
      return NextResponse.json(
        {
          id: docRef.id,
          ...docData,
          created_at: now.toDate().toISOString(),
          updated_at: now.toDate().toISOString(),
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in quality indicators POST:', error);
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'ZodError'
      ) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: (error as any).errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Error al crear indicador de calidad' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
