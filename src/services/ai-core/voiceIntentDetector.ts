import { buildVoiceSuggestions } from '@/lib/voice/miPanelVoicePlanner';

export type VoiceIntent =
  | { type: 'navigate'; route: string; label: string }
  | { type: 'query'; skill_id: string; params: Record<string, unknown> }
  | { type: 'fill_form'; form_id: string; fields: Record<string, unknown> }
  | { type: 'general' };

export interface VoiceIntentResult {
  intent: VoiceIntent;
  confidence: number;
  response_text: string;
}

type VoiceIntentContext = {
  orgId: string;
  userId: string;
  currentRoute: string;
  dashboardData?: Record<string, unknown>;
};

type NavigationRule = {
  route: string;
  label: string;
  phrases: string[];
};

type QueryRule = {
  skill_id: string;
  metric: string;
  patterns: RegExp[];
  buildResponse: (count: number | null) => string;
};

const NAVIGATION_RULES: NavigationRule[] = [
  {
    route: '/procesos',
    label: 'Procesos',
    phrases: [
      'ir a procesos',
      'abrir procesos',
      'mostrar procesos',
      'ver procesos',
    ],
  },
  {
    route: '/procesos/mediciones',
    label: 'Mediciones',
    phrases: [
      'ir a mediciones',
      'abrir mediciones',
      'ver mediciones',
      'mostrar mediciones',
      'abrir indicadores',
      'ver indicadores',
    ],
  },
  {
    route: '/acciones',
    label: 'Acciones',
    phrases: [
      'abrir acciones',
      'ver acciones abiertas',
      'mostrar acciones',
      'ir a mejoras',
      'mostrar hallazgos',
      'ver hallazgos',
    ],
  },
  {
    route: '/calendario',
    label: 'Calendario',
    phrases: [
      'abrir calendario',
      'ver calendario',
      'mostrar agenda',
      'ver eventos proximos',
      'ir a agenda',
    ],
  },
  {
    route: '/mi-panel?tab=trabajo',
    label: 'Mi trabajo',
    phrases: [
      'ir a trabajo',
      'ver trabajo',
      'abrir trabajo',
      'abrir trabajo pendiente',
      'mostrar registros vencidos',
    ],
  },
  {
    route: '/mi-panel?tab=resumen',
    label: 'Resumen',
    phrases: [
      'ir al resumen',
      'abrir resumen',
      'ver resumen',
      'mostrar pendientes criticos',
    ],
  },
  {
    route: '/mi-panel?tab=perfil',
    label: 'Perfil',
    phrases: ['ver perfil', 'abrir perfil', 'ir a perfil'],
  },
];

const QUERY_RULES: QueryRule[] = [
  {
    skill_id: 'dashboard_metric',
    metric: 'accionesAbiertas',
    patterns: [
      /\bcuant[oa]s?\b.*\bhallazgo(?:s)?\b.*\babiert[oa]s?\b/,
      /\bcuant[oa]s?\b.*\bacciones?\b.*\babiert[oa]s?\b/,
      /\bhallazgo(?:s)?\b.*\babiert[oa]s?\b/,
      /\bacciones?\b.*\babiert[oa]s?\b/,
    ],
    buildResponse: count =>
      count === null
        ? 'Puedo revisar las acciones u hallazgos abiertos si me compartes el contexto del panel.'
        : `Tienes ${count} accion${count === 1 ? '' : 'es'} abierta${count === 1 ? '' : 's'} para seguimiento.`,
  },
  {
    skill_id: 'dashboard_metric',
    metric: 'medicionesPendientes',
    patterns: [
      /\bcuant[oa]s?\b.*\bmedicion(?:es)?\b.*\bpendientes?\b/,
      /\bmedicion(?:es)?\b.*\bpendientes?\b/,
      /\bindicadores?\b.*\bpendientes?\b/,
    ],
    buildResponse: count =>
      count === null
        ? 'Puedo revisar las mediciones pendientes si me compartes el contexto del panel.'
        : `Hay ${count} medicion${count === 1 ? '' : 'es'} pendiente${count === 1 ? '' : 's'} para actualizar.`,
  },
  {
    skill_id: 'dashboard_metric',
    metric: 'registrosVencidos',
    patterns: [
      /\bcuant[oa]s?\b.*\bregistros?\b.*\bvencid[oa]s?\b/,
      /\bregistros?\b.*\bvencid[oa]s?\b/,
      /\btareas?\b.*\bvencid[oa]s?\b/,
    ],
    buildResponse: count =>
      count === null
        ? 'Puedo revisar los registros vencidos si me compartes el contexto del panel.'
        : `Tienes ${count} registro${count === 1 ? '' : 's'} vencido${count === 1 ? '' : 's'}.`,
  },
  {
    skill_id: 'dashboard_metric',
    metric: 'procesosAsignados',
    patterns: [
      /\bcuant[oa]s?\b.*\bprocesos?\b.*\basignad[oa]s?\b/,
      /\bprocesos?\b.*\basignad[oa]s?\b/,
    ],
    buildResponse: count =>
      count === null
        ? 'Puedo revisar los procesos asignados si me compartes el contexto del panel.'
        : `Tienes ${count} proceso${count === 1 ? '' : 's'} asignado${count === 1 ? '' : 's'}.`,
  },
  {
    skill_id: 'dashboard_metric',
    metric: 'eventosProximos',
    patterns: [
      /\bcuant[oa]s?\b.*\beventos?\b.*\bproxim[oa]s?\b/,
      /\beventos?\b.*\bproxim[oa]s?\b/,
      /\bagenda\b/,
    ],
    buildResponse: count =>
      count === null
        ? 'Puedo revisar la agenda o los eventos proximos si me compartes el contexto del panel.'
        : `Tienes ${count} evento${count === 1 ? '' : 's'} proximo${count === 1 ? '' : 's'} en agenda.`,
  },
];

function normalizeText(value: unknown): string {
  return typeof value === 'string'
    ? value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s/?=&-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

function toSafeCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.trunc(value));
}

function getDashboardMetric(
  dashboardData: Record<string, unknown> | undefined,
  metric: string
): number | null {
  if (!dashboardData) {
    return null;
  }

  if (metric === 'registrosVencidos') {
    const registros = toSafeCount(dashboardData.registrosVencidos);
    const tareas = toSafeCount(dashboardData.tareasVencidas);
    return Math.max(registros ?? 0, tareas ?? 0);
  }

  return toSafeCount(dashboardData[metric]);
}

function normalizeRoute(route: string): string {
  return route.trim().toLowerCase();
}

function buildNavigationRules(
  dashboardData?: Record<string, unknown>
): NavigationRule[] {
  const rules = [...NAVIGATION_RULES];

  if (!dashboardData || Object.keys(dashboardData).length === 0) {
    return rules;
  }

  const legacySuggestions = buildVoiceSuggestions(dashboardData, false);
  for (const suggestion of legacySuggestions) {
    if (!Array.isArray(suggestion.comandos) || suggestion.comandos.length === 0) {
      continue;
    }

    rules.push({
      route: suggestion.route,
      label: suggestion.titulo,
      phrases: suggestion.comandos,
    });
  }

  return rules;
}

function matchesPhrase(normalizedMessage: string, phrase: string): boolean {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) {
    return false;
  }

  return (
    normalizedMessage === normalizedPhrase ||
    normalizedMessage.includes(normalizedPhrase) ||
    normalizedPhrase.includes(normalizedMessage)
  );
}

function detectNavigation(
  normalizedMessage: string,
  currentRoute: string,
  dashboardData?: Record<string, unknown>
): VoiceIntentResult | null {
  const rules = buildNavigationRules(dashboardData);

  for (const rule of rules) {
    const matchedPhrase = rule.phrases.find(phrase =>
      matchesPhrase(normalizedMessage, phrase)
    );
    if (!matchedPhrase) {
      continue;
    }

    const sameRoute = normalizeRoute(currentRoute) === normalizeRoute(rule.route);
    return {
      intent: {
        type: 'navigate',
        route: rule.route,
        label: rule.label,
      },
      confidence: sameRoute ? 0.86 : 0.96,
      response_text: sameRoute
        ? `Ya estas en ${rule.label}.`
        : `Abriendo ${rule.label}.`,
    };
  }

  return null;
}

function detectQuery(
  normalizedMessage: string,
  dashboardData?: Record<string, unknown>
): VoiceIntentResult | null {
  for (const rule of QUERY_RULES) {
    if (!rule.patterns.some(pattern => pattern.test(normalizedMessage))) {
      continue;
    }

    const count = getDashboardMetric(dashboardData, rule.metric);
    return {
      intent: {
        type: 'query',
        skill_id: rule.skill_id,
        params: {
          metric: rule.metric,
          scope: 'self',
        },
      },
      confidence: count === null ? 0.82 : 0.9,
      response_text: rule.buildResponse(count),
    };
  }

  return null;
}

function detectFillForm(normalizedMessage: string): VoiceIntentResult | null {
  const fillPatterns = [
    /\bcompletar?\b.*\bformulario\b/,
    /\bllenar?\b.*\bformulario\b/,
    /\bcargar?\b.*\bformulario\b/,
    /\bregistrar?\b.*\bno conformidad\b/,
  ];

  if (!fillPatterns.some(pattern => pattern.test(normalizedMessage))) {
    return null;
  }

  return {
    intent: {
      type: 'fill_form',
      form_id: 'generic_voice_form',
      fields: {},
    },
    confidence: 0.81,
    response_text:
      'Puedo ayudarte con ese formulario. Voy a usar este contexto para completar la accion correcta.',
  };
}

export async function detectVoiceIntent(
  userMessage: string,
  context: VoiceIntentContext
): Promise<VoiceIntentResult> {
  const normalizedMessage = normalizeText(userMessage);

  if (!normalizedMessage) {
    return {
      intent: { type: 'general' },
      confidence: 0,
      response_text: 'No detecte un comando claro. Puedes repetirlo con mas detalle.',
    };
  }

  const navigation = detectNavigation(
    normalizedMessage,
    context.currentRoute,
    context.dashboardData
  );
  if (navigation) {
    return navigation;
  }

  const query = detectQuery(normalizedMessage, context.dashboardData);
  if (query) {
    return query;
  }

  const fillForm = detectFillForm(normalizedMessage);
  if (fillForm) {
    return fillForm;
  }

  return {
    intent: { type: 'general' },
    confidence: 0.3,
    response_text:
      'Lo tomo como una consulta general y se la paso a Don Candido para responder con mas contexto.',
  };
}
