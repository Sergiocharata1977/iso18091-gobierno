import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const organization_id =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;
      const updates = { ...body };
      delete (updates as any).organization_id;

      if (!organization_id) {
        return NextResponse.json(
          { error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const docRef = db
        .collection('organizations')
        .doc(organization_id)
        .collection('crm_acciones')
        .doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return NextResponse.json(
          { error: 'Accion no encontrada' },
          { status: 404 }
        );
      }

      const updateData = { ...updates, updatedAt: new Date().toISOString() };
      await docRef.update(updateData);
      return NextResponse.json({ success: true, id, updates: updateData });
    } catch (error: any) {
      console.error('[API /crm/acciones/[id]] PUT Error:', error);
      return NextResponse.json(
        { error: error.message || 'Error actualizando accion' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (request, { params }, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organization_id =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organization_id) {
        return NextResponse.json(
          { error: 'organization_id requerido param' },
          { status: 400 }
        );
      }

      const { id } = await params;
      const db = getAdminFirestore();
      const docRef = db
        .collection('organizations')
        .doc(organization_id)
        .collection('crm_acciones')
        .doc(id);
      await docRef.delete();

      return NextResponse.json({ success: true, id });
    } catch (error: any) {
      console.error('[API /crm/acciones/[id]] DELETE Error:', error);
      return NextResponse.json(
        { error: error.message || 'Error eliminando accion' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'super_admin'] }
);
