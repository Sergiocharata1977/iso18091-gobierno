'use client';

/**
 * ProcessISOTemplateDialog
 *
 * Diálogo que aparece cuando se detecta un proceso clásico ISO 9001.
 * Permite al usuario aplicar una plantilla completa o por secciones.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ISOClassicProcess } from '@/types/isoClassicProcesses';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

interface ProcessISOTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  process: ISOClassicProcess;
  matchScore: number;
  onApplyAll: (template: any) => void;
  onApplySection: (section: string, value: any) => void;
}

export function ProcessISOTemplateDialog({
  open,
  onClose,
  process,
  matchScore,
  onApplyAll,
  onApplySection,
}: ProcessISOTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['objetivo', 'actividades'])
  );
  const [appliedSections, setAppliedSections] = useState<Set<string>>(
    new Set()
  );

  // Contexto opcional
  const [context, setContext] = useState({
    rubro: '',
    tamanioEmpresa: '',
  });

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/process-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: 'current', // Se obtiene del contexto en producción
          detectedProcessKey: process.key,
          processName: process.name,
          organizationProfile: {
            industry: context.rubro || undefined,
          },
          optionalUserContext: context.tamanioEmpresa
            ? `Tamaño de empresa: ${context.tamanioEmpresa}`
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar plantilla');
      }

      const data = await response.json();

      if (data.success && data.template) {
        setTemplate(data.template);
      } else {
        throw new Error('No se pudo generar la plantilla');
      }
    } catch (err) {
      console.error('Error generando plantilla:', err);
      setError('No se pudo generar la plantilla. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleApplySection = (section: string, value: any) => {
    onApplySection(section, value);
    setAppliedSections(new Set([...appliedSections, section]));
  };

  const handleApplyAll = () => {
    if (template) {
      onApplyAll(template);
      onClose();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Renderizar una sección expandible
  const renderSection = (
    key: string,
    title: string,
    content: React.ReactNode,
    rawValue: any
  ) => {
    const isExpanded = expandedSections.has(key);
    const isApplied = appliedSections.has(key);

    return (
      <div key={key} className="border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(key)}
          className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isApplied && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            <span className="font-medium text-sm">{title}</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>
        {isExpanded && (
          <div className="p-3 border-t">
            <div className="text-sm text-slate-700 mb-3">{content}</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApplySection(key, rawValue)}
                disabled={isApplied}
                className="text-xs"
              >
                {isApplied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Aplicado
                  </>
                ) : (
                  'Aplicar'
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(
                    typeof rawValue === 'string'
                      ? rawValue
                      : JSON.stringify(rawValue, null, 2)
                  )
                }
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span>Plantilla ISO 9001 Detectada</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {process.name}
                </Badge>
                <Badge className="bg-green-100 text-green-800 text-xs">
                  {matchScore}% coincidencia
                </Badge>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            {process.description}
            <br />
            <span className="text-purple-600 font-medium">
              Cláusulas ISO: {process.isoClause.join(', ')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Contexto opcional */}
          {!template && !loading && (
            <div className="space-y-4 mb-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 font-medium">
                Contexto opcional (mejora las sugerencias):
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rubro" className="text-xs">
                    Rubro/Industria
                  </Label>
                  <Input
                    id="rubro"
                    value={context.rubro}
                    onChange={e =>
                      setContext({ ...context, rubro: e.target.value })
                    }
                    placeholder="Ej: Agroindustria, Tecnología"
                    className="text-sm"
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
                    placeholder="Ej: PYME, Grande"
                    className="text-sm"
                  />
                </div>
              </div>
              <Button
                onClick={handleGenerate}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Plantilla Completa
              </Button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4 animate-pulse">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <p className="text-slate-600 font-medium">
                Don Cándido está preparando la plantilla...
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Generando contenido ISO 9001
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
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
          )}

          {/* Template generada */}
          {template && !loading && (
            <div className="space-y-3">
              {renderSection(
                'objetivo',
                '🎯 Objetivo',
                <p className="whitespace-pre-wrap">{template.objective}</p>,
                template.objective
              )}

              {renderSection(
                'alcance',
                '📐 Alcance',
                <p className="whitespace-pre-wrap">{template.scope}</p>,
                template.scope
              )}

              {renderSection(
                'responsable',
                '👤 Responsable Sugerido',
                <p>{template.ownerRole}</p>,
                template.ownerRole
              )}

              {renderSection(
                'funciones',
                '👥 Funciones Involucradas',
                <ul className="list-disc list-inside space-y-1">
                  {template.involvedRoles?.map((role: string, i: number) => (
                    <li key={i}>{role}</li>
                  ))}
                </ul>,
                template.involvedRoles
              )}

              {renderSection(
                'actividades',
                '📋 Actividades',
                <ol className="list-decimal list-inside space-y-2">
                  {template.activities?.map((act: any) => (
                    <li key={act.step}>
                      <strong>{act.name}</strong>: {act.description}
                      {act.record && (
                        <span className="text-purple-600 text-xs ml-2">
                          [Registro: {act.record}]
                        </span>
                      )}
                    </li>
                  ))}
                </ol>,
                template.activities
              )}

              {renderSection(
                'registros',
                '📄 Registros Sugeridos',
                <ul className="list-disc list-inside space-y-1">
                  {template.records?.map((rec: any, i: number) => (
                    <li key={i}>
                      <strong>{rec.name}</strong>
                      {rec.codeSuggestion && (
                        <span className="text-slate-500 text-xs ml-2">
                          ({rec.codeSuggestion})
                        </span>
                      )}
                      {rec.retention && (
                        <span className="text-slate-400 text-xs ml-2">
                          - Retención: {rec.retention}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>,
                template.records
              )}

              {renderSection(
                'indicadores',
                '📊 Indicadores (KPIs)',
                <ul className="list-disc list-inside space-y-1">
                  {template.indicators?.map((ind: any, i: number) => (
                    <li key={i}>
                      <strong>{ind.name}</strong>
                      {ind.formula && (
                        <span className="text-slate-500 text-xs block ml-4">
                          Fórmula: {ind.formula}
                        </span>
                      )}
                      {ind.target && (
                        <span className="text-green-600 text-xs ml-4">
                          Meta: {ind.target}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>,
                template.indicators
              )}

              {renderSection(
                'riesgos',
                '⚠️ Riesgos Identificados',
                <ul className="list-disc list-inside space-y-1">
                  {template.risks?.map((risk: any, i: number) => (
                    <li key={i}>
                      <strong>{risk.risk}</strong>
                      {risk.control && (
                        <span className="text-blue-600 text-xs block ml-4">
                          Control: {risk.control}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>,
                template.risks
              )}

              {template.notes && template.notes.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                  <p className="font-medium text-amber-800 text-sm mb-2">
                    📝 Notas:
                  </p>
                  <ul className="list-disc list-inside text-sm text-amber-700">
                    {template.notes.map((note: string, i: number) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {template && (
            <Button
              onClick={handleApplyAll}
              className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            >
              <Check className="h-4 w-4" />
              Aplicar Todo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
