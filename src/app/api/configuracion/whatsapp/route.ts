import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { OrganizationWhatsAppConfig } from '@/types/whatsapp';

export const dynamic = 'force-dynamic';

const SETTINGS_DOC = 'channels_whatsapp';

const defaultConfig: OrganizationWhatsAppConfig = {
  enabled: false,
  provider: 'meta',
  mode: 'notifications_only',
};

const whatsappConfigSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.enum(['meta', 'twilio']).optional(),
  mode: z.enum(['notifications_only', 'inbox', 'hybrid']).optional(),
  whatsapp_phone_number_id: z.string().optional(),
  whatsapp_business_account_id: z.string().optional(),
  outbound_number_label: z.string().optional(),
  whatsapp_notificaciones_dealer: z.string().optional(),
  default_assigned_user_id: z.string().optional(),
  welcome_message: z.string().max(500).optional(),
  out_of_hours_message: z.string().max(500).optional(),
  auto_reply_enabled: z.boolean().optional(),
  auto_link_client_by_phone: z.boolean().optional(),
  auto_create_lead_if_unknown: z.boolean().optional(),
});

export const GET = withAuth(
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

      if (!snap.exists) {
        return NextResponse.json({ success: true, data: defaultConfig });
      }

      const data = snap.data() as OrganizationWhatsAppConfig;
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[configuracion/whatsapp][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la configuracion de WhatsApp' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);

export const PUT = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = whatsappConfigSchema.parse(await request.json());

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

      const updateData = {
        ...body,
        updated_by: auth.uid,
        updated_at: FieldValue.serverTimestamp(),
      };

      await docRef.set(updateData, { merge: true });

      // Read back to return current state
      const snap = await docRef.get();
      const config = snap.data() as OrganizationWhatsAppConfig;

      return NextResponse.json({ success: true, data: config });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[configuracion/whatsapp][PUT]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar la configuracion de WhatsApp' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
