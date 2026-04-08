import type {
  PlanAlcance,
  PlanContexto,
  PlanEstructura,
  PlanIdentidad,
  PlanPoliticas,
} from '@/types/planificacion';

export type StrategySectionKey =
  | 'identidad'
  | 'alcance'
  | 'contexto'
  | 'estructura'
  | 'politicas';

export type StrategyChecklistStatus = 'pending' | 'in_progress' | 'complete';

type UnknownRecord = Record<string, unknown>;

type StrategySectionInput<T> = (Partial<T> & UnknownRecord) | null | undefined;

export interface StrategyCompletenessInput {
  identidad?: StrategySectionInput<PlanIdentidad>;
  alcance?: StrategySectionInput<PlanAlcance>;
  contexto?: StrategySectionInput<PlanContexto>;
  estructura?: StrategySectionInput<PlanEstructura>;
  politicas?: StrategySectionInput<PlanPoliticas>;
}

export interface StrategyChecklistCheck {
  code: string;
  label: string;
  required: true;
  complete: boolean;
}

export interface StrategyChecklistItem {
  key: StrategySectionKey;
  label: string;
  status: StrategyChecklistStatus;
  percent: number;
  completed: number;
  total: number;
  checks: StrategyChecklistCheck[];
  missingRequired: string[];
}

export interface StrategyMissingRequired {
  section: StrategySectionKey;
  code: string;
  label: string;
}

export interface StrategyChecklistResult {
  percent: number;
  items: StrategyChecklistItem[];
  missingRequired: StrategyMissingRequired[];
  canGenerateDrafts: boolean;
}

interface CheckDefinition {
  code: string;
  label: string;
  passes: (record: UnknownRecord | null) => boolean;
}

const SECTION_LABELS: Record<StrategySectionKey, string> = {
  identidad: 'Identidad',
  alcance: 'Alcance',
  contexto: 'Contexto',
  estructura: 'Estructura',
  politicas: 'Politicas',
};

export const STRATEGY_MVP_SECTIONS: StrategySectionKey[] = [
  'identidad',
  'alcance',
  'contexto',
  'estructura',
  'politicas',
];

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hasText(value: unknown): boolean {
  return normalizeText(value).length > 0;
}

function getValue(record: UnknownRecord | null, keys: string[]): unknown {
  if (!record) return undefined;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }

  return undefined;
}

function hasTextAt(record: UnknownRecord | null, keys: string[]): boolean {
  return hasText(getValue(record, keys));
}

function countListEntries(value: unknown): number {
  if (Array.isArray(value)) {
    return value.filter(item => {
      if (typeof item === 'string') return item.trim().length > 0;
      return item !== null && item !== undefined;
    }).length;
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,;]+/)
      .map(item => item.trim())
      .filter(Boolean).length;
  }

  return 0;
}

function hasListAtLeastOne(
  record: UnknownRecord | null,
  keys: string[]
): boolean {
  return countListEntries(getValue(record, keys)) > 0;
}

function isExplicitlyNotApplicable(
  record: UnknownRecord | null,
  keys: string[]
): boolean {
  const value = getValue(record, keys);
  return value === true || normalizeText(value) === 'true';
}

function hasStructureEvidence(record: UnknownRecord | null): boolean {
  if (!record) return false;

  const organigrama =
    hasTextAt(record, ['organigrama_upload_url']) ||
    hasTextAt(record, ['organigrama_ia_url']) ||
    hasTextAt(record, ['organigrama_image_url']) ||
    hasTextAt(record, ['organigrama_url']) ||
    hasTextAt(record, ['organigrama']) ||
    hasTextAt(record, ['roles_responsabilidades']) ||
    hasTextAt(record, ['rolesYResponsabilidades']);

  const procesos = hasListAtLeastOne(record, [
    'procesos_relacionados',
    'procesos',
  ]);
  const descripcion =
    hasTextAt(record, ['descripcion_breve']) ||
    hasTextAt(record, ['descripcion']) ||
    hasTextAt(record, ['observaciones']);

  return organigrama || procesos || descripcion;
}

function isPolicyUsable(record: UnknownRecord | null): boolean {
  if (!record) return false;

  const estado = normalizeText(getValue(record, ['estado']));
  if (estado === 'historico') return false;

  return hasTextAt(record, ['politica_calidad', 'politicaCalidad']);
}

function buildCheckDefinitions(): Record<
  StrategySectionKey,
  CheckDefinition[]
> {
  return {
    identidad: [
      {
        code: 'identidad.mision',
        label: 'Mision',
        passes: record => hasTextAt(record, ['mision', 'MISION']),
      },
      {
        code: 'identidad.vision',
        label: 'Vision',
        passes: record => hasTextAt(record, ['vision', 'VISION']),
      },
      {
        code: 'identidad.valores',
        label: 'Valores',
        passes: record => hasTextAt(record, ['valores', 'VALORES']),
      },
      {
        code: 'identidad.objetivos_estrategicos',
        label: 'Objetivos estrategicos',
        passes: record =>
          hasTextAt(record, [
            'objetivos_estrategicos',
            'objetivosEstrategicos',
            'OBJETIVOS_ESTRATEGICOS',
          ]),
      },
    ],
    alcance: [
      {
        code: 'alcance.alcance_sgc',
        label: 'Descripcion y limites del alcance',
        passes: record =>
          hasTextAt(record, [
            'alcance_sgc',
            'descripcion',
            'DESCRIPCION',
            'limites',
            'LIMITES',
          ]),
      },
      {
        code: 'alcance.productos_servicios',
        label: 'Al menos 1 producto o servicio',
        passes: record =>
          hasListAtLeastOne(record, [
            'productos_servicios',
            'productosServicios',
            'productos',
          ]),
      },
      {
        code: 'alcance.ubicaciones',
        label: 'Al menos 1 ubicacion (o no aplica)',
        passes: record =>
          hasListAtLeastOne(record, ['ubicaciones']) ||
          isExplicitlyNotApplicable(record, [
            'ubicaciones_no_aplica',
            'ubicacionesNoAplica',
          ]),
      },
    ],
    contexto: [
      {
        code: 'contexto.contexto_externo',
        label: 'Contexto externo',
        passes: record =>
          hasTextAt(record, ['contexto_externo', 'cuestiones_externas']),
      },
      {
        code: 'contexto.contexto_interno',
        label: 'Contexto interno',
        passes: record =>
          hasTextAt(record, ['contexto_interno', 'cuestiones_internas']),
      },
      {
        code: 'contexto.partes_interesadas',
        label: 'Partes interesadas',
        passes: record =>
          hasTextAt(record, ['partes_interesadas', 'partesInteresadas']) ||
          hasListAtLeastOne(record, [
            'partes_interesadas_lista',
            'stakeholders',
          ]),
      },
    ],
    estructura: [
      {
        code: 'estructura.base',
        label: 'Roles/responsabilidades u organigrama',
        passes: record => hasStructureEvidence(record),
      },
    ],
    politicas: [
      {
        code: 'politicas.politica_calidad',
        label: 'Politica de calidad (borrador o vigente)',
        passes: record => isPolicyUsable(record),
      },
    ],
  };
}

function toStatus(completed: number, total: number): StrategyChecklistStatus {
  if (total <= 0 || completed <= 0) return 'pending';
  if (completed >= total) return 'complete';
  return 'in_progress';
}

function evaluateSection(
  key: StrategySectionKey,
  record: UnknownRecord | null,
  checks: CheckDefinition[]
): StrategyChecklistItem {
  const resolvedChecks: StrategyChecklistCheck[] = checks.map(check => ({
    code: check.code,
    label: check.label,
    required: true,
    complete: check.passes(record),
  }));

  const total = resolvedChecks.length;
  const completed = resolvedChecks.filter(check => check.complete).length;
  const missingRequired = resolvedChecks
    .filter(check => !check.complete)
    .map(check => check.code);

  return {
    key,
    label: SECTION_LABELS[key],
    status: toStatus(completed, total),
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    completed,
    total,
    checks: resolvedChecks,
    missingRequired,
  };
}

export function evaluateStrategyCompleteness(
  input: StrategyCompletenessInput
): StrategyChecklistResult {
  const checksBySection = buildCheckDefinitions();

  const records: Record<StrategySectionKey, UnknownRecord | null> = {
    identidad: asRecord(input.identidad),
    alcance: asRecord(input.alcance),
    contexto: asRecord(input.contexto),
    estructura: asRecord(input.estructura),
    politicas: asRecord(input.politicas),
  };

  const items = STRATEGY_MVP_SECTIONS.map(section =>
    evaluateSection(section, records[section], checksBySection[section])
  );

  const totalChecks = items.reduce((sum, item) => sum + item.total, 0);
  const totalCompleted = items.reduce((sum, item) => sum + item.completed, 0);

  const missingRequired: StrategyMissingRequired[] = items.flatMap(item =>
    item.checks
      .filter(check => !check.complete)
      .map(check => ({
        section: item.key,
        code: check.code,
        label: check.label,
      }))
  );

  return {
    percent:
      totalChecks > 0 ? Math.round((totalCompleted / totalChecks) * 100) : 0,
    items,
    missingRequired,
    canGenerateDrafts: missingRequired.length === 0,
  };
}
