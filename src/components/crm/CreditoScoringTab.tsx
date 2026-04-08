// src/components/crm/CreditoScoringTab.tsx
// Componente para la tab "Crédito y Scoring" en la ficha del cliente

'use client';

import { useOrganizationCapability } from '@/hooks/useOrganizationCapability';
import {
  CRM_RISK_SCORING_CAPABILITY_ID,
  CRM_RISK_SCORING_DISABLED_MESSAGE,
} from '@/lib/plugins/crmRiskScoringShared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  EvaluacionRiesgo,
  TierCredito,
} from '@/types/crm-evaluacion-riesgo';
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Lock,
  Loader2,
  Plus,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Props {
  clienteId: string;
  organizationId: string;
  patrimonioNeto: number;
}

export function CreditoScoringTab({
  clienteId,
  organizationId,
  patrimonioNeto,
}: Props) {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRiesgo[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    enabled: scoringEnabled,
    loading: capabilityLoading,
    error: capabilityError,
  } = useOrganizationCapability({
    organizationId,
    capabilityId: CRM_RISK_SCORING_CAPABILITY_ID,
  });

  const evaluacionVigente = evaluaciones.find(e => e.es_vigente);

  useEffect(() => {
    const loadEvaluaciones = async () => {
      if (!organizationId || !clienteId || capabilityLoading) return;

      if (!scoringEnabled) {
        setEvaluaciones([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `/api/crm/evaluaciones?organization_id=${organizationId}&cliente_id=${clienteId}`
        );
        const data = await response.json();

        if (data.success) {
          setEvaluaciones(data.data);
        }
      } catch (error) {
        console.error('Error loading evaluaciones:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvaluaciones();
  }, [organizationId, clienteId, capabilityLoading, scoringEnabled]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getTierBadge = (tier: TierCredito | undefined) => {
    if (!tier) return null;

    const styles: Record<string, string> = {
      A: 'bg-green-500 text-white',
      B: 'bg-blue-500 text-white',
      C: 'bg-yellow-500 text-white',
      REPROBADO: 'bg-red-500 text-white',
    };

    return (
      <Badge className={`text-lg px-3 py-1 ${styles[tier]}`}>Tier {tier}</Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading || capabilityLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!scoringEnabled) {
    return (
      <Card className="border-dashed border-2 border-amber-300 bg-amber-50/50">
        <CardContent className="py-12 text-center">
          <Lock className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Scoring crediticio bloqueado
          </h4>
          <p className="text-gray-600 mb-2">
            {capabilityError || CRM_RISK_SCORING_DISABLED_MESSAGE}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            El CRM comercial sigue disponible, pero este tenant no tiene
            habilitada la operatoria de riesgo y scoring.
          </p>
          <Link href="/capabilities/crm_risk_scoring">
            <Button variant="outline">Revisar capability</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botones */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Análisis de Riesgo Crediticio</h3>
        <div className="flex gap-2">
          <Link href="/crm/configuracion/scoring">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
          </Link>
          <Link href={`/crm/evaluaciones/nueva?cliente_id=${clienteId}`}>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Evaluación
            </Button>
          </Link>
        </div>
      </div>

      {/* Resumen Crediticio - Evaluación Vigente */}
      {evaluacionVigente ? (
        <Card className="border-2 border-primary bg-gradient-to-r from-gray-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Evaluación Vigente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              {/* Tier */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Tier Asignado</p>
                {evaluacionVigente.tier_asignado ? (
                  getTierBadge(evaluacionVigente.tier_asignado)
                ) : (
                  <Badge variant="outline">Pendiente</Badge>
                )}
              </div>

              {/* Score */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Score Total</p>
                <p
                  className={`text-3xl font-bold ${getScoreColor(evaluacionVigente.score_ponderado_total)}`}
                >
                  {evaluacionVigente.score_ponderado_total.toFixed(2)}
                </p>
              </div>

              {/* Límite */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Límite Crédito</p>
                <p className="text-2xl font-bold text-gray-900">
                  {evaluacionVigente.limite_credito_asignado
                    ? formatCurrency(evaluacionVigente.limite_credito_asignado)
                    : '—'}
                </p>
              </div>

              {/* Estado */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Estado</p>
                <Badge
                  className={
                    evaluacionVigente.estado === 'aprobada'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }
                >
                  {evaluacionVigente.estado.charAt(0).toUpperCase() +
                    evaluacionVigente.estado.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Detalle de Scores */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Detalle de Scoring
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Cualitativos (43%)</span>
                    <span className="font-medium">
                      {evaluacionVigente.score_cualitativos.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(evaluacionVigente.score_cualitativos / 10) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Conflictos (31%)</span>
                    <span className="font-medium">
                      {evaluacionVigente.score_conflictos.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{
                        width: `${(evaluacionVigente.score_conflictos / 10) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Cuantitativos (26%)</span>
                    <span className="font-medium">
                      {evaluacionVigente.score_cuantitativos.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${(evaluacionVigente.score_cuantitativos / 10) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Límites */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Patrimonio Neto:</span>
                  <p className="font-medium">
                    {formatCurrency(
                      patrimonioNeto ||
                        evaluacionVigente.patrimonio_neto_computable
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Capital Garantía (50%):</span>
                  <p className="font-medium text-green-600">
                    {formatCurrency(evaluacionVigente.capital_garantia)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Fecha Evaluación:</span>
                  <p className="font-medium">
                    {formatDate(evaluacionVigente.fecha_evaluacion)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Link href={`/crm/evaluaciones/${evaluacionVigente.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalle Completo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Sin Evaluación de Riesgo
            </h4>
            <p className="text-gray-500 mb-4">
              Este cliente aún no tiene una evaluación crediticia
            </p>
            <Link href={`/crm/evaluaciones/nueva?cliente_id=${clienteId}`}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Evaluación
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Historial de Evaluaciones */}
      {evaluaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Historial de Evaluaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Tier</TableHead>
                  <TableHead className="text-right">Límite</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluaciones.map(eval_ => (
                  <TableRow
                    key={eval_.id}
                    className={eval_.es_vigente ? 'bg-green-50' : ''}
                  >
                    <TableCell>
                      {formatDate(eval_.fecha_evaluacion)}
                      {eval_.es_vigente && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-xs border-green-500 text-green-600"
                        >
                          Vigente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {eval_.score_ponderado_total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {eval_.tier_asignado ? (
                        <Badge
                          className={
                            eval_.tier_asignado === 'A'
                              ? 'bg-green-500 text-white'
                              : eval_.tier_asignado === 'B'
                                ? 'bg-blue-500 text-white'
                                : 'bg-yellow-500 text-white'
                          }
                        >
                          {eval_.tier_asignado}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {eval_.limite_credito_asignado
                        ? formatCurrency(eval_.limite_credito_asignado)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          eval_.estado === 'aprobada'
                            ? 'border-green-500 text-green-600'
                            : eval_.estado === 'rechazada'
                              ? 'border-red-500 text-red-600'
                              : ''
                        }
                      >
                        {eval_.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/crm/evaluaciones/${eval_.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
