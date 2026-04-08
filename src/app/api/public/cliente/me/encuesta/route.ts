import {
  PublicApiError,
  resolvePublicPortalCustomer,
} from '@/lib/public/portalCustomer';
import { SurveyTriggerService } from '@/services/surveys/SurveyTriggerService';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const context = await resolvePublicPortalCustomer(request, 'profile');
    if (!context) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }
    const scope = request.nextUrl.searchParams.get('scope');
    const type =
      scope === 'compras'
        ? 'post_compra'
        : scope === 'servicios'
          ? 'post_servicio'
          : undefined;

    const survey = await SurveyTriggerService.getPendingSurveyForCustomer({
      organizationId: context.organization_id,
      crmClienteId: context.crm_cliente.id,
      crmContactoId: context.identity.crm_contacto_id ?? null,
      type,
    });

    return NextResponse.json({
      success: true,
      data: survey
        ? {
            id: survey.id,
            title: survey.title,
            type: survey.type,
            externalToken: survey.externalToken,
            status: survey.status,
            createdAt: survey.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    if (error instanceof PublicApiError) {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }

    console.error('[GET /api/public/cliente/me/encuesta]', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la encuesta pendiente' },
      { status: 500 }
    );
  }
}
