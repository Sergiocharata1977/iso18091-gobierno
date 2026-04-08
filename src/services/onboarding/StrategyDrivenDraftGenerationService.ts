import { getAdminFirestore } from '@/lib/firebase/admin';
import type { StrategyCompletenessInput } from '@/lib/onboarding/strategyCompleteness';
import { ISO_CLASSIC_PROCESSES } from '@/types/isoClassicProcesses';
import { PLAN_COLLECTIONS } from '@/types/planificacion';
import type {
  ProcessDefinitionFormData,
  ProcessSIPOC,
} from '@/types/processes-unified';
import { NormPointRelationServiceAdmin } from '@/services/normPoints/NormPointRelationServiceAdmin';
import { NormPointSeedService } from '@/services/onboarding/NormPointSeedService';
import { NormPointServiceAdmin } from '@/services/normPoints/NormPointServiceAdmin';
import { ProcessDefinitionServiceAdmin } from '@/services/processRecords/ProcessDefinitionServiceAdmin';

interface GenerateDraftsInput {
  organizationId: string;
  systemId: string;
  userId: string;
  userEmail?: string;
  strategy: StrategyCompletenessInput;
  forceRegenerate?: boolean;
}

interface DraftGenerationSummary {
  created: string[];
  skipped: string[];
  errors: string[];
}

interface DraftGenerationResult {
  summary: DraftGenerationSummary;
  generatedAt: string;
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

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function selectBaseProcessKeys(strategy: StrategyCompletenessInput): string[] {
  const selected = new Set<string>([
    'revision_direccion',
    'gestion_riesgos',
    'gestion_documental',
    'infraestructura',
    'auditorias',
    'mejoras',
    'partes_interesadas',
  ]);

  const alcanceText = [
    normalizeText(
      strategy.alcance &&
        (strategy.alcance as Record<string, unknown>).alcance_sgc
    ),
    normalizeText(
      strategy.alcance &&
        (strategy.alcance as Record<string, unknown>).productos_servicios
    ),
  ]
    .join(' ')
    .toLowerCase();

  const looksManufacturing = /(fabric|producci|planta|manufact|elaboraci)/.test(
    alcanceText
  );
  const looksService = /(servicio|consult|mantenimiento|atenci)/.test(
    alcanceText
  );

  selected.add(looksManufacturing ? 'produccion' : 'comercializacion');
  if (looksManufacturing || looksService) selected.add('compras');

  if (/(diseño|diseno|desarrollo|ingenier)/.test(alcanceText)) {
    selected.add('diseno_desarrollo');
  }

  selected.add('recursos_humanos');

  return [...selected];
}

function buildObjectiveSuffix(strategy: StrategyCompletenessInput): string {
  const identidad = (strategy.identidad || {}) as Record<string, unknown>;
  const alcance = (strategy.alcance || {}) as Record<string, unknown>;
  const mission = normalizeText(identidad.mision || identidad.MISION);
  const vision = normalizeText(identidad.vision || identidad.VISION);
  const scope = normalizeText(alcance.alcance_sgc || alcance.DESCRIPCION);

  const pieces = [mission, vision, scope].filter(Boolean);
  if (pieces.length === 0) return '';
  return ` Adaptado al contexto estratégico: ${pieces.slice(0, 2).join(' | ')}${
    scope ? ` | Alcance: ${scope.slice(0, 120)}` : ''
  }`;
}

async function loadExistingProcessesByName(
  organizationId: string
): Promise<
  Map<
    string,
    {
      id: string;
      nombre: string;
      status: string;
      activo: boolean;
      vigente: boolean;
    }
  >
> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('processDefinitions')
    .where('organization_id', '==', organizationId)
    .get();

  return new Map(
    snapshot.docs
      .map(doc => {
        const data = doc.data() as Record<string, unknown>;
        const nombre = normalizeText(data.nombre);
        if (!nombre) return null;
        return [
          nombre.toLowerCase(),
          {
            id: doc.id,
            nombre,
            status: normalizeText(data.status),
            activo: data.activo !== false,
            vigente: data.vigente !== false,
          },
        ] as const;
      })
      .filter(
        (
          item
        ): item is readonly [
          string,
          {
            id: string;
            nombre: string;
            status: string;
            activo: boolean;
            vigente: boolean;
          },
        ] => Boolean(item)
      )
  );
}

async function ensureDraftQualityPolicy(input: {
  organizationId: string;
  userEmail: string;
  strategy: StrategyCompletenessInput;
  forceRegenerate?: boolean;
}): Promise<{ created?: string; skipped?: string; error?: string }> {
  try {
    const db = getAdminFirestore();
    const collection = db.collection(PLAN_COLLECTIONS.politicas);
    const snapshot = await collection
      .where('organization_id', '==', input.organizationId)
      .get();

    const docs: Array<{ id: string } & Record<string, unknown>> =
      snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>),
      }));

    const existingUsable = docs.find(doc => {
      const estado = normalizeText(doc.estado);
      return (
        estado !== 'historico' && normalizeText(doc.politica_calidad).length > 0
      );
    });

    if (existingUsable && !input.forceRegenerate) {
      return { skipped: 'modelo:politica_calidad (ya existe)' };
    }

    const identidad = (input.strategy.identidad || {}) as Record<
      string,
      unknown
    >;
    const alcance = (input.strategy.alcance || {}) as Record<string, unknown>;
    const mision =
      normalizeText(identidad.mision || identidad.MISION) ||
      'Cumplir los requisitos aplicables';
    const vision =
      normalizeText(identidad.vision || identidad.VISION) ||
      'Mejorar continuamente el SGC';
    const alcanceSgc =
      normalizeText(alcance.alcance_sgc || alcance.DESCRIPCION) ||
      'el alcance del SGC definido por la organización';

    const politica = [
      'La organización se compromete a:',
      `- Cumplir requisitos del cliente, legales y reglamentarios aplicables a ${alcanceSgc}.`,
      '- Mejorar continuamente la eficacia del Sistema de Gestión de la Calidad.',
      `- Alinear las decisiones de calidad con la misión: ${mision}.`,
      `- Impulsar la visión organizacional: ${vision}.`,
      '- Desarrollar competencias, gestionar riesgos y asegurar la disponibilidad de recursos.',
    ].join('\n');

    const now = new Date().toISOString();
    const payload = {
      organization_id: input.organizationId,
      estado: 'borrador',
      version_numero: 1,
      created_at: now,
      updated_at: now,
      created_by: input.userEmail || 'system',
      updated_by: input.userEmail || 'system',
      politica_calidad: politica,
      otras_politicas: '',
    };

    if (existingUsable && input.forceRegenerate) {
      const estado = normalizeText(existingUsable.estado);
      if (estado && estado !== 'borrador') {
        return { skipped: `modelo:politica_calidad (existe ${estado})` };
      }
      await collection.doc(existingUsable.id).set(payload, { merge: true });
      return { created: 'modelo:politica_calidad (actualizada)' };
    }

    await collection.add(payload);
    return { created: 'modelo:politica_calidad' };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `modelo:politica_calidad (${error.message})`
          : 'modelo:politica_calidad (error desconocido)',
    };
  }
}

export class StrategyDrivenDraftGenerationService {
  static async generateDraftsFromStrategy(
    input: GenerateDraftsInput
  ): Promise<DraftGenerationResult> {
    const summary: DraftGenerationSummary = {
      created: [],
      skipped: [],
      errors: [],
    };

    if (input.systemId !== 'iso9001') {
      return {
        summary: {
          created: [],
          skipped: [],
          errors: [`Sistema no soportado para MVP: ${input.systemId}`],
        },
        generatedAt: new Date().toISOString(),
      };
    }

    const selectedKeys = selectBaseProcessKeys(input.strategy);
    const selectedProcesses = ISO_CLASSIC_PROCESSES.filter(p =>
      selectedKeys.includes(p.key)
    );
    const objectiveSuffix = buildObjectiveSuffix(input.strategy);

    const existingByName = await loadExistingProcessesByName(
      input.organizationId
    );
    const createdProcessLinks: Array<{
      processId: string;
      processName: string;
      clauses: string[];
    }> = [];
    const clausesToSeed: string[] = [];

    for (const process of selectedProcesses) {
      clausesToSeed.push(...process.isoClause);
      const existing = existingByName.get(process.name.toLowerCase());
      if (existing) {
        const isEditableDraft =
          existing.status === 'draft' ||
          existing.activo === false ||
          existing.vigente === false;

        if (!input.forceRegenerate) {
          summary.skipped.push(`proceso:${process.name}`);
          continue;
        }

        if (!isEditableDraft) {
          summary.skipped.push(
            `proceso:${process.name} (existente activo/vigente, sin sobreescribir)`
          );
          continue;
        }
      }

      try {
        const payload: ProcessDefinitionFormData = {
          organization_id: input.organizationId,
          category_id: mapIsoCategory(process.categoryId),
          process_code: `ISO-${process.key.toUpperCase()}-DRAFT`,
          nombre: process.name,
          descripcion: process.description,
          objetivo: `${process.template.objective}${objectiveSuffix}`.trim(),
          alcance: process.template.scope,
          funciones_involucradas: process.template.involvedRoles,
          sipoc: buildSipoc(process.template),
          status: 'draft',
          // draft oculto del flujo "activo" actual hasta revisión humana
          activo: false,
        };

        let processId: string;
        if (existing && input.forceRegenerate) {
          await ProcessDefinitionServiceAdmin.update(existing.id, payload);
          processId = existing.id;
          summary.created.push(`proceso:${process.name} (actualizado)`);
        } else {
          processId = await ProcessDefinitionServiceAdmin.create(payload);
          summary.created.push(`proceso:${process.name}`);
        }
        createdProcessLinks.push({
          processId,
          processName: process.name,
          clauses: process.isoClause,
        });
      } catch (error) {
        summary.errors.push(
          `proceso:${process.name} (${
            error instanceof Error ? error.message : 'error desconocido'
          })`
        );
      }
    }

    try {
      if (clausesToSeed.length > 0) {
        const normSeed = await NormPointSeedService.seedFromClauses({
          organizationId: input.organizationId,
          clauses: clausesToSeed,
          createdBy: input.userId,
        });
        if (normSeed.created > 0) {
          summary.created.push(`norma:puntos (${normSeed.created})`);
        }
        if (normSeed.skipped > 0) {
          summary.skipped.push(`norma:puntos (${normSeed.skipped})`);
        }

        const uniqueClauseCodes = [
          ...new Set(clausesToSeed.map(code => code.trim())),
        ].filter(Boolean);
        const normPoints =
          await NormPointServiceAdmin.getByOrganizationAndCodes(
            input.organizationId,
            uniqueClauseCodes,
            'iso_9001'
          );
        const normPointIdByCode = new Map(
          normPoints.map(point => [point.code.trim(), point.id])
        );

        for (const link of createdProcessLinks) {
          const linkedNormPointIds = [
            ...new Set(link.clauses.map(code => code.trim())),
          ]
            .map(code => normPointIdByCode.get(code))
            .filter((id): id is string => Boolean(id));

          if (linkedNormPointIds.length === 0) continue;

          try {
            const relationResult =
              await NormPointRelationServiceAdmin.linkProcessToNormPoints({
                organizationId: input.organizationId,
                processId: link.processId,
                normPointIds: linkedNormPointIds,
                userId: input.userId,
              });

            if (relationResult.createdRelations > 0) {
              summary.created.push(
                `relaciones:${link.processName} (${relationResult.createdRelations})`
              );
            }
          } catch (error) {
            summary.errors.push(
              `relaciones:${link.processName} (${
                error instanceof Error ? error.message : 'error desconocido'
              })`
            );
          }
        }
      }
    } catch (error) {
      summary.errors.push(
        `norma:seed (${error instanceof Error ? error.message : 'error desconocido'})`
      );
    }

    const policyResult = await ensureDraftQualityPolicy({
      organizationId: input.organizationId,
      userEmail: input.userEmail || 'system',
      strategy: input.strategy,
      forceRegenerate: input.forceRegenerate,
    });
    if (policyResult.created) summary.created.push(policyResult.created);
    if (policyResult.skipped) summary.skipped.push(policyResult.skipped);
    if (policyResult.error) summary.errors.push(policyResult.error);

    return {
      summary,
      generatedAt: new Date().toISOString(),
    };
  }
}
