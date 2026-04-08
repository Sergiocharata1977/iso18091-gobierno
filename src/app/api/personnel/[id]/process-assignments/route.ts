import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  PersonnelProcessAssignmentInput,
  type PersonnelProcessAssignment,
} from '@/types/processAssignments';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

const COLLECTION = 'personnel_process_assignments';
const QUALITY_OBJECTIVES_COLLECTION = 'quality_objectives';
const QUALITY_INDICATORS_COLLECTION = 'quality_indicators';

async function invalidateUserContextCacheForPersonnelUser(
  userId?: string
): Promise<void> {
  if (!userId) return;
  try {
    const { UserContextService } = await import(
      '@/services/context/UserContextService'
    );
    UserContextService.invalidateCache(userId);
  } catch (error) {
    console.warn(
      '[personnel_process_assignments] No se pudo invalidar cache de contexto:',
      error
    );
  }
}

function mapAssignment(
  doc: FirebaseFirestore.QueryDocumentSnapshot
): PersonnelProcessAssignment {
  const data = doc.data() as any;
  return {
    id: doc.id,
    organization_id: data.organization_id,
    personnel_id: data.personnel_id,
    process_definition_id: data.process_definition_id,
    rol_en_proceso: data.rol_en_proceso || '',
    nivel: data.nivel,
    es_responsable: !!data.es_responsable,
    estado: data.estado || 'activo',
    objetivos_asignados: Array.isArray(data.objetivos_asignados)
      ? data.objetivos_asignados
      : [],
    indicadores_asignados: Array.isArray(data.indicadores_asignados)
      ? data.indicadores_asignados
      : [],
    observaciones: data.observaciones || '',
    created_at: data.created_at?.toDate?.() || new Date(),
    updated_at: data.updated_at?.toDate?.() || new Date(),
  };
}

async function syncPersonnelAggregates(
  db: FirebaseFirestore.Firestore,
  personnelId: string
) {
  const assignmentsSnap = await db
    .collection(COLLECTION)
    .where('personnel_id', '==', personnelId)
    .get();

  const activeAssignments = assignmentsSnap.docs
    .map(mapAssignment)
    .filter(a => a.estado !== 'inactivo');

  const procesos = Array.from(
    new Set(activeAssignments.map(a => a.process_definition_id).filter(Boolean))
  );
  const objetivos = Array.from(
    new Set(activeAssignments.flatMap(a => a.objetivos_asignados || []))
  );
  const indicadores = Array.from(
    new Set(activeAssignments.flatMap(a => a.indicadores_asignados || []))
  );

  await db.collection('personnel').doc(personnelId).update({
    procesos_asignados: procesos,
    objetivos_asignados: objetivos,
    indicadores_asignados: indicadores,
    updated_at: Timestamp.now(),
  });
}

async function getInheritedIdsFromProcess(
  db: FirebaseFirestore.Firestore,
  organizationId: string | undefined,
  processDefinitionId: string
): Promise<{ objetivos: string[]; indicadores: string[] }> {
  const [objectivesSnap, indicatorsSnap] = await Promise.all([
    db.collection(QUALITY_OBJECTIVES_COLLECTION).get(),
    db.collection(QUALITY_INDICATORS_COLLECTION).get(),
  ]);

  const matchesProcess = (data: any) => {
    if (data.process_definition_id === processDefinitionId) return true;
    if (
      Array.isArray(data.process_definition_ids) &&
      data.process_definition_ids.includes(processDefinitionId)
    ) {
      return true;
    }
    return false;
  };

  const matchesOrg = (data: any) => {
    if (!organizationId) return true;
    if (!data.organization_id) return true; // legacy docs
    return data.organization_id === organizationId;
  };

  const objetivos = objectivesSnap.docs
    .filter(doc => {
      const data = doc.data() as any;
      return (
        matchesOrg(data) && matchesProcess(data) && data.is_active !== false
      );
    })
    .map(doc => doc.id);

  const indicadores = indicatorsSnap.docs
    .filter(doc => {
      const data = doc.data() as any;
      return (
        matchesOrg(data) && matchesProcess(data) && data.is_active !== false
      );
    })
    .map(doc => doc.id);

  return {
    objetivos: Array.from(new Set(objetivos)),
    indicadores: Array.from(new Set(indicadores)),
  };
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id: personnelId } = await params;
      const db = getAdminFirestore();

      const personnelDoc = await db
        .collection('personnel')
        .doc(personnelId)
        .get();
      if (!personnelDoc.exists) {
        return NextResponse.json(
          { error: 'Personal no encontrado' },
          { status: 404 }
        );
      }
      const personnel = personnelDoc.data() as any;
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        personnel.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const snap = await db
        .collection(COLLECTION)
        .where('personnel_id', '==', personnelId)
        .get();

      const assignments = snap.docs
        .map(mapAssignment)
        .sort((a, b) =>
          (a.process_definition_id || '').localeCompare(
            b.process_definition_id || ''
          )
        );

      return NextResponse.json(assignments);
    } catch (error) {
      console.error('Error getting personnel process assignments:', error);
      return NextResponse.json(
        { error: 'Error al obtener asignaciones de procesos' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id: personnelId } = await params;
      const db = getAdminFirestore();
      const body = (await request.json()) as PersonnelProcessAssignmentInput & {
        sync_aggregates?: boolean;
        inherit_from_process?: boolean;
      };

      if (!body.process_definition_id) {
        return NextResponse.json(
          { error: 'process_definition_id es requerido' },
          { status: 400 }
        );
      }

      const [personnelDoc, processDoc] = await Promise.all([
        db.collection('personnel').doc(personnelId).get(),
        db
          .collection('processDefinitions')
          .doc(body.process_definition_id)
          .get(),
      ]);

      if (!personnelDoc.exists) {
        return NextResponse.json(
          { error: 'Personal no encontrado' },
          { status: 404 }
        );
      }
      if (!processDoc.exists) {
        return NextResponse.json(
          { error: 'Proceso no encontrado' },
          { status: 404 }
        );
      }

      const personnel = personnelDoc.data() as any;
      const process = processDoc.data() as any;
      const organizationId =
        personnel.organization_id || process.organization_id;

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        organizationId !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      if (
        personnel.organization_id &&
        process.organization_id &&
        personnel.organization_id !== process.organization_id
      ) {
        return NextResponse.json(
          {
            error:
              'El personal y el proceso pertenecen a organizaciones distintas',
          },
          { status: 400 }
        );
      }

      const existingSnap = await db
        .collection(COLLECTION)
        .where('personnel_id', '==', personnelId)
        .where('process_definition_id', '==', body.process_definition_id)
        .limit(1)
        .get();

      const shouldInheritFromProcess =
        body.inherit_from_process !== false &&
        (body.objetivos_asignados === undefined ||
          body.indicadores_asignados === undefined);

      const inherited = shouldInheritFromProcess
        ? await getInheritedIdsFromProcess(
            db,
            organizationId,
            body.process_definition_id
          )
        : { objetivos: [], indicadores: [] };

      const objetivosAsignados =
        body.objetivos_asignados !== undefined
          ? Array.isArray(body.objetivos_asignados)
            ? body.objetivos_asignados
            : []
          : inherited.objetivos;

      const indicadoresAsignados =
        body.indicadores_asignados !== undefined
          ? Array.isArray(body.indicadores_asignados)
            ? body.indicadores_asignados
            : []
          : inherited.indicadores;

      const payload = {
        organization_id: organizationId,
        personnel_id: personnelId,
        process_definition_id: body.process_definition_id,
        rol_en_proceso: body.rol_en_proceso || '',
        nivel: body.nivel || null,
        es_responsable: !!body.es_responsable,
        estado: body.estado || 'activo',
        objetivos_asignados: objetivosAsignados,
        indicadores_asignados: indicadoresAsignados,
        observaciones: body.observaciones || '',
        updated_at: Timestamp.now(),
      };

      let assignmentId = '';
      if (existingSnap.empty) {
        const ref = await db.collection(COLLECTION).add({
          ...payload,
          created_at: Timestamp.now(),
        });
        assignmentId = ref.id;
      } else {
        assignmentId = existingSnap.docs[0].id;
        await existingSnap.docs[0].ref.update(payload);
      }

      if (body.sync_aggregates !== false) {
        await syncPersonnelAggregates(db, personnelId);
      }
      await invalidateUserContextCacheForPersonnelUser(personnel.user_id);

      return NextResponse.json({
        success: true,
        id: assignmentId,
        inherited: shouldInheritFromProcess,
        objetivos_asignados: objetivosAsignados,
        indicadores_asignados: indicadoresAsignados,
        message: 'Asignación de proceso guardada',
      });
    } catch (error) {
      console.error('Error saving personnel process assignment:', error);
      return NextResponse.json(
        { error: 'Error al guardar asignación de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id: personnelId } = await params;
      const { searchParams } = new URL(request.url);
      const processDefinitionId = searchParams.get('process_definition_id');
      if (!processDefinitionId) {
        return NextResponse.json(
          { error: 'process_definition_id es requerido' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const personnelDoc = await db
        .collection('personnel')
        .doc(personnelId)
        .get();
      if (!personnelDoc.exists) {
        return NextResponse.json(
          { error: 'Personal no encontrado' },
          { status: 404 }
        );
      }
      const personnel = personnelDoc.data() as any;
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        personnel.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const snap = await db
        .collection(COLLECTION)
        .where('personnel_id', '==', personnelId)
        .where('process_definition_id', '==', processDefinitionId)
        .get();

      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      if (!snap.empty) {
        await batch.commit();
      }

      await syncPersonnelAggregates(db, personnelId);
      await invalidateUserContextCacheForPersonnelUser(personnel.user_id);

      return NextResponse.json({
        success: true,
        deleted: snap.size,
        message: 'Asignación eliminada',
      });
    } catch (error) {
      console.error('Error deleting personnel process assignment:', error);
      return NextResponse.json(
        { error: 'Error al eliminar asignación de proceso' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
