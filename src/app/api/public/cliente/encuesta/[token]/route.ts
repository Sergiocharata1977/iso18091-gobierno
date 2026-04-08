import { SurveyTriggerService } from '@/services/surveys/SurveyTriggerService';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const survey = await SurveyTriggerService.getSurveyByExternalToken(token);

    if (!survey) {
      return NextResponse.json(
        { success: false, error: 'Encuesta no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: survey.id,
        title: survey.title,
        type: survey.type,
        status: survey.status,
        questions: survey.questions,
        targetClientName: survey.targetClientName ?? null,
      },
    });
  } catch (error) {
    console.error('[GET /api/public/cliente/encuesta/[token]]', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la encuesta' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const result = await SurveyTriggerService.submitExternalResponse(token, body);

    return NextResponse.json({
      success: true,
      data: {
        id: result.responseId,
        surveyId: result.survey.id,
      },
      message: 'Encuesta respondida exitosamente',
    });
  } catch (error) {
    console.error('[POST /api/public/cliente/encuesta/[token]]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al responder la encuesta',
      },
      { status: 500 }
    );
  }
}
