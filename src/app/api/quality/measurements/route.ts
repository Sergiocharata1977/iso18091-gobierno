import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  measurementFiltersSchema,
  measurementSchema,
} from '@/lib/validations/quality';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

const COLLECTION_NAME = 'quality_measurements';
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

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const filters = measurementFiltersSchema.parse({
        search: searchParams.get('search') || undefined,
        validation_status:
          (searchParams.get('validation_status') as any) || undefined,
        indicator_id: searchParams.get('indicator_id') || undefined,
        objective_id: searchParams.get('objective_id') || undefined,
        process_definition_id:
          searchParams.get('process_definition_id') || undefined,
        measured_by: searchParams.get('measured_by') || undefined,
        start_date: searchParams.get('start_date') || undefined,
        end_date: searchParams.get('end_date') || undefined,
      });

      const db = getAdminFirestore();
      let query = db.collection(COLLECTION_NAME) as any;
      if (auth.role !== 'super_admin') {
        query = query.where('organization_id', '==', auth.organizationId);
      }
      if (filters.indicator_id)
        query = query.where('indicator_id', '==', filters.indicator_id);
      if (filters.objective_id)
        query = query.where('objective_id', '==', filters.objective_id);
      if (filters.process_definition_id)
        query = query.where(
          'process_definition_id',
          '==',
          filters.process_definition_id
        );

      const snapshot = await query.get();
      let measurements = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          measurement_date:
            data.measurement_date?.toDate?.().toISOString() ||
            data.measurement_date,
          created_at:
            data.created_at?.toDate?.().toISOString() || data.created_at,
          updated_at:
            data.updated_at?.toDate?.().toISOString() || data.updated_at,
          validated_at:
            data.validated_at?.toDate?.().toISOString() || data.validated_at,
        } as any;
      });

      if (filters.search) {
        measurements = measurements.filter(
          (m: any) =>
            m.notes?.toLowerCase().includes(filters.search!.toLowerCase()) ||
            m.measurement_method
              ?.toLowerCase()
              .includes(filters.search!.toLowerCase())
        );
      }
      if (filters.validation_status)
        measurements = measurements.filter(
          (m: any) => m.validation_status === filters.validation_status
        );
      if (filters.measured_by)
        measurements = measurements.filter(
          (m: any) => m.measured_by === filters.measured_by
        );
      if (filters.start_date)
        measurements = measurements.filter(
          (m: any) => m.measurement_date >= filters.start_date!
        );
      if (filters.end_date)
        measurements = measurements.filter(
          (m: any) => m.measurement_date <= filters.end_date!
        );

      return NextResponse.json(measurements);
    } catch (error) {
      console.error('Error in measurements GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener mediciones' },
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
      const validatedData = measurementSchema.parse(body);

      const db = getAdminFirestore();
      const now = Timestamp.now();
      const docData = {
        ...validatedData,
        validation_status: 'pendiente',
        is_valid: true,
        organization_id: auth.organizationId,
        measured_by: validatedData.measured_by || auth.uid,
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
      console.error('Error in measurements POST:', error);
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
        { error: 'Error al crear medicion' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
