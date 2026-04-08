'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Loader, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DirectActionConfirmation as DirectActionConfirmationType } from '@/types/direct-actions';

interface DirectActionConfirmationProps {
  confirmation: DirectActionConfirmationType;
  onConfirm: (actionId: string) => Promise<void>;
  onCancel: (actionId: string) => Promise<void>;
  variant?: 'default' | 'embedded';
  className?: string;
}

export const DirectActionConfirmation: React.FC<
  DirectActionConfirmationProps
> = ({
  confirmation,
  onConfirm,
  onCancel,
  variant = 'default',
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<'confirmed' | 'cancelled' | null>(null);
  const isEmbedded = variant === 'embedded';

  const containerPadding = isEmbedded ? 'p-3' : 'p-4';
  const titleClassName = isEmbedded ? 'text-sm' : 'text-base';
  const textClassName = isEmbedded ? 'text-xs' : 'text-sm';
  const buttonClassName = isEmbedded ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm(confirmation.actionId);
      setResult('confirmed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onCancel(confirmation.actionId);
      setResult('cancelled');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  if (result === 'confirmed') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border border-green-200 bg-green-50',
          containerPadding,
          className
        )}
      >
        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
        <div>
          <h3 className={cn('font-semibold text-green-900', titleClassName)}>
            Accion confirmada
          </h3>
          <p className={cn('mt-1 text-green-700', textClassName)}>
            {confirmation.summary}
          </p>
          {confirmation.result && (
            <p className={cn('mt-2 text-green-700', textClassName)}>
              {confirmation.result.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (result === 'cancelled') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50',
          containerPadding,
          className
        )}
      >
        <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-600" />
        <div>
          <h3 className={cn('font-semibold text-gray-900', titleClassName)}>
            Accion cancelada
          </h3>
          <p className={cn('mt-1 text-gray-700', textClassName)}>
            {confirmation.summary}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-yellow-200 bg-yellow-50',
        containerPadding,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
        <div className="flex-1">
          <h3 className={cn('font-semibold text-yellow-900', titleClassName)}>
            Confirmacion requerida
          </h3>
          <p className={cn('mt-1 text-yellow-700', textClassName)}>
            {confirmation.summary}
          </p>

          {error && (
            <div
              className={cn(
                'mt-3 rounded border border-red-300 bg-red-100 p-2 text-red-700',
                textClassName
              )}
            >
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-green-600 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50',
                buttonClassName
              )}
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirmar
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-gray-300 text-gray-900 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
                buttonClassName
              )}
            >
              <XCircle className="h-4 w-4" />
              Cancelar
            </button>
          </div>

          <p
            className={cn(
              'mt-3 text-yellow-600',
              isEmbedded ? 'text-[11px]' : 'text-xs'
            )}
          >
            ID de Accion:{' '}
            <code className="rounded bg-yellow-100 px-2 py-1">
              {confirmation.actionId}
            </code>
          </p>
        </div>
      </div>
    </div>
  );
};
