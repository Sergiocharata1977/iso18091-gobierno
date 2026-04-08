import { Timestamp } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/api/withAuth';
import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { AIPricingService } from '@/services/ai-core/AIPricingService';
import {
  AI_PRICING_COLLECTION,
  AI_PRICING_DOC_ID,
  AIPricingConfigSchema,
} from '@/types/ai-pricing';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
  try {
    const db = getAdminFirestore();
    const doc = await db
      .collection(AI_PRICING_COLLECTION)
      .doc(AI_PRICING_DOC_ID)
      .get();
    const data = await AIPricingService.getConfig();

    return NextResponse.json({
      success: true,
      data,
      source: doc.exists ? 'firestore' : 'fallback',
    });
  } catch (error) {
    console.error('[super-admin/ai-pricing][GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo cargar la configuracion de precios IA',
      },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const PUT = withAuth(async (request, _context, auth) => {
  try {
    const payload = await request.json();
    const normalizedPayload = {
      ...payload,
      updated_at: undefined,
      providers: Object.fromEntries(
        Object.entries(payload?.providers || {}).map(([key, provider]) => [
          key,
          {
            ...(provider as Record<string, unknown>),
            updated_at: undefined,
          },
        ])
      ),
    };
    const parsed = AIPricingConfigSchema.safeParse(normalizedPayload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuracion invalida',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const config = parsed.data;
    if (!config.plans[config.default_plan_id]) {
      return NextResponse.json(
        {
          success: false,
          error: 'El plan por defecto debe existir dentro de plans',
        },
        { status: 400 }
      );
    }

    const now = Timestamp.now();
    const normalizedProviders = Object.fromEntries(
      Object.entries(config.providers).map(([key, provider]) => [
        key,
        {
          ...provider,
          updated_at: now,
        },
      ])
    );

    const normalizedConfig = {
      ...config,
      providers: normalizedProviders,
      updated_at: now,
      updated_by: auth.uid,
    };

    const db = getAdminFirestore();
    await db
      .collection(AI_PRICING_COLLECTION)
      .doc(AI_PRICING_DOC_ID)
      .set(normalizedConfig, { merge: false });

    AIPricingService.invalidateCache();

    return NextResponse.json({
      success: true,
      data: normalizedConfig,
    });
  } catch (error) {
    console.error('[super-admin/ai-pricing][PUT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo guardar la configuracion de precios IA',
      },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
