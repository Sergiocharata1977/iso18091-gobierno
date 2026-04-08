import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  PublicApiError,
  resolvePublicPortalCustomer,
} from '@/lib/public/portalCustomer';
import { NextRequest, NextResponse } from 'next/server';

interface EquipoCRM {
  id: string;
  numero_serie: string;
  modelo: string;
  marca?: string;
  tipo?: string;
  anio?: number;
  crm_organizacion_id: string;
  created_at?: Date | { toDate?: () => Date } | null;
}

function normalizeYear(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolvePublicPortalCustomer(request);
    if (!context) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }
    const db = getAdminFirestore();

    const snapshot = await db
      .collection('equipos_crm')
      .where('crm_organizacion_id', '==', context.crm_cliente.id)
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();

    const equipos: EquipoCRM[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;

      return {
        id: doc.id,
        numero_serie:
          typeof data.numero_serie === 'string' ? data.numero_serie : '',
        modelo: typeof data.modelo === 'string' ? data.modelo : '',
        marca: typeof data.marca === 'string' ? data.marca : undefined,
        tipo: typeof data.tipo === 'string' ? data.tipo : undefined,
        anio: normalizeYear(data['a' + '\u00F1' + 'o'] ?? data.ano),
        crm_organizacion_id:
          typeof data.crm_organizacion_id === 'string'
            ? data.crm_organizacion_id
            : context.crm_cliente.id,
        created_at:
          data.created_at instanceof Date ||
          (data.created_at &&
            typeof data.created_at === 'object' &&
            'toDate' in data.created_at)
            ? (data.created_at as EquipoCRM['created_at'])
            : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: equipos,
    });
  } catch (error) {
    if (error instanceof PublicApiError) {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }

    console.error('[GET /api/public/cliente/me/equipos]', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener los equipos del cliente' },
      { status: 500 }
    );
  }
}
