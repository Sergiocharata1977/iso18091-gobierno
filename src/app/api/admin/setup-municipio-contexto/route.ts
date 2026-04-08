import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface DepartmentSeed {
  nombre: string;
  codigo: string;
  tipo: string;
}

interface ServiceSeed {
  nombre: string;
  descripcion: string;
  canal_atencion: string[];
  sla_horas: number;
  area_responsable: string;
}

const DEPARTAMENTOS_BASE: DepartmentSeed[] = [
  { nombre: 'Intendencia', codigo: 'INT', tipo: 'direccion' },
  { nombre: 'Secretaría de Hacienda', codigo: 'HAC', tipo: 'secretaria' },
  { nombre: 'Secretaría de Obras Públicas', codigo: 'OBR', tipo: 'secretaria' },
  { nombre: 'Secretaría de Servicios Urbanos', codigo: 'URB', tipo: 'secretaria' },
];

const SERVICIOS_BASE: ServiceSeed[] = [
  {
    nombre: 'Habilitación comercial',
    descripcion: 'Trámite de habilitación de local comercial en el municipio.',
    canal_atencion: ['presencial', 'web'],
    sla_horas: 72,
    area_responsable: 'Secretaría de Hacienda',
  },
  {
    nombre: 'Libre deuda municipal',
    descripcion: 'Certificado de libre deuda de tasas y tributos municipales.',
    canal_atencion: ['presencial', 'web', 'email'],
    sla_horas: 24,
    area_responsable: 'Secretaría de Hacienda',
  },
  {
    nombre: 'Solicitud de obra en vía pública',
    descripcion: 'Permiso y gestión de obras o intervenciones en la vía pública.',
    canal_atencion: ['presencial', 'web'],
    sla_horas: 168,
    area_responsable: 'Secretaría de Obras Públicas',
  },
];

/**
 * POST /api/admin/setup-municipio-contexto
 *
 * Inicializa el contexto base de un municipio (edition=government):
 * crea 4 departamentos y 3 servicios de catálogo si no existen.
 *
 * Roles: super_admin
 */
export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = (await request.json()) as { organization_id?: unknown };
      const organizationId =
        typeof body?.organization_id === 'string' && body.organization_id.trim()
          ? body.organization_id.trim()
          : null;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();

      // Verificar que la org existe y es edition=government
      const orgDoc = await db.collection('organizations').doc(organizationId).get();
      if (!orgDoc.exists) {
        return NextResponse.json(
          { error: 'Organización no encontrada' },
          { status: 404 }
        );
      }

      const orgData = orgDoc.data() ?? {};
      if (orgData.edition !== 'government') {
        return NextResponse.json(
          {
            error: 'La organización no tiene edition=government',
            edition: orgData.edition ?? null,
          },
          { status: 422 }
        );
      }

      // ── Departamentos ─────────────────────────────────────────────────
      const existingDeptsSnap = await db
        .collection('departments')
        .where('organization_id', '==', organizationId)
        .limit(1)
        .get();

      let createdDepartments = 0;

      if (existingDeptsSnap.empty) {
        for (const dept of DEPARTAMENTOS_BASE) {
          await db.collection('departments').add({
            nombre: dept.nombre,
            name: dept.nombre,
            codigo: dept.codigo,
            tipo: dept.tipo,
            organization_id: organizationId,
            activo: true,
            isActive: true,
            deletedAt: null,
            createdBy: auth.uid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          createdDepartments++;
        }
      }

      // ── Catálogo de servicios ─────────────────────────────────────────
      const existingServicesSnap = await db
        .collection('service_catalog')
        .where('organization_id', '==', organizationId)
        .limit(1)
        .get();

      let createdServices = 0;

      if (existingServicesSnap.empty) {
        for (const svc of SERVICIOS_BASE) {
          await db.collection('service_catalog').add({
            nombre: svc.nombre,
            descripcion: svc.descripcion,
            canal_atencion: svc.canal_atencion,
            sla_horas: svc.sla_horas,
            area_responsable: svc.area_responsable,
            organization_id: organizationId,
            activo: true,
            estado: 'activo',
            createdBy: auth.uid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          createdServices++;
        }
      }

      return NextResponse.json({
        success: true,
        created: {
          departments: createdDepartments,
          services: createdServices,
        },
      });
    } catch (error) {
      console.error('Error in POST /api/admin/setup-municipio-contexto:', error);
      return NextResponse.json(
        { error: 'Error al configurar el contexto del municipio' },
        { status: 500 }
      );
    }
  },
  { roles: ['super_admin'] }
);
