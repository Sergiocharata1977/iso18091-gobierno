// API route to get personnel list using Admin SDK
// This is used by other modules that need to select personnel

import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrg = searchParams.get('organization_id') || undefined;

      if (
        auth.role !== 'super_admin' &&
        requestedOrg &&
        auth.organizationId &&
        requestedOrg !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrg || auth.organizationId || undefined
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const snapshot = await db
        .collection('personnel')
        .where('organization_id', '==', organizationId)
        .get();

      const personnel = snapshot.docs
        .map(doc => {
          const data = doc.data();
          const nombres = data.nombres || '';
          const apellidos = data.apellidos || '';
          const nombreCompleto = `${nombres} ${apellidos}`.trim();

          return {
            id: doc.id,
            nombre_completo: nombreCompleto || data.email || 'Sin nombre',
            puesto: data.tipo_personal || null,
            email: data.email,
            estado: data.estado,
          };
        })
        .filter(p => p.estado === 'Activo')
        .filter(p => p.nombre_completo && p.nombre_completo !== 'Sin nombre')
        .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

      return NextResponse.json(personnel);
    } catch (error) {
      console.error('Error getting personnel for selector:', error);
      return NextResponse.json(
        { error: 'Error al obtener personal' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
