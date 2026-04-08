'use client';

import { useMemo } from 'react';
import type { ProcessDefinition } from '@/types/procesos';
import type { QualityIndicator, QualityObjective } from '@/types/quality';

export type ObjectiveNode = {
  objective: QualityObjective;
  indicators: QualityIndicator[];
};

export type ProcessNode = {
  process: ProcessDefinition;
  objectives: ObjectiveNode[];
  indicators: QualityIndicator[];
};

export type AssignmentHierarchyResult = {
  processNodes: ProcessNode[];
  orphanIndicators: QualityIndicator[];
  objectiveById: Map<string, QualityObjective>;
  indicatorById: Map<string, QualityIndicator>;
  processObjectiveIds: Map<string, string[]>;
  processIndicatorIds: Map<string, string[]>;
  objectiveIndicatorIds: Map<string, string[]>;
};

interface UseAssignmentHierarchyParams {
  availableProcesses: ProcessDefinition[];
  availableObjectives: QualityObjective[];
  availableIndicators: QualityIndicator[];
}

export function useAssignmentHierarchy({
  availableProcesses,
  availableObjectives,
  availableIndicators,
}: UseAssignmentHierarchyParams): AssignmentHierarchyResult {
  return useMemo(() => {
    const processMap = new Map(
      availableProcesses.map(process => [process.id, process])
    );
    const objectiveById = new Map(
      availableObjectives.map(objective => [objective.id, objective])
    );
    const indicatorById = new Map(
      availableIndicators.map(indicator => [indicator.id, indicator])
    );

    const objectivesByProcess = new Map<string, QualityObjective[]>();
    const indicatorsByObjective = new Map<string, QualityIndicator[]>();
    const indicatorsByProcess = new Map<string, QualityIndicator[]>();

    for (const objective of availableObjectives) {
      const processId = objective.process_definition_id;
      const bucket = objectivesByProcess.get(processId) || [];
      bucket.push(objective);
      objectivesByProcess.set(processId, bucket);
    }

    const orphanIndicators: QualityIndicator[] = [];
    for (const indicator of availableIndicators) {
      if (indicator.objective_id && objectiveById.has(indicator.objective_id)) {
        const bucket = indicatorsByObjective.get(indicator.objective_id) || [];
        bucket.push(indicator);
        indicatorsByObjective.set(indicator.objective_id, bucket);
        continue;
      }

      if (
        indicator.process_definition_id &&
        processMap.has(indicator.process_definition_id)
      ) {
        const bucket =
          indicatorsByProcess.get(indicator.process_definition_id) || [];
        bucket.push(indicator);
        indicatorsByProcess.set(indicator.process_definition_id, bucket);
        continue;
      }

      orphanIndicators.push(indicator);
    }

    const processNodes = availableProcesses.map(process => {
      const processObjectives = objectivesByProcess.get(process.id) || [];
      return {
        process,
        objectives: processObjectives.map(objective => ({
          objective,
          indicators: indicatorsByObjective.get(objective.id) || [],
        })),
        indicators: indicatorsByProcess.get(process.id) || [],
      };
    });

    const processObjectiveIds = new Map<string, string[]>();
    const processIndicatorIds = new Map<string, string[]>();
    const objectiveIndicatorIds = new Map<string, string[]>();

    for (const node of processNodes) {
      processObjectiveIds.set(
        node.process.id,
        node.objectives.map(item => item.objective.id)
      );
      processIndicatorIds.set(node.process.id, [
        ...node.indicators.map(indicator => indicator.id),
        ...node.objectives.flatMap(item =>
          item.indicators.map(indicator => indicator.id)
        ),
      ]);
      for (const objectiveNode of node.objectives) {
        objectiveIndicatorIds.set(
          objectiveNode.objective.id,
          objectiveNode.indicators.map(indicator => indicator.id)
        );
      }
    }

    return {
      processNodes,
      orphanIndicators,
      objectiveById,
      indicatorById,
      processObjectiveIds,
      processIndicatorIds,
      objectiveIndicatorIds,
    };
  }, [availableIndicators, availableObjectives, availableProcesses]);
}
