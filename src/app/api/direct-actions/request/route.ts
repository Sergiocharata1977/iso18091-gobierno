// API endpoint for requesting direct actions

import { withAuth } from '@/lib/api/withAuth';
import { errorLogger, ErrorSeverity } from '@/lib/utils/ErrorLogger';
import { DirectActionService } from '@/services/direct-actions';
import { DirectActionRequest } from '@/types/direct-actions';
import { NextRequest, NextResponse } from 'next/server';

interface RequestActionBody {
  sessionId: string;
  action: DirectActionRequest;
}

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    const startTime = Date.now();

    try {
      const body: RequestActionBody = await request.json();
      const { sessionId, action } = body;
      const userId = auth.uid;

      if (!sessionId || !action) {
        return NextResponse.json(
          {
            error: 'Parámetros requeridos faltantes',
            details: {
              sessionId: !sessionId ? 'requerido' : 'ok',
              action: !action ? 'requerido' : 'ok',
            },
          },
          { status: 400 }
        );
      }

      console.log('[API /direct-actions/request] Processing action request:', {
        userId,
        sessionId,
        actionType: action.type,
        entity: action.entity,
      });

      const response = await DirectActionService.createActionRequest(
        userId,
        sessionId,
        action
      );

      console.log('[API /direct-actions/request] Action request created:', {
        actionId: response.actionId,
        status: response.status,
        tiempo_respuesta_ms: Date.now() - startTime,
      });

      return NextResponse.json({
        ...response,
        tiempo_respuesta_ms: Date.now() - startTime,
      });
    } catch (error) {
      const tiempo_respuesta_ms = Date.now() - startTime;

      errorLogger.logError(
        error as Error,
        {
          operation: 'direct_action_request',
          metadata: { tiempo_respuesta_ms },
        },
        ErrorSeverity.ERROR
      );

      const userFriendlyMessage = errorLogger.getUserFriendlyMessage(
        error as Error
      );

      return NextResponse.json(
        {
          error: userFriendlyMessage,
          tiempo_respuesta_ms,
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
