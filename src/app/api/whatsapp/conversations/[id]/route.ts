import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

export const GET = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const { id } = await context.params;
      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const orgId = scope.organizationId;

      const db = getAdminFirestore();
      const docRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('whatsapp_conversations')
        .doc(id);

      const snap = await docRef.get();

      if (!snap.exists) {
        return NextResponse.json(
          { success: false, error: 'Conversación no encontrada' },
          { status: 404 }
        );
      }

      const data = snap.data()!;

      // Verify the conversation belongs to this org
      if (data.organization_id && data.organization_id !== orgId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, data: { id: snap.id, ...data } });
    } catch (error) {
      console.error('[whatsapp/conversations/[id]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la conversación' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin', 'gerente', 'jefe', 'operario', 'auditor'] }
);
