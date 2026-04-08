import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type DepartmentRecord = {
  id: string;
  nombre: string | null;
  descripcion: string | null;
};

type ProcessRecord = {
  id: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  estado: string;
  activo: boolean;
  departamento_responsable_id: string | null;
  departamento_responsable_nombre: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type DepartmentAction = {
  id: string;
  source: 'actions' | 'crm_acciones';
  titulo: string;
  estado: string;
  processId: string | null;
  processName: string | null;
  prioridad: string | null;
  responsibleName: string | null;
  dueDate: string | null;
  createdAt: string | null;
};

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as Record<string, unknown>)
  ) {
    const seconds = Number((value as Record<string, unknown>).seconds);
    if (Number.isFinite(seconds)) {
      return new Date(seconds * 1000).toISOString();
    }
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

function normalizeProcess(
  id: string,
  raw: Record<string, unknown>
): ProcessRecord | null {
  const nombre =
    typeof raw.nombre === 'string'
      ? raw.nombre
      : typeof raw.name === 'string'
        ? raw.name
        : null;

  if (!nombre) return null;

  return {
    id,
    codigo:
      typeof raw.process_code === 'string'
        ? raw.process_code
        : typeof raw.codigo === 'string'
          ? raw.codigo
          : null,
    nombre,
    descripcion:
      typeof raw.descripcion === 'string'
        ? raw.descripcion
        : typeof raw.description === 'string'
          ? raw.description
          : null,
    estado:
      typeof raw.status === 'string'
        ? raw.status
        : typeof raw.estado === 'string'
          ? raw.estado
          : raw.activo === false
            ? 'inactivo'
            : 'activo',
    activo:
      raw.activo === true ||
      raw.isActive === true ||
      raw.status === 'activo' ||
      raw.status === 'active' ||
      raw.activo === undefined,
    departamento_responsable_id:
      typeof raw.departamento_responsable_id === 'string'
        ? raw.departamento_responsable_id
        : null,
    departamento_responsable_nombre:
      typeof raw.departamento_responsable_nombre === 'string'
        ? raw.departamento_responsable_nombre
        : null,
    updated_at: toIsoString(raw.updated_at || raw.updatedAt),
    created_at: toIsoString(raw.created_at || raw.createdAt),
  };
}

function normalizeCorrectiveAction(
  id: string,
  source: 'actions' | 'crm_acciones',
  raw: Record<string, unknown>
): DepartmentAction | null {
  const processId =
    typeof raw.processId === 'string'
      ? raw.processId
      : typeof raw.process_id === 'string'
        ? raw.process_id
        : typeof raw.proceso_id === 'string'
          ? raw.proceso_id
          : null;

  const processName =
    typeof raw.processName === 'string'
      ? raw.processName
      : typeof raw.process_name === 'string'
        ? raw.process_name
        : typeof raw.proceso_nombre === 'string'
          ? raw.proceso_nombre
          : null;

  const title =
    typeof raw.title === 'string'
      ? raw.title
      : typeof raw.titulo === 'string'
        ? raw.titulo
        : typeof raw.description === 'string'
          ? raw.description
          : typeof raw.descripcion === 'string'
            ? raw.descripcion
            : null;

  if (!title) return null;

  return {
    id,
    source,
    titulo: title,
    estado:
      typeof raw.status === 'string'
        ? raw.status
        : typeof raw.estado === 'string'
          ? raw.estado
          : 'pendiente',
    processId,
    processName,
    prioridad:
      typeof raw.priority === 'string'
        ? raw.priority
        : typeof raw.prioridad === 'string'
          ? raw.prioridad
          : null,
    responsibleName:
      typeof raw.createdByName === 'string'
        ? raw.createdByName
        : typeof raw.responsiblePersonName === 'string'
          ? raw.responsiblePersonName
          : typeof raw.vendedor_nombre === 'string'
            ? raw.vendedor_nombre
            : null,
    dueDate: toIsoString(
      raw.plannedDate ||
        raw.fecha_vencimiento ||
        raw.fecha_programada ||
        raw['planning.plannedDate']
    ),
    createdAt: toIsoString(raw.createdAt || raw.created_at),
  };
}

function isOpenAction(action: DepartmentAction): boolean {
  const estado = action.estado.trim().toLowerCase();
  return ![
    'completada',
    'completed',
    'cancelada',
    'cancelled',
    'cerrada',
    'closed',
  ].includes(estado);
}

export const GET = withAuth(
  async (_request, _context, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(auth, null, {
        requireOrg: true,
      });

      if (!orgScope.ok || !orgScope.organizationId) {
        const orgError = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'No se pudo resolver la organizacion del usuario',
        });
        return NextResponse.json(
          { error: orgError.error, errorCode: orgError.errorCode },
          { status: orgError.status }
        );
      }

      const db = getAdminFirestore();
      const organizationId = orgScope.organizationId;

      const personnelById =
        auth.user.personnel_id && auth.user.personnel_id.trim()
          ? await db.collection('personnel').doc(auth.user.personnel_id).get()
          : null;

      let personnelDoc = personnelById?.exists ? personnelById : null;

      if (!personnelDoc) {
        const byUserId = await db
          .collection('personnel')
          .where('organization_id', '==', organizationId)
          .where('user_id', '==', auth.uid)
          .limit(1)
          .get();

        personnelDoc = byUserId.docs[0] || null;
      }

      if (!personnelDoc?.exists) {
        return NextResponse.json({
          departamento: null,
          procesos: [],
          acciones_abiertas: [],
          total_procesos: 0,
          procesos_con_alertas: 0,
          open_actions_count: 0,
          emptyReason: 'missing_personnel',
        });
      }

      const personnelData = personnelDoc.data() || {};
      const departmentId =
        typeof personnelData.departamento_id === 'string' &&
        personnelData.departamento_id.trim()
          ? personnelData.departamento_id.trim()
          : null;

      if (!departmentId) {
        return NextResponse.json({
          departamento: null,
          procesos: [],
          acciones_abiertas: [],
          total_procesos: 0,
          procesos_con_alertas: 0,
          open_actions_count: 0,
          emptyReason: 'missing_department',
          personnel: {
            id: personnelDoc.id,
            nombres:
              typeof personnelData.nombres === 'string'
                ? personnelData.nombres
                : null,
            apellidos:
              typeof personnelData.apellidos === 'string'
                ? personnelData.apellidos
                : null,
          },
        });
      }

      const [departmentDoc, processSnapshot] = await Promise.all([
        db.collection('departments').doc(departmentId).get(),
        db
          .collection('processDefinitions')
          .where('organization_id', '==', organizationId)
          .where('departamento_responsable_id', '==', departmentId)
          .get(),
      ]);

      const departamento: DepartmentRecord = {
        id: departmentId,
        nombre:
          (departmentDoc.exists &&
            typeof departmentDoc.data()?.nombre === 'string' &&
            departmentDoc.data()?.nombre) ||
          (typeof personnelData.departamento === 'string'
            ? personnelData.departamento
            : null),
        descripcion:
          departmentDoc.exists &&
          typeof departmentDoc.data()?.descripcion === 'string'
            ? departmentDoc.data()?.descripcion
            : null,
      };

      const procesos = processSnapshot.docs
        .map(doc =>
          normalizeProcess(doc.id, doc.data() as Record<string, unknown>)
        )
        .filter((process): process is ProcessRecord => Boolean(process))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      const processIds = new Set(procesos.map(process => process.id));

      const [actionsSnapshot, crmActionsSnapshot] = await Promise.all([
        db
          .collection('actions')
          .where('organization_id', '==', organizationId)
          .limit(500)
          .get()
          .catch(() => null),
        db
          .collection('organizations')
          .doc(organizationId)
          .collection('crm_acciones')
          .limit(500)
          .get()
          .catch(() => null),
      ]);

      const rawActions = [
        ...(actionsSnapshot?.docs.map(doc =>
          normalizeCorrectiveAction(
            doc.id,
            'actions',
            doc.data() as Record<string, unknown>
          )
        ) || []),
        ...(crmActionsSnapshot?.docs.map(doc =>
          normalizeCorrectiveAction(
            doc.id,
            'crm_acciones',
            doc.data() as Record<string, unknown>
          )
        ) || []),
      ].filter((action): action is DepartmentAction => Boolean(action));

      const accionesAbiertas = rawActions
        .filter(action => {
          if (!isOpenAction(action)) return false;
          if (action.processId && processIds.has(action.processId)) return true;
          return false;
        })
        .sort((a, b) => {
          const aDate = a.dueDate || a.createdAt || '';
          const bDate = b.dueDate || b.createdAt || '';
          return bDate.localeCompare(aDate);
        });

      const procesosConAlertas = new Set(
        accionesAbiertas
          .map(action => action.processId)
          .filter((id): id is string => Boolean(id))
      ).size;

      return NextResponse.json({
        departamento,
        procesos,
        acciones_abiertas: accionesAbiertas,
        total_procesos: procesos.length,
        procesos_con_alertas: procesosConAlertas,
        open_actions_count: accionesAbiertas.length,
        emptyReason: null,
      });
    } catch (error) {
      console.error(
        'Error in GET /api/departamentos/mi-dashboard:',
        error
      );
      return NextResponse.json(
        { error: 'Error al construir el dashboard del departamento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
