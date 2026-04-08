import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  INFRASTRUCTURE_COLLECTION,
  isInfraAssetStatus,
  isMaintenanceType,
  sanitizeUndefined,
} from '@/lib/iso/infrastructure';
import type { InfraAsset, MaintenanceRecord } from '@/types/iso-infrastructure';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = withAuth(
  async (req, { params }, auth) => {
    try {
      const { id } = await params;
      const db = getAdminFirestore();
      const docRef = db.collection(INFRASTRUCTURE_COLLECTION).doc(id);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        return NextResponse.json(
          { success: false, error: 'Activo no encontrado' },
          { status: 404 }
        );
      }

      const current = snapshot.data() as InfraAsset;

      if (
        auth.role !== 'super_admin' &&
        current.organizationId !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const body = (await req.json()) as {
        maintenance?: MaintenanceRecord;
        nextMaintenanceDate?: string;
        status?: InfraAsset['status'];
      };

      const maintenance = body.maintenance;

      if (
        !maintenance ||
        !maintenance.date ||
        !maintenance.description?.trim()
      ) {
        return NextResponse.json(
          { success: false, error: 'El mantenimiento es obligatorio' },
          { status: 400 }
        );
      }

      if (!isMaintenanceType(maintenance.type)) {
        return NextResponse.json(
          { success: false, error: 'El tipo de mantenimiento es invalido' },
          { status: 400 }
        );
      }

      if (!maintenance.performedBy?.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'El ejecutor del mantenimiento es obligatorio',
          },
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
        ...current,
        maintenanceHistory: [
          ...(current.maintenanceHistory || []),
          {
            ...maintenance,
            description: maintenance.description.trim(),
            performedBy: maintenance.performedBy.trim(),
          },
        ],
        nextMaintenanceDate:
          body.nextMaintenanceDate !== undefined
            ? body.nextMaintenanceDate || undefined
            : current.nextMaintenanceDate,
        status: body.status || current.status,
        updatedAt: new Date().toISOString(),
      });

      await docRef.set(updatedAsset);

      return NextResponse.json({
        success: true,
        data: updatedAsset,
        message: 'Mantenimiento registrado exitosamente',
      });
    } catch (error) {
      console.error('[iso-infrastructure] Error adding maintenance:', error);
      return NextResponse.json(
        { success: false, error: 'Error al registrar mantenimiento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
