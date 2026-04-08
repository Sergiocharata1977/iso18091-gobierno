import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const SETTINGS_DOC = 'channels_whatsapp';
const META_GRAPH_API_VERSION = 'v19.0';
const TOKEN_DURATION_DAYS = 60;

const connectLegacySchema = z.object({
  phone_number_id: z.string().min(1),
  waba_id: z.string().min(1),
  access_token: z.string().min(1),
  display_phone_number: z.string().optional(),
});

const connectCodeSchema = z.object({
  code: z.string().min(1),
});

interface MetaTokenResponse {
  access_token?: string;
  error?: {
    message?: string;
  };
}

interface MetaWabaResponse {
  data?: Array<{ id?: string }>;
  error?: {
    message?: string;
  };
}

interface MetaPhoneNumbersResponse {
  data?: Array<{ id?: string; display_phone_number?: string }>;
  error?: {
    message?: string;
  };
}

async function fetchMetaTokenFromCode(code: string) {
  const metaAppId = process.env.META_APP_ID;
  const metaAppSecret = process.env.META_APP_SECRET;

  if (!metaAppId || !metaAppSecret) {
    throw new Error('Faltan META_APP_ID o META_APP_SECRET en entorno.');
  }

  const params = new URLSearchParams({
    client_id: metaAppId,
    client_secret: metaAppSecret,
    code,
  });

  const response = await fetch(
    `https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token?${params.toString()}`,
    {
      method: 'GET',
      cache: 'no-store',
    }
  );

  const payload = (await response.json()) as MetaTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error?.message ?? 'No se pudo intercambiar el code de Meta.'
    );
  }

  return payload.access_token;
}

async function fetchMetaWaba(accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/whatsapp_business_accounts`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }
  );

  const payload = (await response.json()) as MetaWabaResponse;
  const wabaId = payload.data?.[0]?.id;

  if (!response.ok || !wabaId) {
    throw new Error(
      payload.error?.message ??
        'No se encontro una cuenta de WhatsApp Business asociada.'
    );
  }

  return { wabaId };
}

async function fetchMetaPhoneNumber(accessToken: string, wabaId: string) {
  const response = await fetch(
    `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(wabaId)}/phone_numbers`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }
  );

  const payload = (await response.json()) as MetaPhoneNumbersResponse;
  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        'No se pudo obtener el numero de telefono de WhatsApp.'
    );
  }

  return {
    phoneNumberId: payload.data?.[0]?.id,
    displayPhoneNumber: payload.data?.[0]?.display_phone_number,
  };
}

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const rawBody = (await request.json()) as unknown;
      const parsedByCode = connectCodeSchema.safeParse(rawBody);
      const parsedLegacy = connectLegacySchema.safeParse(rawBody);

      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: scope.status ?? 403 }
        );
      }
      const orgId = scope.organizationId;

      const db = getAdminFirestore();
      const docRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('settings')
        .doc(SETTINGS_DOC);

      const now = Timestamp.now();
      const tokenExpiresAt = Timestamp.fromDate(
        new Date(Date.now() + TOKEN_DURATION_DAYS * 24 * 60 * 60 * 1000)
      );

      if (parsedByCode.success) {
        const accessToken = await fetchMetaTokenFromCode(parsedByCode.data.code);
        const { wabaId } = await fetchMetaWaba(accessToken);
        const { phoneNumberId, displayPhoneNumber } = await fetchMetaPhoneNumber(
          accessToken,
          wabaId
        );

        await docRef.set(
          {
            provider: 'meta',
            enabled: true,
            connection_method: 'embedded_signup',
            connection_status: 'connected',
            connected_waba_id: wabaId,
            whatsapp_business_account_id: wabaId,
            whatsapp_phone_number_id: phoneNumberId ?? null,
            outbound_number_label: displayPhoneNumber ?? phoneNumberId ?? null,
            access_token: accessToken,
            token_connected_at: now,
            connected_at: now,
            token_expires_at: tokenExpiresAt,
            webhook_status: 'pending',
            updated_at: now,
            updated_by: auth.uid,
            // TODO: registrar webhook automaticamente por organizacion.
          },
          { merge: true }
        );

        return NextResponse.json({
          success: true,
          data: {
            waba_id: wabaId,
            phone_number_id: phoneNumberId,
            display_phone_number: displayPhoneNumber,
          },
        });
      }

      if (!parsedLegacy.success) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido para conexion WhatsApp.' },
          { status: 400 }
        );
      }

      const body = parsedLegacy.data;
      const response = await fetch(
        `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(body.phone_number_id)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${body.access_token}`,
          },
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error: 'Token invalido o phone_number_id incorrecto',
          },
          { status: 400 }
        );
      }

      await docRef.set(
        {
          whatsapp_phone_number_id: body.phone_number_id,
          whatsapp_business_account_id: body.waba_id,
          access_token: body.access_token,
          connection_method: 'embedded_signup',
          connection_status: 'connected',
          connected_waba_id: body.waba_id,
          connected_at: now,
          token_expires_at: tokenExpiresAt,
          outbound_number_label:
            body.display_phone_number ?? body.phone_number_id,
          webhook_status: 'pending',
          enabled: true,
          updated_at: now,
          updated_by: auth.uid,
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        data: {
          phone_number_id: body.phone_number_id,
          waba_id: body.waba_id,
          display_phone_number: body.display_phone_number,
        },
      });
    } catch (error) {
      console.error('[whatsapp/connect][POST]', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo guardar la conexion de WhatsApp',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
