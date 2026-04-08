import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { PositionService } from '@/services/rrhh/PositionService';
import { PositionFormData } from '@/types/rrhh';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      // Server-safe implementation (avoid client Firestore SDK inside API route)
      const db = getAdminFirestore();
      const [positionsSnap, personnelSnap] = await Promise.all([
        db
          .collection('positions')
          .where('organization_id', '==', organizationId)
          .get(),
        db
          .collection('personnel')
          .where('organization_id', '==', organizationId)
          .get(),
      ]);

      const personnelCountByPosition = new Map<string, number>();
      for (const doc of personnelSnap.docs) {
        const data = doc.data();
        const keys = [data.puesto_id, data.puesto]
          .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
          .map(v => v.trim());
        for (const key of keys) {
          personnelCountByPosition.set(
            key,
            (personnelCountByPosition.get(key) || 0) + 1
          );
        }
      }

      const positions: Array<Record<string, any>> = positionsSnap.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.() || new Date(),
            updated_at: data.updated_at?.toDate?.() || new Date(),
            personnel_count: personnelCountByPosition.get(doc.id) || 0,
          };
        })
        .sort((a: Record<string, any>, b: Record<string, any>) =>
          (a.nombre || '').localeCompare(b.nombre || '')
        );

      return NextResponse.json(positions);
    } catch (error) {
      console.error('Error getting positions:', error);
      return NextResponse.json(
        { error: 'Error al obtener puestos' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();

      if (!body.nombre || body.nombre.trim() === '') {
        return NextResponse.json(
          { error: 'El nombre del puesto es requerido' },
          { status: 400 }
        );
      }

      const requestedOrgId = body.organization_id as string | undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const data: PositionFormData = {
        nombre: body.nombre,
        descripcion_responsabilidades: body.descripcion_responsabilidades,
        requisitos_experiencia: body.requisitos_experiencia,
        requisitos_formacion: body.requisitos_formacion,
        departamento_id: body.departamento_id,
        reporta_a_id: body.reporta_a_id,
        competenciasRequeridas: body.competenciasRequeridas || [],
        frecuenciaEvaluacion: body.frecuenciaEvaluacion || 12,
        nivel: body.nivel || 'operativo',
      };

      const id = await PositionService.create(data, organizationId);
      return NextResponse.json(
        { id, message: 'Puesto creado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating position:', error);
      const message =
        error instanceof Error ? error.message : 'Error al crear puesto';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
