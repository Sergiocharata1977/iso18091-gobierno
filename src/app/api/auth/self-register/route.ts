import { SelfRegistrationService } from '@/services/registration/SelfRegistrationService';
import { SelfRegistrationInputSchema } from '@/types/self-registration';
import { NextRequest, NextResponse } from 'next/server';

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();

    const parseResult = SelfRegistrationInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          code: 'validation_error',
          issues: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await SelfRegistrationService.register(parseResult.data);

    if (!result.success) {
      const status = result.code === 'email_exists' ? 409 : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(
      {
        success: true,
        customToken: result.customToken,
        userId: result.userId,
        organizationId: result.organizationId,
        trialEndsAt: result.trialEndsAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[self-register] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', code: 'internal_error' },
      { status: 500 }
    );
  }
};

export const GET = () =>
  NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
