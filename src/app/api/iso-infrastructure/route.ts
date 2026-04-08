import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  INFRASTRUCTURE_COLLECTION,
  isInfraAssetStatus,
  isInfraAssetType,
  sanitizeUndefined,
} from '@/lib/iso/infrastructure';
import type { InfraAsset } from '@/types/iso-infrastructure';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function resolveOrganizationId(
  requestedOrganizationId: string | null,
  auth: { organizationId: string; role: string }
) {
  if (auth.role === 'super_admin') {
    return requestedOrganizationId || auth.organizationId || '';
  }

  if (
    requestedOrganizationId &&
    auth.organizationId &&
    requestedOrganizationId !== auth.organizationId
  ) {
    return null;
  }

  return auth.organizationId;
}

export const GET = withAuth(
  async (req, _context, auth) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const organizationId = resolveOrganizationId(
        searchParams.get('organizationId') ||
          searchParams.get('organization_id'),
        auth
      );

      if (organizationId === null) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organizationId es requerido' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const snapshot = await db
        .collection(INFRASTRUCTURE_COLLECTION)
        .where('organizationId', '==', organizationId)
        .get();

      let assets = snapshot.docs.map(doc => doc.data() as InfraAsset);

      const type = searchParams.get('type');
      if (type && isInfraAssetType(type)) {
        assets = assets.filter(asset => asset.type === type);
      }

      const status = searchParams.get('status');
      if (status && isInfraAssetStatus(status)) {
        assets = assets.filter(asset => asset.status === status);
      }

      assets.sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
      );

      return NextResponse.json({
        success: true,
        data: assets,
      });
    } catch (error) {
      console.error('[iso-infrastructure] Error listing assets:', error);
      return NextResponse.json(
        { success: false, error: 'Error al listar activos de infraestructura' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const POST = withAuth(
  async (req, _context, auth) => {
    try {
      const body = (await req.json()) as Partial<InfraAsset>;
      const organizationId = resolveOrganizationId(
        (body.organizationId as string) || null,
        auth
      );

      if (organizationId === null) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organizationId es requerido' },
          { status: 400 }
        );
      }

      if (!body.name?.trim()) {
        return NextResponse.json(
          { success: false, error: 'El nombre es obligatorio' },
          { status: 400 }
        );
      }

      if (!isInfraAssetType(body.type)) {
        return NextResponse.json(
          { success: false, error: 'El tipo de activo es invalido' },
          { status: 400 }
        );
      }

      if (!isInfraAssetStatus(body.status)) {
        return NextResponse.json(
          { success: false, error: 'El estado del activo es invalido' },
          { status: 400 }
        );
      }

      if (!body.location?.trim() || !body.responsibleId?.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'La ubicacion y el responsable son obligatorios',
          },
          { status: 400 }
        );
      }

      if (!body.acquisitionDate) {
        return NextResponse.json(
          { success: false, error: 'La fecha de adquisicion es obligatoria' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const docRef = db.collection(INFRASTRUCTURE_COLLECTION).doc();
      const now = new Date().toISOString();

      const asset: InfraAsset = sanitizeUndefined({
        id: docRef.id,
        organizationId,
        name: body.name.trim(),
        type: body.type,
        location: body.location.trim(),
        responsibleId: body.responsibleId.trim(),
        status: body.status,
        acquisitionDate: body.acquisitionDate,
        nextMaintenanceDate: body.nextMaintenanceDate || undefined,
        maintenanceHistory: Array.isArray(body.maintenanceHistory)
          ? body.maintenanceHistory
          : [],
        createdAt: now,
        updatedAt: now,
        createdBy: auth.uid,
      });

      await docRef.set(asset);

      return NextResponse.json(
        {
          success: true,
          data: asset,
          message: 'Activo creado exitosamente',
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[iso-infrastructure] Error creating asset:', error);
      return NextResponse.json(
        { success: false, error: 'Error al crear activo de infraestructura' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
