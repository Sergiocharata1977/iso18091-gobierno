import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { NextRequest, NextResponse } from 'next/server';
import type { OrganizationWhatsAppConfig } from '@/types/whatsapp';

export const dynamic = 'force-dynamic';

const SETTINGS_DOC = 'channels_whatsapp';

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
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
        .collection('settings')
        .doc(SETTINGS_DOC);

      const snap = await docRef.get();
      const config = snap.exists
        ? (snap.data() as OrganizationWhatsAppConfig)
        : null;

      const phoneNumberId = config?.whatsapp_phone_number_id;

      if (!phoneNumberId) {
        return NextResponse.json(
          { success: false, error: 'Phone Number ID no configurado' },
          { status: 422 }
        );
      }

      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      if (!accessToken) {
        return NextResponse.json(
          { success: false, error: 'WHATSAPP_ACCESS_TOKEN no configurado en el servidor' },
          { status: 500 }
        );
      }

      let webhookStatus: 'verified' | 'error' = 'error';
      let details = '';

      try {
        const apiUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}`;
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          webhookStatus = 'verified';
          details = 'Phone Number ID verificado correctamente con Meta Graph API';
        } else {
          const errorBody = await response.text();
          details = `Error ${response.status}: ${errorBody}`;
        }
      } catch (fetchError) {
        details =
          fetchError instanceof Error
            ? fetchError.message
            : 'Error al contactar Meta Graph API';
      }

      // Update status in Firestore regardless of outcome
      await docRef.set(
        {
          webhook_status: webhookStatus,
          last_webhook_check: new Date().toISOString(),
          updated_by: auth.uid,
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        status: webhookStatus,
        details,
      });
    } catch (error) {
      console.error('[configuracion/whatsapp/test-webhook][POST]', error);
      return NextResponse.json(
        { success: false, error: 'Error al verificar el webhook de WhatsApp' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
