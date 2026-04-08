import type {
  DiagnosticoMadurez,
  DiagnosticoMadurezSerialized,
  MaturityDimensionDefinition,
  MaturityDimensionId,
  MaturityGlobalLevel,
  MaturityScore,
} from '@/types/gov/maturity';

export const MATURITY_DIMENSIONS = [
  {
    id: 'D1',
    nombre: 'Gestion de la Calidad del Servicio al Ciudadano',
    descripcion:
      'Capacidad para entregar servicios publicos con estandares medibles y mejorarlos continuamente.',
    nivel1: 'No existen estandares de servicio definidos.',
    nivel2: 'Existen estandares basicos pero no se miden.',
    nivel3: 'Se miden y se mejoran los servicios regularmente.',
    nivel4:
      'Sistema maduro de gestion con benchmarking y mejora continua.',
    recomendacion_base:
      'Definir y revisar acuerdos de nivel de servicio para los tramites y servicios mas criticos.',
  },
  {
    id: 'D2',
    nombre: 'Transparencia y Rendicion de Cuentas',
    descripcion:
      'Grado en que el municipio publica informacion, reporta resultados y asegura trazabilidad de decisiones.',
    nivel1: 'La informacion publica es limitada y reactiva.',
    nivel2:
      'Se publican datos basicos, pero sin periodicidad ni validacion consistente.',
    nivel3:
      'Existen reportes periodicos, indicadores visibles y seguimiento de compromisos.',
    nivel4:
      'La rendicion de cuentas es sistematica, auditada y apoyada en tableros abiertos.',
    recomendacion_base:
      'Institucionalizar reportes periodicos de gestion y seguimiento publico de compromisos municipales.',
  },
  {
    id: 'D3',
    nombre: 'Participacion Ciudadana y Partes Interesadas',
    descripcion:
      'Capacidad para escuchar, integrar y responder a la voz del ciudadano y otras partes interesadas.',
    nivel1: 'No existen mecanismos formales de consulta o participacion.',
    nivel2:
      'Hay canales de participacion aislados, sin analisis estructurado de resultados.',
    nivel3:
      'Se recopila retroalimentacion y se incorpora en decisiones y planes de accion.',
    nivel4:
      'La participacion ciudadana es continua, multicanal y co-crea mejoras de servicio.',
    recomendacion_base:
      'Crear una rutina de escucha ciudadana con analisis de reclamos, encuestas y mesas participativas.',
  },
  {
    id: 'D4',
    nombre: 'Gestion de Riesgos y Control Interno',
    descripcion:
      'Madurez del municipio para anticipar riesgos, definir controles y monitorear desvios operativos.',
    nivel1: 'Los riesgos se gestionan de forma reactiva e informal.',
    nivel2:
      'Se identifican riesgos relevantes, pero con controles incompletos o no documentados.',
    nivel3:
      'Existe una matriz de riesgos, responsables y seguimiento periodico de controles.',
    nivel4:
      'El control interno es preventivo, integrado a procesos y revisado con indicadores.',
    recomendacion_base:
      'Formalizar una matriz de riesgos y controles por proceso con responsables y frecuencia de revision.',
  },
  {
    id: 'D5',
    nombre: 'Mejora Continua y Cumplimiento Normativo',
    descripcion:
      'Capacidad institucional para sostener auditorias, acciones correctivas y cumplimiento legal aplicable.',
    nivel1:
      'No hay un enfoque sistematico de mejora ni seguimiento del cumplimiento.',
    nivel2:
      'Se atienden hallazgos puntuales, pero sin metodologia estandar ni cierre efectivo.',
    nivel3:
      'La organizacion gestiona acciones, auditorias y requisitos con revision periodica.',
    nivel4:
      'La mejora continua es parte de la cultura y el cumplimiento se monitorea proactivamente.',
    recomendacion_base:
      'Consolidar un ciclo de auditorias, acciones correctivas y seguimiento normativo con responsables claros.',
  },
] as const satisfies readonly MaturityDimensionDefinition[];

export function getMaturityDimensionById(id: MaturityDimensionId) {
  return MATURITY_DIMENSIONS.find(dimension => dimension.id === id);
}

export function getMaturityGlobalLevel(
  totalScore: number
): MaturityGlobalLevel {
  if (totalScore >= 18) {
    return 'Maduro';
  }

  if (totalScore >= 15) {
    return 'Consolidado';
  }

  if (totalScore >= 10) {
    return 'En desarrollo';
  }

  return 'Emergente';
}

export function buildMaturityImprovementPlan(
  scores: Record<MaturityDimensionId, MaturityScore>
) {
  return MATURITY_DIMENSIONS.filter(dimension => scores[dimension.id] <= 2).map(
    dimension => {
      const nivel = scores[dimension.id];
      return `${dimension.id} - ${dimension.nombre}: ${dimension.recomendacion_base} Estado actual nivel ${nivel}.`;
    }
  );
}

export function calculateMaturityTotals(
  scores: Record<MaturityDimensionId, MaturityScore>
) {
  const puntaje_total = Object.values(scores).reduce(
    (total, value) => total + value,
    0
  );
  const nivel_global = getMaturityGlobalLevel(puntaje_total);
  const plan_mejora = buildMaturityImprovementPlan(scores);

  return {
    puntaje_total,
    nivel_global,
    plan_mejora:
      plan_mejora.length > 0
        ? plan_mejora
        : ['Mantener el esquema actual y profundizar benchmarking entre servicios.'],
  };
}

export function serializeDiagnosticoMadurez(
  id: string,
  data: Omit<DiagnosticoMadurez, 'id'>
): DiagnosticoMadurezSerialized {
  return {
    id,
    ...data,
    created_at: data.created_at.toDate().toISOString(),
  };
}
