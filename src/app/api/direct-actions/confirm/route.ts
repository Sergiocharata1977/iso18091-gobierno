// API endpoint for confirming direct actions

import { withAuth } from '@/lib/api/withAuth';
import { errorLogger, ErrorSeverity } from '@/lib/utils/ErrorLogger';
import { DirectActionService } from '@/services/direct-actions';
import { NextRequest, NextResponse } from 'next/server';

interface ConfirmActionRequest {
  actionId: string;
  confirmed: boolean;
}

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    const startTime = Date.now();

    try {
      const body: ConfirmActionRequest = await request.json();
      const { actionId, confirmed } = body;
      const userId = auth.uid;

      if (!actionId) {
        return NextResponse.json(
          {
            error: 'Parámetros requeridos faltantes',
            details: {
              actionId: !actionId ? 'requerido' : 'ok',
            },
          },
          { status: 400 }
        );
      }

      console.log('[API /direct-actions/confirm] Processing confirmation:', {
        actionId,
        userId,
        confirmed,
      });

      const result = await DirectActionService.confirmAndExecuteAction(
        actionId,
        userId,
        confirmed
      );

      console.log('[API /direct-actions/confirm] Action completed:', {
        actionId,
        success: result.success,
        tiempo_respuesta_ms: Date.now() - startTime,
      });

      return NextResponse.json({
        success: result.success,
        message: result.message,
        data: result.data,
        tiempo_respuesta_ms: Date.now() - startTime,
      });
    } catch (error) {
      const tiempo_respuesta_ms = Date.now() - startTime;

      errorLogger.logError(
        error as Error,
        {
          operation: 'direct_action_confirm',
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
