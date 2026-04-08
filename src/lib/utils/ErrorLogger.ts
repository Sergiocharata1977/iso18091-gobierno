/**
 * Centralized error logging utility
 */

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

class ErrorLogger {
  /**
   * Log an error with context
   */
  logError(
    error: Error | string,
    context?: ErrorContext,
    severity: ErrorSeverity = ErrorSeverity.ERROR
  ): void {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    const logEntry = {
      timestamp,
      severity,
      message: errorMessage,
      stack,
      context: {
        userId: context?.userId || 'unknown',
        sessionId: context?.sessionId || 'none',
        operation: context?.operation || 'unknown',
        ...context?.metadata,
      },
    };

    // Log to console with appropriate level
    switch (severity) {
      case ErrorSeverity.INFO:
        console.info('[INFO]', JSON.stringify(logEntry, null, 2));
        break;
      case ErrorSeverity.WARNING:
        console.warn('[WARNING]', JSON.stringify(logEntry, null, 2));
        break;
      case ErrorSeverity.ERROR:
        console.error('[ERROR]', JSON.stringify(logEntry, null, 2));
        break;
      case ErrorSeverity.CRITICAL:
        console.error('[CRITICAL]', JSON.stringify(logEntry, null, 2));
        break;
    }

    // In production, you might want to send to external logging service
    // e.g., Sentry, LogRocket, CloudWatch, etc.
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(logEntry);
    }
  }

  /**
   * Log API request/response
   */
  logApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    context?: ErrorContext
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'api_call',
      endpoint,
      method,
      statusCode,
      duration,
      context,
    };

    console.log('[API]', JSON.stringify(logEntry));
  }

  /**
   * Log Claude API usage
   */
  logClaudeUsage(
    userId: string,
    tokensInput: number,
    tokensOutput: number,
    cost: number,
    duration: number
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'claude_usage',
      userId,
      tokensInput,
      tokensOutput,
      totalTokens: tokensInput + tokensOutput,
      cost,
      duration,
    };

    console.log('[CLAUDE]', JSON.stringify(logEntry));
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'performance',
      operation,
      duration,
      metadata,
    };

    if (duration > 2000) {
      console.warn('[PERFORMANCE]', JSON.stringify(logEntry));
    } else {
      console.log('[PERFORMANCE]', JSON.stringify(logEntry));
    }
  }

  /**
   * Send logs to external service (placeholder)
   */
  private sendToExternalService(_logEntry: Record<string, unknown>): void {
    // TODO: Implement integration with external logging service
    // Examples:
    // - Sentry.captureException()
    // - LogRocket.captureException()
    // - AWS CloudWatch
    // - Google Cloud Logging
  }

  /**
   * Create user-friendly error message
   */
  getUserFriendlyMessage(error: Error | string): string {
    const errorMessage = error instanceof Error ? error.message : error;

    // Map technical errors to user-friendly messages
    const errorMappings: Record<string, string> = {
      'Authentication required': 'Por favor, inicia sesión para continuar',
      'Rate limit exceeded':
        'Has realizado demasiadas consultas. Intenta más tarde',
      'Invalid API key':
        'Error de configuración del sistema. Contacta al administrador',
      'Network error': 'Error de conexión. Verifica tu internet',
      'Firestore error': 'Error al acceder a la base de datos',
    };

    for (const [key, value] of Object.entries(errorMappings)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }

    return 'Ha ocurrido un error. Por favor, intenta nuevamente';
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

/**
 * Helper function to wrap async operations with error logging
 */
export async function withErrorLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    errorLogger.logPerformance(operation, duration, context?.metadata);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    errorLogger.logError(
      error as Error,
      { ...context, operation, metadata: { ...context?.metadata, duration } },
      ErrorSeverity.ERROR
    );
    throw error;
  }
}
