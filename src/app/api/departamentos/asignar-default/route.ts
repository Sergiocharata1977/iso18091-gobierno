import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/departamentos/asignar-default
 *
 * Busca o crea el departamento "Gerencia General" para la organización
 * y lo asigna al registro de personal del usuario autenticado.
 *
 * Solo aplica cuando el usuario tiene registro de personal pero
 * `departamento_id` está vacío (emptyReason: 'missing_department').
 */
export const POST = withAuth(
  async (_request, _context, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(auth, null, {
        requireOrg: true,
      });

      if (!orgScope.ok || !orgScope.organizationId) {
        const orgError = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'No se pudo resolver la organización del usuario',
        });
        return NextResponse.json(
          { error: orgError.error, errorCode: orgError.errorCode },
          { status: orgError.status }
        );
      }

      const db = getAdminFirestore();
      const organizationId = orgScope.organizationId;

      // --- 1. Buscar el registro de personal del usuario ---
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
        return NextResponse.json(
          {
            error:
              'No se encontró un registro de personal vinculado a tu usuario. Contactá al administrador.',
          },
          { status: 404 }
        );
      }

      const personnelData = personnelDoc.data() || {};

      // Si ya tiene departamento asignado, no hacer nada
      const existingDeptId =
        typeof personnelData.departamento_id === 'string' &&
        personnelData.departamento_id.trim()
          ? personnelData.departamento_id.trim()
          : null;

      if (existingDeptId) {
        const existingDept = await db
          .collection('departments')
          .doc(existingDeptId)
          .get();
        const existingData = existingDept.data() || {};
        return NextResponse.json({
          success: true,
          already_assigned: true,
          departamento: {
            id: existingDeptId,
            nombre:
              (typeof existingData.nombre === 'string' && existingData.nombre) ||
              (typeof existingData.name === 'string' && existingData.name) ||
              'Departamento',
          },
        });
      }

      // --- 2. Buscar "Gerencia General" existente para esta org ---
      const existingQuery = await db
        .collection('departments')
        .where('organization_id', '==', organizationId)
        .where('deletedAt', '==', null)
        .get();

      let departmentId: string | null = null;
      let departmentNombre = 'Gerencia General';

      // Prioridad de búsqueda: "Gerencia General" > "Gerencia" > cualquier departamento activo
      for (const doc of existingQuery.docs) {
        const data = doc.data();
        const nombre =
          (typeof data.nombre === 'string' && data.nombre) ||
          (typeof data.name === 'string' && data.name) ||
          '';
        const normalizado = nombre.toLowerCase().trim();

        if (normalizado.includes('gerencia general')) {
          departmentId = doc.id;
          departmentNombre = nombre || 'Gerencia General';
          break;
        }
        if (normalizado.includes('gerencia') && !departmentId) {
          departmentId = doc.id;
          departmentNombre = nombre || 'Gerencia';
        }
      }

      // Si no se encontró ningún departamento de gerencia, crearlo
      if (!departmentId) {
        const newDeptRef = await db.collection('departments').add({
          nombre: 'Gerencia General',
          name: 'Gerencia General',
          description: 'Departamento de dirección y gerencia general de la organización.',
          descripcion: 'Departamento de dirección y gerencia general de la organización.',
          organization_id: organizationId,
          managerId: auth.uid,
          isActive: true,
          activo: true,
          createdBy: auth.uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: auth.uid,
          deletedAt: null,
        });
        departmentId = newDeptRef.id;
        departmentNombre = 'Gerencia General';
      }

      // --- 3. Asignar el departamento al registro de personal ---
      await db.collection('personnel').doc(personnelDoc.id).update({
        departamento_id: departmentId,
        departamento: departmentNombre,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        already_assigned: false,
        departamento: {
          id: departmentId,
          nombre: departmentNombre,
        },
      });
    } catch (error) {
      console.error('Error in POST /api/departamentos/asignar-default:', error);
      return NextResponse.json(
        { error: 'Error al asignar el departamento por defecto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
