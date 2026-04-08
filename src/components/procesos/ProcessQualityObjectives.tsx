'use client';

import { Section } from '@/components/design-system/layout';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { ListGrid } from '@/components/design-system/patterns/lists';
import { ObjectiveFormDialog } from '@/components/quality/ObjectiveFormDialog';
import { Button } from '@/components/ui/button';
import {
  Measurement,
  QualityIndicator,
  QualityObjective,
} from '@/types/quality';
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Minus,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProcessQualityObjectivesProps {
  processId: string;
  onNavigateToQuality: () => void;
}

export function ProcessQualityObjectives({
  processId,
  onNavigateToQuality,
}: ProcessQualityObjectivesProps) {
  const [objectives, setObjectives] = useState<QualityObjective[]>([]);
  const [indicators, setIndicators] = useState<QualityIndicator[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showNewObjectiveDialog, setShowNewObjectiveDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProcessQualityData();
  }, [processId]);

  const fetchProcessQualityData = async () => {
    try {
      setLoading(true);
      // Fetch objectives
      const objectivesResponse = await fetch(
        `/api/quality/objectives?process_definition_id=${processId}`
      );
      if (!objectivesResponse.ok) throw new Error('Failed to fetch objectives');

      const processObjectives = await objectivesResponse.json();
      setObjectives(processObjectives || []);

      // Fetch indicators
      const indicatorsResponse = await fetch(
        `/api/quality/indicators?process_definition_id=${processId}`
      );
      if (indicatorsResponse.ok) {
        const allIndicators = await indicatorsResponse.json();
        setIndicators(allIndicators || []);

        // Fetch recent measurements (simplified for brevity)
        // In a real refactor, this might be moved to a service or hook
        const indicatorIds = (allIndicators || []).map((ind: any) => ind.id);
        const recentMeasurements: Measurement[] = [];
        for (const indId of indicatorIds) {
          const measResponse = await fetch(
            `/api/quality/measurements?indicator_id=${indId}`
          );
          if (measResponse.ok) {
            const indMeasurements = await measResponse.json();
            recentMeasurements.push(...(indMeasurements || []).slice(0, 1)); // Just latest
          }
        }
        setMeasurements(recentMeasurements);
      }
    } catch (error) {
      console.error('Error fetching quality data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getObjectiveIndicators = (objectiveId: string) =>
    indicators.filter(ind => ind.objective_id === objectiveId);

  const getMeasurementValue = (indicatorId: string) => {
    const m = measurements.find(m => m.indicator_id === indicatorId);
    return m ? m.value : null;
  };

  const renderObjectiveCard = (objective: QualityObjective) => {
    const obIndicators = getObjectiveIndicators(objective.id);
    const isAtRisk =
      objective.status === 'activo' &&
      objective.progress_percentage < objective.alert_threshold;

    return (
      <DomainCard
        title={objective.title}
        subtitle={objective.code}
        status={{
          label:
            objective.status.charAt(0).toUpperCase() +
            objective.status.slice(1),
          variant:
            objective.status === 'activo'
              ? 'success'
              : objective.status === 'atrasado'
                ? 'warning'
                : 'secondary',
        }}
        meta={
          <div className="flex flex-wrap gap-4 pt-1">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground/70">
                Progreso
              </span>
              <span className="text-sm font-medium">
                {objective.progress_percentage}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground/70">
                Meta
              </span>
              <span className="text-sm font-medium">
                {objective.target_value} {objective.unit}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground/70">
                Vence
              </span>
              <span className="text-sm font-medium">
                {new Date(objective.due_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        }
        actions={[
          {
            label: 'Ver Detalle',
            icon: <ChevronRight className="w-4 h-4" />,
            onClick: () =>
              (window.location.href = `/procesos/objetivos/${objective.id}`),
            variant: 'ghost',
          },
        ]}
      >
        {/* Custom Content: Indicators Preview */}
        {obIndicators.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Indicadores Clave
            </p>
            <div className="space-y-2">
              {obIndicators.slice(0, 2).map(ind => (
                <div
                  key={ind.id}
                  className="flex justify-between items-center text-xs bg-muted/40 p-2 rounded"
                >
                  <span>{ind.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {getMeasurementValue(ind.id) ?? '-'} {ind.unit}
                    </span>
                    {ind.trend === 'ascendente' ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : ind.trend === 'descendente' ? (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    ) : (
                      <Minus className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {isAtRisk && (
          <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Riesgo detectado: Progreso bajo</span>
          </div>
        )}
      </DomainCard>
    );
  };

  return (
    <Section
      title={`Objetivos de Calidad (${objectives.length})`}
      description="Gestión de objetivos SMART vinculados al proceso"
      actions={
        <div className="flex space-x-2">
          <Button size="sm" onClick={() => setShowNewObjectiveDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo
          </Button>
          <Button variant="outline" size="sm" onClick={onNavigateToQuality}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Gestionar
          </Button>
        </div>
      }
    >
      <ListGrid
        data={objectives}
        renderItem={renderObjectiveCard}
        keyExtractor={obj => obj.id}
        emptyState={
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No hay objetivos definidos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comienza definiendo metas para este proceso.
            </p>
            <Button onClick={() => setShowNewObjectiveDialog(true)}>
              Crear Primer Objetivo
            </Button>
          </div>
        }
      />

      <ObjectiveFormDialog
        open={showNewObjectiveDialog}
        onOpenChange={setShowNewObjectiveDialog}
        onSuccess={fetchProcessQualityData}
        processId={processId}
      />
    </Section>
  );
}
