import { adminDb } from '@/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import type {
  Expediente,
  EstadoExpediente,
  HistorialEstado,
} from '@/types/gov/expediente';
import type { UserRole } from '@/types/auth';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const COLLECTION = 'expedientes';
const READ_WRITE_ROLES: UserRole[] = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'super_admin',
];
const ESTADOS = [
  'recibido',
  'admitido',
  'en_analisis',
  'derivado',
  'observado',
  'resuelto',
  'archivado',
] as const;

const transitionSchema = z.object({
  organization_id: z.string().min(1).optional(),
  estado: z.enum(ESTADOS),
  responsable_id: z.string().trim().min(1).optional(),
  responsable_nombre: z.string().trim().min(1).optional(),
  comentario: z.string().trim().min(1).optional(),
});

function resolveOrganizationId(
  requestedOrgId: string | undefined,
  auth: { organizationId: string; role: UserRole },
  fallbackOrgId?: string
) {
  return auth.role === 'super_admin'
    ? requestedOrgId || auth.organizationId || fallbackOrgId || ''
    : auth.organizationId;
}

function serializeTimestamp(value: unknown): string | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return null;
}

function serializeExpediente(
  id: string,
  data: Omit<Expediente, 'id'> | Record<string, unknown>
) {
  return {
    id,
    ...data,
    fecha_vencimiento: serializeTimestamp(data.fecha_vencimiento),
    created_at: serializeTimestamp(data.created_at),
    updated_at: serializeTimestamp(data.updated_at),
    historial: ((data.historial as HistorialEstado[] | undefined) || []).map(
      entry => ({
        ...entry,
        fecha: serializeTimestamp(entry.fecha),
      })
    ),
  };
}

export const dynamic = 'force-dynamic';

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const body = transitionSchema.parse(await request.json());
      const docRef = adminDb.collection(COLLECTION).doc(id);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        return NextResponse.json(
          { success: false, error: 'Expediente no encontrado' },
          { status: 404 }
        );
      }

      const current = snapshot.data() as Omit<Expediente, 'id'>;
      const organizationId = resolveOrganizationId(
        body.organization_id,
        auth,
        current.organization_id
      );

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      if (current.organization_id !== organizationId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Sin permisos para modificar el expediente',
          },
          { status: 403 }
        );
      }

      const now = Timestamp.now();
      const historialEntry: HistorialEstado = {
        estado: body.estado as EstadoExpediente,
        fecha: now,
        responsable_id: body.responsable_id || auth.uid,
        responsable_nombre:
          body.responsable_nombre || auth.user.email || auth.email || 'Usuario',
        comentario: body.comentario,
      };

      const historial = [...(current.historial || []), historialEntry];

      await docRef.update({
        estado: body.estado,
        responsable_id: historialEntry.responsable_id,
        responsable_nombre: historialEntry.responsable_nombre,
        historial,
        updated_at: now,
      });

      const updated = await docRef.get();

      return NextResponse.json({
        success: true,
        data: serializeExpediente(
          updated.id,
          updated.data() as Omit<Expediente, 'id'>
        ),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo cambiar el estado del expediente',
        },
        { status: 500 }
      );
    }
  },
  { roles: READ_WRITE_ROLES }
);
