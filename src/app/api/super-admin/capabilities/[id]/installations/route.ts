import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

const CAPABILITY_ID_REGEX = /^[a-z0-9-]+$/;

function errorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function serializeDate(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return null;
}

export const GET = withAuth(async (_request, context) => {
  try {
    const { id } = await context.params;

    if (!id || !CAPABILITY_ID_REGEX.test(id)) {
      return errorResponse('capability_id invalido', 400);
    }

    const db = getAdminFirestore();
    const snapshot = await db
      .collectionGroup('installed_capabilities')
      .where('capability_id', '==', id)
      .limit(200)
      .get();

    const installations = snapshot.docs.map(doc => {
      const data = doc.data();
      const orgId = doc.ref.parent.parent?.id || null;

      return {
        org_id: orgId,
        status: typeof data.status === 'string' ? data.status : null,
        enabled: Boolean(data.enabled),
        version_installed:
          typeof data.version_installed === 'string'
            ? data.version_installed
            : null,
        installed_by:
          typeof data.installed_by === 'string' ? data.installed_by : null,
        installed_at: serializeDate(data.installed_at),
      };
    });

    return NextResponse.json({
      success: true,
      data: installations,
    });
  } catch (error) {
    console.error(
      '[super-admin/capabilities/[id]/installations][GET] Error:',
      error
    );
    return errorResponse('No se pudo obtener la lista de instalaciones', 500);
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
