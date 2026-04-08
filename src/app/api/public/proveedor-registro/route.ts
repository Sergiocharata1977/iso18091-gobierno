import { getAdminFirestore } from '@/lib/firebase/admin';
import { getTenantConfigByApiKey } from '@/lib/portal/tenantConfig';
import {
  ProveedorRegistroSchema,
  type ProveedorRegistro,
} from '@/types/proveedor';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const tenantKey = request.headers.get('x-tenant-key')?.trim();

    if (!tenantKey) {
      return NextResponse.json(
        { success: false, error: 'Header x-tenant-key requerido' },
        { status: 401 }
      );
    }

    const tenantConfig = await getTenantConfigByApiKey(tenantKey);

    if (!tenantConfig?.orgId) {
      return NextResponse.json(
        { success: false, error: 'Organizacion no encontrada' },
        { status: 404 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Body JSON invalido' },
        { status: 400 }
      );
    }

    const payload = ProveedorRegistroSchema.parse(rawBody);
    const db = getAdminFirestore();
    const proveedoresRef = db
      .collection('organizations')
      .doc(tenantConfig.orgId)
      .collection('proveedores');

    const duplicateSnap = await proveedoresRef
      .where('cuit', '==', payload.cuit)
      .limit(1)
      .get();

    if (!duplicateSnap.empty) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe un proveedor registrado con ese CUIT en esta organizacion',
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const docRef = proveedoresRef.doc();

    const proveedor: ProveedorRegistro = {
      id: docRef.id,
      organization_id: tenantConfig.orgId,
      razon_social: payload.razon_social,
      cuit: payload.cuit,
      rubro: payload.rubro,
      contacto_nombre: payload.contacto_nombre,
      contacto_email: payload.contacto_email,
      contacto_telefono: payload.contacto_telefono,
      productos_servicios: payload.productos_servicios,
      certificaciones: payload.certificaciones,
      sitio_web: payload.sitio_web || undefined,
      estado: 'pendiente_revision',
      created_at: now,
      updated_at: now,
    };

    await docRef.set(proveedor);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: docRef.id,
          message: 'Registro recibido correctamente',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Payload invalido', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[public][proveedor-registro][POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo registrar el proveedor' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
