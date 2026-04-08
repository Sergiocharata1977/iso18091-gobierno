'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

export interface AIAssistContext {
  modulo: string;
  tipo: string;
  campo?: string;
  datos?: Record<string, any>;
  organizationId?: string;
}

export interface AIAssistButtonProps {
  /** Contexto para la generación de IA */
  context: AIAssistContext;
  /** Callback cuando se genera contenido */
  onGenerate: (contenido: string) => void;
  /** Texto del botón */
  label?: string;
  /** Variante del botón */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  /** Tamaño del botón */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Clases adicionales */
  className?: string;
  /** Disabled */
  disabled?: boolean;
}

/**
 * Botón reutilizable para asistencia de IA contextual
 *
 * @example
 * <AIAssistButton
 *   context={{ modulo: 'documentos', tipo: 'procedimiento', campo: 'contenido' }}
 *   onGenerate={(texto) => setValue('contenido', texto)}
 *   label="Redactar con IA"
 * />
 */
export function AIAssistButton({
  context,
  onGenerate,
  label = 'Asistir con IA',
  variant = 'outline',
  size = 'sm',
  className,
  disabled = false,
}: AIAssistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedContent('');

    try {
      const orgId =
        context.organizationId ||
        (typeof window !== 'undefined'
          ? sessionStorage.getItem('organization_id') || undefined
          : undefined);

      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            ...context,
            organizationId: orgId,
          },
          action: 'generate',
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar contenido');
      }

      const data = await response.json();
      setGeneratedContent(data.content || data.resultado || '');
    } catch (err) {
      console.error('Error en AIAssistButton:', err);
      setError('No se pudo generar el contenido. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    onGenerate(generatedContent);
    setIsOpen(false);
    setGeneratedContent('');
  };

  const handleCancel = () => {
    setIsOpen(false);
    setGeneratedContent('');
    setError(null);
  };

  const getTitle = () => {
    switch (context.tipo) {
      case 'procedimiento':
        return 'Redactar Procedimiento';
      case 'proceso':
        return 'Generar Diagrama de Proceso';
      case 'competencias':
        return 'Sugerir Competencias';
      case 'causa_raiz':
        return 'Análisis de Causa Raíz';
      case 'checklist':
        return 'Generar Checklist';
      default:
        return 'Asistencia IA';
    }
  };

  const getDescription = () => {
    switch (context.tipo) {
      case 'procedimiento':
        return 'Don Cándido te ayudará a redactar el contenido del procedimiento.';
      case 'proceso':
        return 'Generaré un diagrama de flujo basado en la descripción del proceso.';
      case 'competencias':
        return 'Sugeriré competencias relevantes para este puesto.';
      case 'causa_raiz':
        return 'Analizaré las posibles causas raíz del problema.';
      default:
        return 'Te ayudaré a generar contenido para este campo.';
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => {
          setIsOpen(true);
          handleGenerate();
        }}
        disabled={disabled || isLoading}
        className={cn(
          'gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300',
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {label}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              {getTitle()}
            </DialogTitle>
            <DialogDescription>{getDescription()}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4 animate-pulse">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <p className="text-slate-600 font-medium">
                  Don Cándido está pensando...
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Generando contenido con IA
                </p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-600">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  className="mt-3"
                >
                  Reintentar
                </Button>
              </div>
            ) : generatedContent ? (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Contenido Generado
                </p>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans bg-white p-4 rounded border">
                    {generatedContent}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!generatedContent || isLoading}
              className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            >
              <Check className="h-4 w-4" />
              Usar este contenido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
