'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  getComplianceStatusColor,
  getComplianceStatusIcon,
  getComplianceStatusText,
  MANDATORY_PROCESSES,
  ProcessComplianceStatus,
} from '@/lib/constants/mandatoryProcesses';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ProcessStatus {
  id: string;
  nombre: string;
  clausula_iso: string;
  estado: ProcessComplianceStatus;
  ruta: string;
  es_condicional: boolean;
  sugerencia?: string;
}

interface ComplianceSummary {
  total: number;
  no_definido: number;
  definido_minimo: number;
  implementado: number;
  eficaz: number;
  porcentaje: number;
}

interface AIGeneratedProcess {
  nombre?: string;
  descripcion?: string;
  objetivo?: string;
  alcance?: string;
  entradas?: string[];
  salidas?: string[];
  funciones?: string[];
  registros?: string[];
  indicadores?: string[];
}

export function ProcessComplianceMatrix() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [procesos, setProcesos] = useState<ProcessStatus[]>([]);
  const [resumen, setResumen] = useState<ComplianceSummary>({
    total: 0,
    no_definido: 0,
    definido_minimo: 0,
    implementado: 0,
    eficaz: 0,
    porcentaje: 0,
  });
  const [mostrarCondicionales, setMostrarCondicionales] = useState(true);

  // Estados para IA
  const [selectedProcess, setSelectedProcess] = useState<ProcessStatus | null>(
    null
  );
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAIResult] = useState<AIGeneratedProcess | null>(null);
  const [aiError, setAIError] = useState<string | null>(null);

  const verificarCumplimiento = async () => {
    if (!user?.organization_id) return;

    setLoading(true);

    try {
      // Obtener definiciones de proceso existentes
      const processDefsResponse = await fetch('/api/process-definitions');
      const processDefs = processDefsResponse.ok
        ? await processDefsResponse.json()
        : [];

      // Obtener documentos
      const docsResponse = await fetch('/api/documents');
      const docs = docsResponse.ok ? await docsResponse.json() : [];

      // Crear Set de nombres para búsqueda rápida
      const processNames = new Set(
        (processDefs || [])
          .map((p: { nombre?: string }) => p.nombre?.toLowerCase().trim())
          .filter(Boolean)
      );

      const docTitles = new Set(
        (docs || [])
          .map((d: { title?: string }) => d.title?.toLowerCase().trim())
          .filter(Boolean)
      );

      // Evaluar cada proceso obligatorio
      const resultados: ProcessStatus[] = MANDATORY_PROCESSES.map(proceso => {
        const nombreLower = proceso.nombre.toLowerCase();

        // Buscar coincidencias (búsqueda flexible)
        const tieneDefinicion = Array.from(processNames).some(
          (name): name is string =>
            typeof name === 'string' &&
            (name.includes(nombreLower) || nombreLower.includes(name))
        );

        const tieneDocumento = Array.from(docTitles).some(
          (title): title is string =>
            typeof title === 'string' &&
            (title.includes(nombreLower) || nombreLower.includes(title))
        );

        let estado: ProcessComplianceStatus = 'no_definido';
        let sugerencia: string | undefined;

        if (tieneDefinicion && tieneDocumento) {
          estado = 'implementado';
        } else if (tieneDefinicion || tieneDocumento) {
          estado = 'definido_minimo';
          if (!tieneDocumento) {
            sugerencia = `Falta documentación formal para "${proceso.nombre}"`;
          } else {
            sugerencia = `Falta definición de proceso para "${proceso.nombre}"`;
          }
        } else {
          estado = 'no_definido';
          sugerencia = `Definí el proceso "${proceso.nombre}" para cumplir con ISO ${proceso.clausula_iso}`;
        }

        return {
          id: proceso.id,
          nombre: proceso.nombre,
          clausula_iso: proceso.clausula_iso,
          estado,
          ruta: proceso.ruta,
          es_condicional: proceso.es_condicional,
          sugerencia,
        };
      });

      setProcesos(resultados);

      // Calcular resumen
      const procesosActivos = mostrarCondicionales
        ? resultados
        : resultados.filter(p => !p.es_condicional);

      const summary = {
        total: procesosActivos.length,
        no_definido: procesosActivos.filter(p => p.estado === 'no_definido')
          .length,
        definido_minimo: procesosActivos.filter(
          p => p.estado === 'definido_minimo'
        ).length,
        implementado: procesosActivos.filter(p => p.estado === 'implementado')
          .length,
        eficaz: procesosActivos.filter(p => p.estado === 'eficaz').length,
        porcentaje: 0,
      };

      // Calcular porcentaje ponderado
      const puntos =
        summary.eficaz * 100 +
        summary.implementado * 75 +
        summary.definido_minimo * 50;
      summary.porcentaje =
        summary.total > 0 ? Math.round(puntos / summary.total) : 0;

      setResumen(summary);
    } catch (error) {
      console.error('Error verificando cumplimiento:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler para crear proceso con IA
  const handleCrearConIA = async (proceso: ProcessStatus) => {
    setSelectedProcess(proceso);
    setAIResult(null);
    setAIError(null);
    setIsAIDialogOpen(true);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/process-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'full',
          processName: proceso.nombre,
          context: {
            organizationId: user?.organization_id,
            normaCriterios: `ISO 9001:2015 - Cláusula ${proceso.clausula_iso}`,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.suggestions) {
        setAIResult(data.suggestions);
      } else {
        // Verificar si es un guardrail de etapa
        if (data.stage !== undefined && data.stage < 3) {
          setAIError(
            data.error ||
              'Tu organización está en una etapa temprana. Completá primero el diagnóstico y la planificación estratégica antes de crear procesos.'
          );
        } else {
          setAIError(data.error || 'Error al generar sugerencias con IA');
        }
      }
    } catch (error) {
      console.error('Error llamando API IA:', error);
      setAIError(
        'Error de conexión. Por favor intentá de nuevo en unos segundos.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler para aplicar sugerencia y crear proceso
  const handleAplicarYCrear = () => {
    if (!selectedProcess || !aiResult) return;

    // Navegar a crear proceso con los datos pre-llenados
    const params = new URLSearchParams({
      nombre: selectedProcess.nombre,
      descripcion: aiResult.descripcion || '',
      objetivo: aiResult.objetivo || '',
      alcance: aiResult.alcance || '',
      clausula_iso: selectedProcess.clausula_iso,
      prefilled: 'true',
    });

    setIsAIDialogOpen(false);
    router.push(`/dashboard/procesos/definiciones/nuevo?${params.toString()}`);
  };

  useEffect(() => {
    verificarCumplimiento();
  }, [user?.organization_id, mostrarCondicionales]);

  const procesosAMostrar = mostrarCondicionales
    ? procesos
    : procesos.filter(p => !p.es_condicional);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="ml-2 text-slate-500">
            Verificando cumplimiento...
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-4 text-center">
            <p className="text-4xl font-bold">{resumen.porcentaje}%</p>
            <p className="text-sm opacity-90">Cumplimiento</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {resumen.no_definido}
            </p>
            <p className="text-xs text-slate-500">No definidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {resumen.definido_minimo}
            </p>
            <p className="text-xs text-slate-500">Mínimos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {resumen.implementado}
            </p>
            <p className="text-xs text-slate-500">Implementados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {resumen.eficaz}
            </p>
            <p className="text-xs text-slate-500">Eficaces</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas si hay procesos faltantes */}
      {resumen.no_definido > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">
              {resumen.no_definido} proceso(s) obligatorio(s) sin definir
            </p>
            <p className="text-sm text-amber-700 mt-1">
              El sistema te acompaña en el cumplimiento pero no te bloquea.
              Podés definir estos procesos cuando lo consideres oportuno.
            </p>
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="mostrarCondicionales"
            checked={mostrarCondicionales}
            onChange={e => setMostrarCondicionales(e.target.checked)}
            className="rounded border-slate-300"
          />
          <label
            htmlFor="mostrarCondicionales"
            className="text-sm text-slate-600"
          >
            Incluir procesos condicionales (según tipo de empresa)
          </label>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={verificarCumplimiento}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Matriz de procesos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Matriz de Procesos Obligatorios ISO 9001
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 font-medium text-slate-600">
                    Proceso
                  </th>
                  <th className="text-center p-3 font-medium text-slate-600">
                    Cláusula
                  </th>
                  <th className="text-center p-3 font-medium text-slate-600">
                    Estado
                  </th>
                  <th className="text-left p-3 font-medium text-slate-600">
                    Sugerencia
                  </th>
                  <th className="text-center p-3 font-medium text-slate-600">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {procesosAMostrar.map(proceso => (
                  <tr
                    key={proceso.id}
                    className="border-b hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {proceso.nombre}
                        </span>
                        {proceso.es_condicional && (
                          <Badge variant="outline" className="text-xs">
                            Condicional
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-slate-500 font-mono text-xs">
                        {proceso.clausula_iso}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        className={`${getComplianceStatusColor(proceso.estado)} border`}
                      >
                        {getComplianceStatusIcon(proceso.estado)}{' '}
                        {getComplianceStatusText(proceso.estado)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {proceso.sugerencia && (
                        <div className="flex items-start gap-2 text-xs text-slate-500">
                          <Info className="h-4 w-4 flex-shrink-0 text-blue-500" />
                          <span>{proceso.sugerencia}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={proceso.ruta}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ir
                          </Button>
                        </Link>
                        {proceso.estado === 'no_definido' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs text-purple-600 hover:text-purple-700"
                            onClick={() => handleCrearConIA(proceso)}
                          >
                            <Sparkles className="h-3 w-3" />
                            Crear con IA
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Leyenda */}
      <Card className="bg-slate-50">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-slate-700 mb-2">
            Leyenda de estados:
          </p>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span>❌</span>
              <span className="text-slate-600">
                No definido - Falta definición y documentación
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>⚠️</span>
              <span className="text-slate-600">
                Mínimo - Existe definición o documento parcial
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>✅</span>
              <span className="text-slate-600">
                Implementado - Definición + documentación completa
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>⭐</span>
              <span className="text-slate-600">
                Eficaz - Con métricas y auditorías favorables
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de IA */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Crear proceso con IA
            </DialogTitle>
            <DialogDescription>
              {selectedProcess?.nombre} - Cláusula{' '}
              {selectedProcess?.clausula_iso}
            </DialogDescription>
          </DialogHeader>

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
              <p className="text-slate-600">
                Generando sugerencia para este proceso...
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Esto puede tomar unos segundos
              </p>
            </div>
          )}

          {aiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">⚠️ {aiError}</p>
            </div>
          )}

          {aiResult && (
            <div className="space-y-4">
              {aiResult.descripcion && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">
                    Descripción
                  </h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                    {aiResult.descripcion}
                  </p>
                </div>
              )}

              {aiResult.objetivo && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Objetivo</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                    {aiResult.objetivo}
                  </p>
                </div>
              )}

              {aiResult.alcance && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Alcance</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                    {aiResult.alcance}
                  </p>
                </div>
              )}

              {aiResult.entradas && aiResult.entradas.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Entradas</h4>
                  <ul className="text-sm text-slate-600 bg-slate-50 p-3 rounded list-disc list-inside">
                    {aiResult.entradas.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResult.salidas && aiResult.salidas.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Salidas</h4>
                  <ul className="text-sm text-slate-600 bg-slate-50 p-3 rounded list-disc list-inside">
                    {aiResult.salidas.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResult.indicadores && aiResult.indicadores.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">
                    Indicadores sugeridos
                  </h4>
                  <ul className="text-sm text-slate-600 bg-slate-50 p-3 rounded list-disc list-inside">
                    {aiResult.indicadores.map((ind, i) => (
                      <li key={i}>{ind}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>
              Cancelar
            </Button>
            {aiResult && (
              <Button
                onClick={handleAplicarYCrear}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Crear proceso con estos datos
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
