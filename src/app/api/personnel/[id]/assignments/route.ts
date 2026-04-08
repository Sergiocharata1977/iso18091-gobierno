import { withAuth } from '@/lib/api/withAuth';
import { UserContextService } from '@/services/context/UserContextService';
import { ProcessService } from '@/services/procesos/ProcessService';
import { QualityIndicatorService } from '@/services/quality/QualityIndicatorService';
import { QualityObjectiveService } from '@/services/quality/QualityObjectiveService';
import { PersonnelService } from '@/services/rrhh/PersonnelService';
import { NextResponse } from 'next/server';

function normalizeAssignmentIds(value: unknown): string[] {
  return Array.from(
    new Set(
      Array.isArray(value)
        ? value.filter(
            (item): item is string =>
              typeof item === 'string' && Boolean(item.trim())
          )
        : []
    )
  );
}

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await PersonnelService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Personal no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        current.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      const assignments: {
        procesos_asignados?: string[];
        objetivos_asignados?: string[];
        indicadores_asignados?: string[];
      } = {};

      if (body.procesos_asignados !== undefined)
        assignments.procesos_asignados = normalizeAssignmentIds(
          body.procesos_asignados
        );
      if (body.objetivos_asignados !== undefined)
        assignments.objetivos_asignados = normalizeAssignmentIds(
          body.objetivos_asignados
        );
      if (body.indicadores_asignados !== undefined)
        assignments.indicadores_asignados = normalizeAssignmentIds(
          body.indicadores_asignados
        );

      const [processes, objectives, indicators] = await Promise.all([
        ProcessService.getAll(),
        QualityObjectiveService.getAll(),
        QualityIndicatorService.getAll(),
      ]);

      const processIds = new Set(processes.map(process => process.id));
      const objectiveById = new Map(
        objectives.map(objective => [objective.id, objective])
      );
      const indicatorById = new Map(
        indicators.map(indicator => [indicator.id, indicator])
      );
      const assignedProcesses = new Set(assignments.procesos_asignados || []);

      for (const objectiveId of assignments.objetivos_asignados || []) {
        const objective = objectiveById.get(objectiveId);
        if (!objective) continue;

        if (!processIds.has(objective.process_definition_id)) {
          console.warn(
            '[personnel.assignments] objetivo asignado con proceso inexistente',
            {
              personnelId: id,
              objectiveId,
              processDefinitionId: objective.process_definition_id,
            }
          );
          continue;
        }

        if (!assignedProcesses.has(objective.process_definition_id)) {
          console.warn(
            '[personnel.assignments] objetivo asignado sin proceso padre asignado',
            {
              personnelId: id,
              objectiveId,
              processDefinitionId: objective.process_definition_id,
            }
          );
        }
      }

      for (const indicatorId of assignments.indicadores_asignados || []) {
        const indicator = indicatorById.get(indicatorId);
        if (!indicator?.process_definition_id) continue;

        if (!processIds.has(indicator.process_definition_id)) {
          console.warn(
            '[personnel.assignments] indicador asignado con proceso inexistente',
            {
              personnelId: id,
              indicatorId,
              processDefinitionId: indicator.process_definition_id,
              objectiveId: indicator.objective_id || null,
            }
          );
          continue;
        }

        if (!assignedProcesses.has(indicator.process_definition_id)) {
          console.warn(
            '[personnel.assignments] indicador asignado sin proceso padre asignado',
            {
              personnelId: id,
              indicatorId,
              processDefinitionId: indicator.process_definition_id,
              objectiveId: indicator.objective_id || null,
            }
          );
        }
      }

      await PersonnelService.updateAssignments(id, assignments);
      if (current.user_id) {
        UserContextService.invalidateCache(current.user_id);
      }
      return NextResponse.json({
        message: 'Asignaciones actualizadas exitosamente',
      });
    } catch (error) {
      console.error('Error updating personnel assignments:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Error al actualizar asignaciones';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
