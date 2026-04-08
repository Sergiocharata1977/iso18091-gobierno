import { SurveyService } from '@/services/surveys/SurveyService';
import { SurveyTriggerService } from '@/services/surveys/SurveyTriggerService';
import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const authenticatedGet = withAuth(async () => {
  try {
    const surveys = await SurveyService.list();

    return NextResponse.json({
      success: true,
      data: surveys,
    });
  } catch (error) {
    console.error('Error in GET /api/surveys:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});

const authenticatedPost = withAuth(async (request, _context, auth) => {
  try {
    const body = await request.json();
    const userId = auth.uid;
    const userName = auth.email;

    const surveyId = await SurveyService.create(
      body,
      auth.organizationId,
      userId,
      userName
    );

    return NextResponse.json({
      success: true,
      data: { id: surveyId },
      message: 'Encuesta creada exitosamente',
    });
  } catch (error) {
    console.error('Error in POST /api/surveys:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});

export async function GET(
  request: Request,
  context: { params: Promise<Record<string, string>> }
) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (token) {
    try {
      const survey = await SurveyTriggerService.getSurveyByExternalToken(token);

      if (!survey) {
        return NextResponse.json(
          { success: false, error: 'Encuesta no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: survey,
      });
    } catch (error) {
      console.error('Error in public GET /api/surveys:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  }

  return authenticatedGet(request as never, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<Record<string, string>> }
) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (token) {
    try {
      const body = await request.json();
      const result = await SurveyTriggerService.submitExternalResponse(
        token,
        body
      );

      return NextResponse.json({
        success: true,
        data: { id: result.responseId, surveyId: result.survey.id },
        message: 'Respuesta guardada exitosamente',
      });
    } catch (error) {
      console.error('Error in public POST /api/surveys:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  }

  return authenticatedPost(request as never, context);
}
