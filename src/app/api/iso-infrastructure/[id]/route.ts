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

async function getAsset(id: string) {
  const db = getAdminFirestore();
  const docRef = db.collection(INFRASTRUCTURE_COLLECTION).doc(id);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    docRef,
    asset: snapshot.data() as InfraAsset,
  };
}

function canAccessAsset(
  asset: InfraAsset,
  auth: { organizationId: string; role: string }
) {
  return (
    auth.role === 'super_admin' || asset.organizationId === auth.organizationId
  );
}

export const GET = withAuth(
  async (_req, { params }, auth) => {
    try {
      const { id } = await params;
      const result = await getAsset(id);

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Activo no encontrado' },
          { status: 404 }
        );
      }

      if (!canAccessAsset(result.asset, auth)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.asset,
      });
    } catch (error) {
      console.error('[iso-infrastructure] Error getting asset:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener activo' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const PUT = withAuth(
  async (req, { params }, auth) => {
    try {
      const { id } = await params;
      const result = await getAsset(id);

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Activo no encontrado' },
          { status: 404 }
        );
      }

      if (!canAccessAsset(result.asset, auth)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const body = (await req.json()) as Partial<InfraAsset>;

      if (body.type !== undefined && !isInfraAssetType(body.type)) {
        return NextResponse.json(
          { success: false, error: 'El tipo de activo es invalido' },
          { status: 400 }
        );
      }

      if (body.status !== undefined && !isInfraAssetStatus(body.status)) {
        return NextResponse.json(
          { success: false, error: 'El estado del activo es invalido' },
          { status: 400 }
        );
      }

      const updatedAsset: InfraAsset = sanitizeUndefined({
        ...result.asset,
        ...body,
        id: result.asset.id,
        organizationId: result.asset.organizationId,
        createdAt: result.asset.createdAt,
        createdBy: result.asset.createdBy,
        maintenanceHistory: Array.isArray(body.maintenanceHistory)
          ? body.maintenanceHistory
          : result.asset.maintenanceHistory,
        updatedAt: new Date().toISOString(),
      });

      await result.docRef.set(updatedAsset);

      return NextResponse.json({
        success: true,
        data: updatedAsset,
        message: 'Activo actualizado exitosamente',
      });
    } catch (error) {
      console.error('[iso-infrastructure] Error updating asset:', error);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar activo' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_req, { params }, auth) => {
    try {
      const { id } = await params;
      const result = await getAsset(id);

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Activo no encontrado' },
          { status: 404 }
        );
      }

      if (!canAccessAsset(result.asset, auth)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      await result.docRef.delete();

      return NextResponse.json({
        success: true,
        message: 'Activo eliminado exitosamente',
      });
    } catch (error) {
      console.error('[iso-infrastructure] Error deleting asset:', error);
      return NextResponse.json(
        { success: false, error: 'Error al eliminar activo' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
