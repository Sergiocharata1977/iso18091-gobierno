import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  GOV_MATURITY_COLLECTION_NAME,
  buildGovMaturitySnapshot,
  serializeAssessment,
  serializeTimestamp,
} from '@/lib/gov/madurez';
import type {
  GovMonitorComplianceMetric,
  GovMonitorData,
  GovMonitorGap,
  GovMonitorMobileData,
  GovMonitorRoadmapAction,
  GovMonitorStatus,
  GovPanelData,
} from '@/types/gov-monitor';
import type { GovCiudadano } from '@/types/gov-ciudadano';
import type { GovExpediente } from '@/types/gov-expediente';
import type { GovServicio } from '@/types/gov-servicio';

type FirestoreDoc = FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>;

const COLLECTIONS = {
  services: 'service_catalog',
  expedientes: 'expedientes',
  citizens: 'citizens',
  maturity: GOV_MATURITY_COLLECTION_NAME,
} as const;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveStatus(score: number): GovMonitorStatus {
  if (score < 40) return 'critico';
  if (score < 60) return 'en_riesgo';
  if (score < 80) return 'estable';
  return 'solido';
}

function summarizeStatus(status: GovMonitorStatus) {
  switch (status) {
    case 'critico':
      return 'critico';
    case 'en_riesgo':
      return 'frente en riesgo';
    case 'estable':
      return 'base estable';
    default:
      return 'desempeno solido';
  }
}

function serializeServicio(doc: FirestoreDoc): GovServicio {
  const data = doc.data() as Record<string, unknown>;
  return {
    id: doc.id,
    organization_id: String(data.organization_id || ''),
    nombre: String(data.nombre || ''),
    descripcion: String(data.descripcion || ''),
    area: String(data.area || ''),
    sla_dias: Number(data.sla_dias || 0),
    requisitos: Array.isArray(data.requisitos)
      ? data.requisitos.filter((item): item is string => typeof item === 'string')
      : [],
    categoria: (data.categoria || 'otro') as GovServicio['categoria'],
    estado: (data.estado || 'borrador') as GovServicio['estado'],
    publico: Boolean(data.publico),
    created_at: serializeTimestamp(data.created_at),
    updated_at: serializeTimestamp(data.updated_at),
  };
}

function serializeExpediente(doc: FirestoreDoc): GovExpediente {
  const data = doc.data() as Record<string, unknown>;
  return {
    id: doc.id,
    organization_id: String(data.organization_id || ''),
    numero: String(data.numero || ''),
    tipo: (data.tipo || 'otro') as GovExpediente['tipo'],
    asunto: String(data.asunto || ''),
    descripcion: String(data.descripcion || ''),
    ciudadano_id:
      typeof data.ciudadano_id === 'string' ? data.ciudadano_id : undefined,
    estado: (data.estado || 'ingresado') as GovExpediente['estado'],
    prioridad: (data.prioridad || 'media') as GovExpediente['prioridad'],
    area_responsable:
      typeof data.area_responsable === 'string' ? data.area_responsable : undefined,
    fecha_vencimiento_sla:
      typeof data.fecha_vencimiento_sla === 'string'
        ? data.fecha_vencimiento_sla
        : undefined,
    created_at: serializeTimestamp(data.created_at),
    updated_at: serializeTimestamp(data.updated_at),
  };
}

function serializeCiudadano(doc: FirestoreDoc): GovCiudadano {
  const data = doc.data() as Record<string, unknown>;
  return {
    id: doc.id,
    organization_id: String(data.organization_id || ''),
    nombre: String(data.nombre || ''),
    apellido: String(data.apellido || ''),
    dni: String(data.dni || ''),
    email: typeof data.email === 'string' ? data.email : undefined,
    telefono: typeof data.telefono === 'string' ? data.telefono : undefined,
    domicilio: typeof data.domicilio === 'string' ? data.domicilio : undefined,
    estado: (data.estado || 'activo') as GovCiudadano['estado'],
    created_at: serializeTimestamp(data.created_at),
    updated_at: serializeTimestamp(data.updated_at),
  };
}

async function loadMonitorSources(organizationId: string) {
  const db = getAdminFirestore();
  const orgRef = db.collection('organizations').doc(organizationId);

  const [servicesSnap, expedientesSnap, citizensSnap, maturitySnap] =
    await Promise.all([
      orgRef.collection(COLLECTIONS.services).get(),
      orgRef.collection(COLLECTIONS.expedientes).get(),
      orgRef.collection(COLLECTIONS.citizens).get(),
      orgRef
        .collection(COLLECTIONS.maturity)
        .orderBy('created_at', 'desc')
        .limit(10)
        .get(),
    ]);

  return {
    servicios: servicesSnap.docs.map(serializeServicio),
    expedientes: expedientesSnap.docs.map(serializeExpediente),
    ciudadanos: citizensSnap.docs.map(serializeCiudadano),
    assessments: maturitySnap.docs.map(doc =>
      serializeAssessment(doc.id, doc.data() as Record<string, unknown>)
    ),
  };
}

function buildCumplimientoMetrics(input: {
  servicios: GovServicio[];
  expedientes: GovExpediente[];
  ciudadanos: GovCiudadano[];
  evidenceCount: number;
}): GovMonitorComplianceMetric[] {
  const serviciosTotales = input.servicios.length;
  const serviciosActivos = input.servicios.filter(
    item => item.estado === 'activo'
  ).length;
  const serviciosPublicos = input.servicios.filter(item => item.publico).length;
  const serviciosConRequisitos = input.servicios.filter(
    item => item.requisitos.length > 0
  ).length;
  const servicioScore =
    serviciosTotales === 0
      ? 0
      : clampScore(
          (serviciosActivos / serviciosTotales) * 50 +
            (serviciosPublicos / serviciosTotales) * 25 +
            (serviciosConRequisitos / serviciosTotales) * 25
        );

  const expedientesTotales = input.expedientes.length;
  const expedientesResueltos = input.expedientes.filter(item =>
    ['resuelto', 'cerrado', 'archivado'].includes(item.estado)
  ).length;
  const expedientesConArea = input.expedientes.filter(
    item => Boolean(item.area_responsable)
  ).length;
  const expedientesConVinculo = input.expedientes.filter(
    item => Boolean(item.ciudadano_id)
  ).length;
  const expedienteScore =
    expedientesTotales === 0
      ? 0
      : clampScore(
          (expedientesResueltos / expedientesTotales) * 50 +
            (expedientesConArea / expedientesTotales) * 25 +
            (expedientesConVinculo / expedientesTotales) * 25
        );

  const ciudadanosTotales = input.ciudadanos.length;
  const ciudadanosActivos = input.ciudadanos.filter(
    item => item.estado === 'activo'
  ).length;
  const ciudadanosContactables = input.ciudadanos.filter(
    item => item.email || item.telefono
  ).length;
  const ciudadanosConDomicilio = input.ciudadanos.filter(
    item => Boolean(item.domicilio)
  ).length;
  const ciudadanoScore =
    ciudadanosTotales === 0
      ? 0
      : clampScore(
          (ciudadanosActivos / ciudadanosTotales) * 40 +
            (ciudadanosContactables / ciudadanosTotales) * 40 +
            (ciudadanosConDomicilio / ciudadanosTotales) * 20
        );

  const evidenceScore = clampScore(Math.min(input.evidenceCount, 5) * 20);

  return [
    {
      id: 'servicios',
      label: 'Servicios municipales operativos',
      score_pct: servicioScore,
      status: deriveStatus(servicioScore),
      detail: `${serviciosActivos}/${serviciosTotales} activos, ${serviciosPublicos} publicos y ${serviciosConRequisitos} con requisitos definidos.`,
    },
    {
      id: 'expedientes',
      label: 'Gestion de expedientes',
      score_pct: expedienteScore,
      status: deriveStatus(expedienteScore),
      detail: `${expedientesResueltos}/${expedientesTotales} resueltos o cerrados, ${expedientesConArea} con area responsable y ${expedientesConVinculo} vinculados a ciudadanos.`,
    },
    {
      id: 'ciudadanos',
      label: 'Base ciudadana utilizable',
      score_pct: ciudadanoScore,
      status: deriveStatus(ciudadanoScore),
      detail: `${ciudadanosActivos}/${ciudadanosTotales} activos, ${ciudadanosContactables} contactables y ${ciudadanosConDomicilio} con domicilio.`,
    },
    {
      id: 'evidencia',
      label: 'Evidencia institucional reciente',
      score_pct: evidenceScore,
      status: deriveStatus(evidenceScore),
      detail: `${input.evidenceCount} dimensiones 18091 con evidencia documentada en la ultima evaluacion.`,
    },
  ];
}

function buildGaps(input: {
  metrics: GovMonitorComplianceMetric[];
  maturityScorePct: number;
  maturityTrend: 'mejorando' | 'estable' | 'empeorando';
  maturityDimensions: Awaited<
    ReturnType<typeof buildGovMaturitySnapshot>
  >['dimensions'];
  strategicSummary: Awaited<
    ReturnType<typeof buildGovMaturitySnapshot>
  >['strategic_summary'];
  servicios: GovServicio[];
  expedientes: GovExpediente[];
  ciudadanos: GovCiudadano[];
  assessmentsCount: number;
}): GovMonitorGap[] {
  const gaps: GovMonitorGap[] = [];
  const openExpedientes = input.expedientes.filter(
    item => !['resuelto', 'cerrado', 'archivado'].includes(item.estado)
  ).length;
  const urgentOpen = input.expedientes.filter(
    item =>
      !['resuelto', 'cerrado', 'archivado'].includes(item.estado) &&
      (item.prioridad === 'alta' || item.prioridad === 'urgente')
  ).length;
  const serviciosBorrador = input.servicios.filter(
    item => item.estado === 'borrador'
  ).length;
  const ciudadanosSinContacto = input.ciudadanos.filter(
    item => !item.email && !item.telefono
  ).length;

  for (const metric of input.metrics) {
    if (metric.score_pct >= 60) {
      continue;
    }

    gaps.push({
      id: `gap-${metric.id}`,
      title: metric.label,
      priority: metric.score_pct < 40 ? 'alta' : 'media',
      status: metric.status,
      area:
        metric.id === 'evidencia' || metric.id === 'ciudadanos'
          ? 'datos'
          : 'cumplimiento',
      reason: metric.detail,
      evidence: [metric.detail],
      suggested_action:
        metric.id === 'servicios'
          ? 'Activar servicios en borrador y completar requisitos para publicacion.'
          : metric.id === 'expedientes'
            ? 'Asignar responsables y cerrar backlog priorizando casos urgentes.'
            : metric.id === 'ciudadanos'
              ? 'Completar canales de contacto y depurar registros inactivos.'
              : 'Registrar evidencia concreta por dimension 18091 en la proxima evaluacion.',
    });
  }

  if (input.assessmentsCount === 0) {
    gaps.push({
      id: 'gap-madurez-sin-linea-base',
      title: 'Sin linea base de madurez 18091',
      priority: 'alta',
      status: 'critico',
      area: 'madurez',
      reason: 'No existe una evaluacion formal de madurez para el municipio.',
      evidence: ['0 evaluaciones registradas'],
      suggested_action: 'Cargar la primera evaluacion 18091 con evidencias por dimension.',
    });
  } else if (input.maturityScorePct < 60 || input.maturityTrend === 'empeorando') {
    const weakestDimension = [...input.maturityDimensions].sort(
      (a, b) => a.score_pct - b.score_pct
    )[0];
    gaps.push({
      id: 'gap-madurez',
      title: 'Madurez institucional por debajo del objetivo',
      priority: input.maturityScorePct < 40 ? 'alta' : 'media',
      status: deriveStatus(input.maturityScorePct),
      area: 'madurez',
      reason:
        weakestDimension
          ? `La dimension ${weakestDimension.dimension} es la mas debil con ${weakestDimension.score_pct}% y tendencia ${input.maturityTrend}.`
          : `El score actual es ${input.maturityScorePct}% con tendencia ${input.maturityTrend}.`,
      evidence: weakestDimension
        ? [
            `Dimension ${weakestDimension.dimension}: ${weakestDimension.score_pct}%`,
            `Tendencia: ${input.maturityTrend}`,
          ]
        : [`Score madurez: ${input.maturityScorePct}%`],
      suggested_action:
        'Ejecutar acciones tacticas sobre la dimension mas debil y cerrar oportunidades de mejora abiertas.',
    });
  }

  for (const alert of input.strategicSummary?.executive_alerts ?? []) {
    gaps.push({
      id: `gap-alert-${alert.id}`,
      title: alert.title,
      priority: alert.severity === 'critica' ? 'alta' : 'media',
      status: alert.severity === 'critica' ? 'critico' : 'en_riesgo',
      area: 'riesgos',
      reason: alert.recommended_action,
      evidence: [`Alerta ejecutiva ${alert.severity}`],
      suggested_action: alert.recommended_action,
    });
  }

  if (urgentOpen > 0) {
    gaps.push({
      id: 'gap-expedientes-urgentes',
      title: 'Backlog urgente de expedientes',
      priority: 'alta',
      status: urgentOpen > 5 ? 'critico' : 'en_riesgo',
      area: 'cumplimiento',
      reason: `Hay ${urgentOpen} expedientes abiertos con prioridad alta o urgente sobre ${openExpedientes} abiertos.`,
      evidence: [
        `${urgentOpen} expedientes urgentes abiertos`,
        `${openExpedientes} expedientes abiertos totales`,
      ],
      suggested_action: 'Crear mesa de seguimiento semanal y SLA interno para expedientes urgentes.',
    });
  }

  if (serviciosBorrador > 0 && input.servicios.length > 0) {
    gaps.push({
      id: 'gap-servicios-borrador',
      title: 'Catalogo de servicios sin publicar',
      priority: serviciosBorrador > 3 ? 'media' : 'baja',
      status: serviciosBorrador > 5 ? 'en_riesgo' : 'estable',
      area: 'cumplimiento',
      reason: `${serviciosBorrador} servicios siguen en borrador y limitan la cobertura operativa.`,
      evidence: [`${serviciosBorrador} servicios en borrador`],
      suggested_action: 'Completar definicion minima y publicar los servicios de mayor demanda.',
    });
  }

  if (ciudadanosSinContacto > 0 && input.ciudadanos.length > 0) {
    gaps.push({
      id: 'gap-ciudadanos-contacto',
      title: 'Registros ciudadanos sin canal de contacto',
      priority: ciudadanosSinContacto > 20 ? 'media' : 'baja',
      status: ciudadanosSinContacto > 50 ? 'en_riesgo' : 'estable',
      area: 'datos',
      reason: `${ciudadanosSinContacto} ciudadanos no tienen email ni telefono.`,
      evidence: [`${ciudadanosSinContacto} registros sin contacto`],
      suggested_action: 'Depurar padron y completar telefono o email en los tramites de alta.',
    });
  }

  return gaps
    .sort((a, b) => {
      const priorityRank = { alta: 0, media: 1, baja: 2 };
      return priorityRank[a.priority] - priorityRank[b.priority];
    })
    .slice(0, 8);
}

function buildRoadmap(gaps: GovMonitorGap[]): GovMonitorRoadmapAction[] {
  const highPriority = gaps.filter(gap => gap.priority === 'alta');
  const mediumPriority = gaps.filter(gap => gap.priority === 'media');
  const backlog = gaps.filter(gap => gap.priority === 'baja');
  const roadmap: GovMonitorRoadmapAction[] = [];

  if (highPriority.length > 0) {
    roadmap.push({
      id: 'roadmap-30-estabilizar',
      horizon: '30_dias',
      priority: 'alta',
      title: 'Estabilizar frentes criticos del monitor',
      objective: 'Cerrar alertas ejecutivas y ordenar el backlog operativo mas expuesto.',
      expected_impact: 'Reducir riesgo visible en cumplimiento y capacidad de respuesta municipal.',
      related_gap_ids: highPriority.slice(0, 3).map(gap => gap.id),
    });
  }

  roadmap.push({
    id: 'roadmap-60-gobernanza',
    horizon: '60_dias',
    priority: mediumPriority.length > 0 ? 'media' : 'baja',
    title: 'Consolidar gobernanza de datos y servicios',
    objective: 'Normalizar catalogo, responsables y datos ciudadanos usados por expedientes.',
    expected_impact: 'Mejorar trazabilidad y consistencia entre servicios, casos y atencion al ciudadano.',
    related_gap_ids: [...highPriority, ...mediumPriority].slice(0, 4).map(gap => gap.id),
  });

  roadmap.push({
    id: 'roadmap-90-madurez',
    horizon: '90_dias',
    priority:
      gaps.some(gap => gap.area === 'madurez') || highPriority.length > 0
        ? 'media'
        : 'baja',
    title: 'Cerrar ciclo 18091 con evidencia y mejora',
    objective: 'Reevaluar dimensiones 18091 con evidencia y seguimiento sobre oportunidades.',
    expected_impact: 'Subir el score de madurez y dejar una linea base sostenible para web y Android.',
    related_gap_ids: gaps
      .filter(gap => gap.area === 'madurez' || gap.area === 'datos')
      .slice(0, 4)
      .map(gap => gap.id),
  });

  if (roadmap.length < 3 && backlog.length > 0) {
    roadmap.push({
      id: 'roadmap-90-backlog',
      horizon: '90_dias',
      priority: 'baja',
      title: 'Depurar backlog residual',
      objective: 'Resolver brechas menores que siguen abiertas despues de estabilizar el monitor.',
      expected_impact: 'Evitar que las brechas de baja prioridad vuelvan a escalar.',
      related_gap_ids: backlog.slice(0, 3).map(gap => gap.id),
    });
  }

  return roadmap;
}

export async function assembleGovMonitor(
  organizationId: string
): Promise<GovMonitorData> {
  const sources = await loadMonitorSources(organizationId);
  const maturitySnapshot = await buildGovMaturitySnapshot({
    organizationId,
    assessments: sources.assessments,
  });
  const evidenceCount = maturitySnapshot.dimensions.filter(
    item => item.has_evidence
  ).length;
  const metrics = buildCumplimientoMetrics({
    servicios: sources.servicios,
    expedientes: sources.expedientes,
    ciudadanos: sources.ciudadanos,
    evidenceCount,
  });
  const cumplimientoScore = clampScore(
    metrics[0].score_pct * 0.35 +
      metrics[1].score_pct * 0.35 +
      metrics[2].score_pct * 0.2 +
      metrics[3].score_pct * 0.1
  );
  const cumplimientoStatus = deriveStatus(cumplimientoScore);
  const gaps = buildGaps({
    metrics,
    maturityScorePct: maturitySnapshot.current_score_pct,
    maturityTrend: maturitySnapshot.trend_direction,
    maturityDimensions: maturitySnapshot.dimensions,
    strategicSummary: maturitySnapshot.strategic_summary,
    servicios: sources.servicios,
    expedientes: sources.expedientes,
    ciudadanos: sources.ciudadanos,
    assessmentsCount: sources.assessments.length,
  });
  const roadmap = buildRoadmap(gaps);
  const madurezScore = maturitySnapshot.current_score_pct;
  const madurezStatus = deriveStatus(madurezScore);
  const sourceCounts = {
    servicios_total: sources.servicios.length,
    servicios_activos: sources.servicios.filter(item => item.estado === 'activo').length,
    servicios_publicos: sources.servicios.filter(item => item.publico).length,
    expedientes_total: sources.expedientes.length,
    expedientes_abiertos: sources.expedientes.filter(
      item => !['resuelto', 'cerrado', 'archivado'].includes(item.estado)
    ).length,
    expedientes_resueltos: sources.expedientes.filter(item =>
      ['resuelto', 'cerrado', 'archivado'].includes(item.estado)
    ).length,
    ciudadanos_total: sources.ciudadanos.length,
    ciudadanos_activos: sources.ciudadanos.filter(item => item.estado === 'activo')
      .length,
    evaluaciones_madurez: sources.assessments.length,
    evidencias_dimensiones: evidenceCount,
  };

  return {
    organization_id: organizationId,
    generated_at: new Date().toISOString(),
    cumplimiento: {
      score_pct: cumplimientoScore,
      status: cumplimientoStatus,
      metrics,
      summary: `Cobertura operativa municipal en ${cumplimientoScore}% con ${summarizeStatus(cumplimientoStatus)} sobre servicios, expedientes y base ciudadana.`,
      source_counts: sourceCounts,
    },
    madurez: {
      snapshot: maturitySnapshot,
      score_pct: madurezScore,
      status: madurezStatus,
      trend_direction: maturitySnapshot.trend_direction,
      dimensions: maturitySnapshot.dimensions.map(item => ({
        dimension: item.dimension,
        nivel: item.nivel,
        score_pct: item.score_pct,
        status: deriveStatus(item.score_pct),
        has_evidence: item.has_evidence,
      })),
      summary:
        sources.assessments.length === 0
          ? 'Todavia no existe una linea base de madurez 18091 para el municipio.'
          : `Madurez institucional en ${madurezScore}% con tendencia ${maturitySnapshot.trend_direction}.`,
    },
    gaps,
    roadmap,
  };
}

export function buildGovMonitorMobileData(
  monitor: GovMonitorData
): GovMonitorMobileData {
  return {
    organization_id: monitor.organization_id,
    generated_at: monitor.generated_at,
    cumplimiento: {
      score_pct: monitor.cumplimiento.score_pct,
      status: monitor.cumplimiento.status,
      summary: monitor.cumplimiento.summary,
    },
    madurez: {
      score_pct: monitor.madurez.score_pct,
      status: monitor.madurez.status,
      trend_direction: monitor.madurez.trend_direction,
      summary: monitor.madurez.summary,
    },
    priorities: monitor.gaps.slice(0, 3).map(gap => ({
      id: gap.id,
      title: gap.title,
      priority: gap.priority,
      status: gap.status,
    })),
    roadmap: monitor.roadmap.slice(0, 3).map(action => ({
      id: action.id,
      horizon: action.horizon,
      priority: action.priority,
      title: action.title,
    })),
    counters: monitor.cumplimiento.source_counts,
  };
}

export function buildGovPanelData(monitor: GovMonitorData): GovPanelData {
  return {
    expedientes_total: monitor.cumplimiento.source_counts.expedientes_total,
    ciudadanos_registrados: monitor.cumplimiento.source_counts.ciudadanos_total,
    expedientes_pendientes: monitor.cumplimiento.source_counts.expedientes_abiertos,
    nps_ciudadano: null,
    monitor: {
      cumplimiento_score_pct: monitor.cumplimiento.score_pct,
      madurez_score_pct: monitor.madurez.score_pct,
      gaps_altos: monitor.gaps.filter(gap => gap.priority === 'alta').length,
      roadmap_inmediato: monitor.roadmap.filter(
        action => action.horizon === '30_dias'
      ).length,
      status:
        monitor.cumplimiento.status === 'critico' || monitor.madurez.status === 'critico'
          ? 'critico'
          : monitor.cumplimiento.status === 'en_riesgo' ||
              monitor.madurez.status === 'en_riesgo'
            ? 'en_riesgo'
            : monitor.cumplimiento.status === 'estable' ||
                monitor.madurez.status === 'estable'
              ? 'estable'
              : 'solido',
    },
  };
}
