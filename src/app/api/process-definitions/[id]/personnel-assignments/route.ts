import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

const COLLECTION = 'personnel_process_assignments';

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id: processDefinitionId } = await params;
      const db = getAdminFirestore();

      const processDoc = await db
        .collection('processDefinitions')
        .doc(processDefinitionId)
        .get();
      if (!processDoc.exists) {
        return NextResponse.json(
          { error: 'Proceso no encontrado' },
          { status: 404 }
        );
      }

      const process = processDoc.data() as any;
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        process.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const assignmentsSnap = await db
        .collection(COLLECTION)
        .where('process_definition_id', '==', processDefinitionId)
        .get();

      const personnelIds = Array.from(
        new Set(
          assignmentsSnap.docs
            .map(d => (d.data() as any).personnel_id)
            .filter((v): v is string => typeof v === 'string' && v.length > 0)
        )
      );

      const personnelById = new Map<string, any>();
      await Promise.all(
        personnelIds.map(async id => {
          const doc = await db.collection('personnel').doc(id).get();
          if (doc.exists) {
            personnelById.set(id, { id: doc.id, ...(doc.data() as any) });
          }
        })
      );

      const data = assignmentsSnap.docs
        .map(doc => {
          const a = doc.data() as any;
          const p = personnelById.get(a.personnel_id);
          return {
            id: doc.id,
            personnel_id: a.personnel_id,
            process_definition_id: a.process_definition_id,
            rol_en_proceso: a.rol_en_proceso || '',
            nivel: a.nivel || null,
            es_responsable: !!a.es_responsable,
            estado: a.estado || 'activo',
            objetivos_asignados: Array.isArray(a.objetivos_asignados)
              ? a.objetivos_asignados
              : [],
            indicadores_asignados: Array.isArray(a.indicadores_asignados)
              ? a.indicadores_asignados
              : [],
            observaciones: a.observaciones || '',
            personnel: p
              ? {
                  id: p.id,
                  nombres: p.nombres || '',
                  apellidos: p.apellidos || '',
                  puesto: p.puesto || '',
                  departamento: p.departamento || '',
                  estado: p.estado || '',
                }
              : null,
            created_at: a.created_at?.toDate?.() || null,
            updated_at: a.updated_at?.toDate?.() || null,
          };
        })
        .sort((x, y) => {
          if (x.es_responsable && !y.es_responsable) return -1;
          if (!x.es_responsable && y.es_responsable) return 1;
          const xn = `${x.personnel?.apellidos || ''} ${x.personnel?.nombres || ''}`;
          const yn = `${y.personnel?.apellidos || ''} ${y.personnel?.nombres || ''}`;
          return xn.localeCompare(yn);
        });

      return NextResponse.json(data);
    } catch (error) {
      console.error('Error getting process personnel assignments:', error);
      return NextResponse.json(
        { error: 'Error al obtener asignaciones del proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
