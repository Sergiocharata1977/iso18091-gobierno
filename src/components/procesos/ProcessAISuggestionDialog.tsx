'use client';

/**
 * ProcessAISuggestionDialog
 *
 * Componente de diálogo para generar sugerencias de IA para procesos ISO 9001.
 *
 * Modos:
 * - "name": Sugiere 3 nombres de proceso con justificación
 * - "full": Genera contenido completo para todos los campos
 * - "section": Genera contenido para una sección específica
 */

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProcessCategoryId } from '@/types/processRecords';
import { CheckCircle, Loader2, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

export type SuggestionMode = 'name' | 'full' | 'section' | 'sipoc';
export type SectionType =
  | 'descripcion'
  | 'objetivo'
  | 'alcance'
  | 'funciones'
  | 'entradas_salidas';

interface NameOption {
  title: string;
  reason: string;
}

interface FullSuggestion {
  descripcion?: string;
  objetivo?: string;
  alcance?: string;
  entradas?: string[];
  salidas?: string[];
  funciones?: string[];
  registros?: string[];
  indicadores?: string[];
}

export interface SIPOCSuggestion {
  inputs: {
    description: string;
    supplier: string;
    validation_criteria: string;
  }[];
  activities: {
    name: string;
    description: string;
    responsible_position_id: string;
  }[];
  outputs: {
    description: string;
    customer: string;
    quality_criteria: string;
  }[];
  controls: {
    description: string;
    type: string;
    frequency: string;
    responsible_position_id: string;
  }[];
  risks: {
    description: string;
    severity: string;
    probability: string;
    detection: string;
  }[];
}

interface ProcessAISuggestionDialogProps {
  open: boolean;
  onClose: () => void;
  mode: SuggestionMode;
  processName?: string;
  category?: ProcessCategoryId;
  section?: SectionType;
  existingFields?: {
    descripcion?: string;
    objetivo?: string;
    alcance?: string;
    funciones_involucradas?: string[];
  };
  onApply: (
    data: NameOption | FullSuggestion | string | SIPOCSuggestion
  ) => void;
}

export function ProcessAISuggestionDialog({
  open,
  onClose,
  mode,
  processName,
  category,
  section,
  existingFields,
  onApply,
}: ProcessAISuggestionDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{
    nameOptions?: NameOption[];
    full?: FullSuggestion;
    section?: string;
    sipoc?: SIPOCSuggestion;
  } | null>(null);

  // Contexto opcional
  const [context, setContext] = useState({
    rubro: '',
    tamanioEmpresa: '',
  });

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const orgId =
        user?.organization_id ||
        (typeof window !== 'undefined'
          ? sessionStorage.getItem('organization_id') || undefined
          : undefined);

      const response = await fetch('/api/ai/process-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          processName,
          category,
          section,
          existingFields,
          context:
            context.rubro || context.tamanioEmpresa || orgId
              ? {
                  ...context,
                  organizationId: orgId,
                }
              : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar sugerencias');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido');
      }

      // Procesar respuesta según modo
      if (mode === 'name') {
        setSuggestions({ nameOptions: data.suggestions.nameOptions || [] });
      } else if (mode === 'full') {
        setSuggestions({ full: data.suggestions });
      } else if (mode === 'sipoc') {
        setSuggestions({ sipoc: data.suggestions });
      } else {
        setSuggestions({ section: data.suggestions[section || 'descripcion'] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyName = (option: NameOption) => {
    onApply(option);
    onClose();
  };

  const handleApplyFull = () => {
    if (suggestions?.full) {
      onApply(suggestions.full);
      onClose();
    }
  };

  const handleApplySection = () => {
    if (suggestions?.section) {
      onApply(suggestions.section);
      onClose();
    }
  };

  const handleApplySIPOC = () => {
    if (suggestions?.sipoc) {
      onApply(suggestions.sipoc);
      onClose();
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'name':
        return 'Sugerir Nombre de Proceso';
      case 'full':
        return 'Generar Definición Completa';
      case 'section':
        return `Sugerir ${section === 'objetivo' ? 'Objetivo' : section === 'alcance' ? 'Alcance' : section === 'funciones' ? 'Funciones' : 'Contenido'}`;
      case 'sipoc':
        return 'Generar Estructura SIPOC';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'name':
        return 'La IA generará 3 sugerencias de nombres para tu proceso ISO 9001.';
      case 'full':
        return `Generará contenido para todos los campos del proceso "${processName}".`;
      case 'section':
        return `Generará contenido para la sección seleccionada del proceso "${processName}".`;
      case 'sipoc':
        return `Generará Inputs, Outputs, Actividades, Controles y Riesgos para "${processName}".`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contexto opcional */}
          {!suggestions && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Contexto opcional (mejora las sugerencias)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rubro" className="text-xs">
                    Rubro / Industria
                  </Label>
                  <Input
                    id="rubro"
                    value={context.rubro}
                    onChange={e =>
                      setContext({ ...context, rubro: e.target.value })
                    }
                    placeholder="Ej: Manufactura, Servicios..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tamanio" className="text-xs">
                    Tamaño de empresa
                  </Label>
                  <Input
                    id="tamanio"
                    value={context.tamanioEmpresa}
                    onChange={e =>
                      setContext({ ...context, tamanioEmpresa: e.target.value })
                    }
                    placeholder="Ej: PYME, Grande..."
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botón generar */}
          {!suggestions && !loading && (
            <Button
              onClick={handleGenerate}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generar Sugerencias con IA
            </Button>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
              <p className="text-sm text-gray-600">Generando sugerencias...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Resultados: Modo Name */}
          {suggestions?.nameOptions && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Selecciona un nombre:
              </p>
              {suggestions.nameOptions.map((option, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-colors"
                  onClick={() => handleApplyName(option)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {option.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {option.reason}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-purple-600 opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resultados: Modo Full */}
          {suggestions?.full && (
            <div className="space-y-4">
              <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                {suggestions.full.descripcion && (
                  <div className="p-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                      Descripción
                    </p>
                    <p className="text-sm text-gray-900">
                      {suggestions.full.descripcion}
                    </p>
                  </div>
                )}
                {suggestions.full.objetivo && (
                  <div className="p-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                      Objetivo
                    </p>
                    <p className="text-sm text-gray-900">
                      {suggestions.full.objetivo}
                    </p>
                  </div>
                )}
                {suggestions.full.alcance && (
                  <div className="p-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                      Alcance
                    </p>
                    <p className="text-sm text-gray-900">
                      {suggestions.full.alcance}
                    </p>
                  </div>
                )}
                {suggestions.full.funciones &&
                  suggestions.full.funciones.length > 0 && (
                    <div className="p-3">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Funciones
                      </p>
                      <ul className="list-disc list-inside text-sm">
                        {suggestions.full.funciones.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
              <Button
                onClick={handleApplyFull}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aplicar Todo
              </Button>
            </div>
          )}

          {/* Resultados: Modo Section */}
          {suggestions?.section && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {suggestions.section}
                </p>
              </div>
              <Button
                onClick={handleApplySection}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aplicar Sugerencia
              </Button>
            </div>
          )}

          {/* Resultados: Modo SIPOC */}
          {suggestions?.sipoc && (
            <div className="space-y-4">
              <div className="border rounded-lg bg-gray-50 p-4 max-h-80 overflow-y-auto text-sm">
                <p className="font-medium text-purple-700 mb-2">
                  Resumen generado:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>
                    {suggestions.sipoc.activities?.length || 0} Actividades
                  </li>
                  <li>{suggestions.sipoc.inputs?.length || 0} Entradas</li>
                  <li>{suggestions.sipoc.outputs?.length || 0} Salidas</li>
                  <li>{suggestions.sipoc.controls?.length || 0} Controles</li>
                  <li>{suggestions.sipoc.risks?.length || 0} Riesgos</li>
                </ul>
                <p className="text-xs text-gray-500 mt-3 italic">
                  Revisá los detalles completos al aplicar.
                </p>
              </div>
              <Button
                onClick={handleApplySIPOC}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aplicar Estructura SIPOC
              </Button>
            </div>
          )}

          {/* Cerrar */}
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
