import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import type { OrganizationWhatsAppConfig } from '@/types/whatsapp';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const SETTINGS_DOC = 'channels_whatsapp';

const defaultConfig: Partial<OrganizationWhatsAppConfig> = {
  enabled: false,
  provider: 'meta',
  mode: 'inbox',
  connection_method: 'embedded_signup',
  connection_status: 'not_connected',
  auto_reply_enabled: false,
  welcome_message: '',
  out_of_hours_message: '',
};

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.enum(['meta', 'twilio']).optional(),
  mode: z.enum(['notifications_only', 'inbox', 'hybrid']).optional(),
  connection_method: z.enum(['embedded_signup', 'manual']).optional(),
  connection_status: z
    .enum(['not_connected', 'connected', 'error', 'token_expired'])
    .optional(),
  connected_waba_id: z.string().optional(),
  whatsapp_business_account_id: z.string().optional(),
  whatsapp_phone_number_id: z.string().optional(),
  outbound_number_label: z.string().optional(),
  access_token: z.string().optional(),
  auto_reply_enabled: z.boolean().optional(),
  welcome_message: z.string().max(500).optional(),
  out_of_hours_message: z.string().max(500).optional(),
});

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: scope.status ?? 403 }
        );
      }

      const docRef = getAdminFirestore()
        .collection('organizations')
        .doc(scope.organizationId)
        .collection('settings')
        .doc(SETTINGS_DOC);

      const snap = await docRef.get();
      const data = snap.exists
        ? ({ ...defaultConfig, ...(snap.data() as OrganizationWhatsAppConfig) } as OrganizationWhatsAppConfig)
        : (defaultConfig as OrganizationWhatsAppConfig);

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[api/whatsapp/config][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la configuracion de WhatsApp' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = patchSchema.parse(await request.json());

      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: scope.status ?? 403 }
        );
      }

      const docRef = getAdminFirestore()
        .collection('organizations')
        .doc(scope.organizationId)
        .collection('settings')
        .doc(SETTINGS_DOC);

      await docRef.set(
        {
          ...body,
          updated_at: FieldValue.serverTimestamp(),
          updated_by: auth.uid,
        },
        { merge: true }
      );

      const snap = await docRef.get();
      const data = snap.exists
        ? ({ ...defaultConfig, ...(snap.data() as OrganizationWhatsAppConfig) } as OrganizationWhatsAppConfig)
        : (defaultConfig as OrganizationWhatsAppConfig);

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[api/whatsapp/config][PATCH]', error);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo actualizar la configuracion de WhatsApp',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
