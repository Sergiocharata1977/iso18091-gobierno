import { ISO_CLASSIC_PROCESSES } from '@/types/isoClassicProcesses';
import {
  ProcessDefinitionFormData,
  ProcessSIPOC,
} from '@/types/processes-unified';
import { NormPointRelationServiceAdmin } from '@/services/normPoints/NormPointRelationServiceAdmin';
import { NormPointServiceAdmin } from '@/services/normPoints/NormPointServiceAdmin';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { ProcessDefinitionServiceAdmin } from '@/services/processRecords/ProcessDefinitionServiceAdmin';
import { NormPointSeedService } from './NormPointSeedService';

interface ProvisionInput {
  organizationId: string;
  processKeys: string[];
  createdBy: string;
  systemId: string;
}

interface ProcessTraceabilityRecord {
  processId: string;
  processKey: string;
  processName: string;
  clauseCodes: string[];
  linkedNormPointIds: string[];
  missingClauseCodes: string[];
}

interface ProvisionResult {
  createdProcesses: number;
  skippedProcesses: number;
  createdNormPoints: number;
  skippedNormPoints: number;
  createdRelations: number;
  skippedRelations: number;
  updatedNormPoints: number;
  missingNormPointLinks: number;
  processIds: string[];
  processTraceability: ProcessTraceabilityRecord[];
  installedCapabilities: string[];
  skippedCapabilities: string[];
  blockedCapabilities: string[];
}

function mapIsoCategory(categoryId: number): 1 | 2 | 3 | 4 {
  if (
    categoryId === 1 ||
    categoryId === 2 ||
    categoryId === 3 ||
    categoryId === 4
  ) {
    return categoryId;
  }
  return 3;
}

function buildSipoc(
  template: (typeof ISO_CLASSIC_PROCESSES)[number]['template']
): ProcessSIPOC {
  return {
    inputs: template.inputs.map((item, idx) => ({
      id: `in-${idx + 1}`,
      description: item,
      required: true,
    })),
    activities: template.activities.map(activity => ({
      id: `act-${activity.step}`,
      step: activity.step,
      name: activity.name,
      description: activity.description,
      record_template_id: activity.record || undefined,
    })),
    outputs: template.outputs.map((item, idx) => ({
      id: `out-${idx + 1}`,
      description: item,
    })),
    controls: template.indicators.map((indicator, idx) => ({
      id: `ctrl-${idx + 1}`,
      description: indicator.name,
      type: 'indicator',
      frequency: indicator.frequency || 'mensual',
      acceptance_criteria: indicator.target || undefined,
    })),
    risks: template.risks.map((risk, idx) => ({
      id: `risk-${idx + 1}`,
      description: risk.risk,
      cause: risk.cause || undefined,
      current_control: risk.control || undefined,
      effect: undefined,
      severity: 'media',
      probability: 'media',
      detection: 'media',
    })),
  };
}

export class ISOTemplateProvisionService {
  static async provision(input: ProvisionInput): Promise<ProvisionResult> {
    const selected = ISO_CLASSIC_PROCESSES.filter(process =>
      input.processKeys.includes(process.key)
    );

    const existing = await ProcessDefinitionServiceAdmin.getAllActive(
      input.organizationId
    );
    const existingByName = new Map(
      existing.map(item => [item.nombre.toLowerCase(), item])
    );

    let createdProcesses = 0;
    let skippedProcesses = 0;
    const processIds: string[] = [];
    const clausesToSeed: string[] = [];

    const processLinks: Array<{
      processId: string;
      processKey: string;
      processName: string;
      clauses: string[];
    }> = [];

    for (const process of selected) {
      const existingProcess = existingByName.get(process.name.toLowerCase());
      if (existingProcess?.id) {
        skippedProcesses += 1;
        clausesToSeed.push(...process.isoClause);
        processLinks.push({
          processId: existingProcess.id,
          processKey: process.key,
          processName: process.name,
          clauses: process.isoClause,
        });
        continue;
      }

      const payload: ProcessDefinitionFormData = {
        organization_id: input.organizationId,
        category_id: mapIsoCategory(process.categoryId),
        process_code: `ISO-${process.key.toUpperCase()}`,
        nombre: process.name,
        descripcion: process.description,
        objetivo: process.template.objective,
        alcance: process.template.scope,
        funciones_involucradas: process.template.involvedRoles,
        sipoc: buildSipoc(process.template),
        status: 'active',
        activo: true,
      };

      const processId = await ProcessDefinitionServiceAdmin.create(payload);
      processIds.push(processId);
      createdProcesses += 1;
      clausesToSeed.push(...process.isoClause);
      processLinks.push({
        processId,
        processKey: process.key,
        processName: process.name,
        clauses: process.isoClause,
      });
    }

    const normSeed = await NormPointSeedService.seedFromClauses({
      organizationId: input.organizationId,
      clauses: clausesToSeed,
      createdBy: input.createdBy,
    });

    const uniqueClauseCodes = [
      ...new Set(clausesToSeed.map(item => item.trim())),
    ].filter(Boolean);

    const normPoints = await NormPointServiceAdmin.getByOrganizationAndCodes(
      input.organizationId,
      uniqueClauseCodes,
      'iso_9001'
    );

    const normPointIdByCode = new Map(
      normPoints.map(point => [point.code.trim(), point.id])
    );

    let createdRelations = 0;
    let skippedRelations = 0;
    let updatedNormPoints = 0;
    let missingNormPointLinks = 0;
    const processTraceability: ProcessTraceabilityRecord[] = [];

    for (const processLink of processLinks) {
      const clauseCodes = [
        ...new Set(processLink.clauses.map(code => code.trim())),
      ].filter(Boolean);
      const linkedNormPointIds = clauseCodes
        .map(code => normPointIdByCode.get(code))
        .filter((id): id is string => Boolean(id));
      const missingClauseCodes = clauseCodes.filter(
        code => !normPointIdByCode.has(code)
      );

      if (linkedNormPointIds.length > 0) {
        const linkResult =
          await NormPointRelationServiceAdmin.linkProcessToNormPoints({
            organizationId: input.organizationId,
            processId: processLink.processId,
            normPointIds: linkedNormPointIds,
            userId: input.createdBy,
          });

        createdRelations += linkResult.createdRelations;
        skippedRelations += linkResult.skippedRelations;
        updatedNormPoints += linkResult.updatedNormPoints;
        missingNormPointLinks +=
          missingClauseCodes.length + linkResult.missingNormPoints.length;
      } else {
        missingNormPointLinks += missingClauseCodes.length;
      }

      processTraceability.push({
        processId: processLink.processId,
        processKey: processLink.processKey,
        processName: processLink.processName,
        clauseCodes,
        linkedNormPointIds,
        missingClauseCodes,
      });
    }

    const capabilityProvision =
      await CapabilityService.installTierCapabilitiesForSystem({
        organizationId: input.organizationId,
        systemId: input.systemId,
        userId: input.createdBy,
      });

    return {
      createdProcesses,
      skippedProcesses,
      createdNormPoints: normSeed.created,
      skippedNormPoints: normSeed.skipped,
      createdRelations,
      skippedRelations,
      updatedNormPoints,
      missingNormPointLinks,
      processIds,
      processTraceability,
      installedCapabilities: capabilityProvision.installed,
      skippedCapabilities: capabilityProvision.alreadyInstalled,
      blockedCapabilities: capabilityProvision.blockedByDependencies,
    };
  }
}
