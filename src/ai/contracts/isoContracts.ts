import type { AIContractDocumentation } from './types';

const sharedGapHallazgo = (suffix: string) => ({
  id: `H-${suffix}`,
  severidad: 'media' as const,
  clausula_iso: {
    codigo: '7.5',
    titulo: 'Información documentada',
    relevancia: 'Sostiene consistencia y evidencia del SGC.',
  },
  descripcion:
    'No existe control formal de versiones para instructivos operativos.',
  evidencia_observada:
    'Se observaron archivos con nombres duplicados sin fecha.',
  brecha:
    'Falta método definido para identificar y actualizar documentos vigentes.',
  riesgo_asociado:
    'Uso de documentos obsoletos y ejecución inconsistente del proceso.',
  accion_inmediata_sugerida:
    'Definir nomenclatura y responsable de aprobación.',
});

const sharedAction = (id: string, prioridad: 'alta' | 'media' | 'baja') => ({
  id,
  tipo_accion: 'correctiva' as const,
  prioridad,
  descripcion:
    'Estandarizar el flujo de aprobación y control documental del proceso.',
  justificacion:
    'Reduce errores por versiones desactualizadas y mejora trazabilidad.',
  impacto: 'alto' as const,
  esfuerzo: prioridad === 'alta' ? ('medio' as const) : ('bajo' as const),
  responsable_rol: 'Responsable de Calidad',
  plazo_dias: prioridad === 'alta' ? 30 : 60,
  dependencias: prioridad === 'alta' ? [] : ['AC-01'],
  criterio_verificacion:
    'Procedimiento aprobado y registros de difusión disponibles.',
  clausulas_iso_relacionadas: ['7.5', '4.4'],
});

const sharedDocSection = (orden: number, titulo: string) => ({
  orden,
  titulo,
  objetivo_seccion: `Definir ${titulo.toLowerCase()} de forma clara y auditable.`,
  puntos_clave: [
    `Contenido mínimo de ${titulo.toLowerCase()}`,
    'Responsables y criterios de control',
  ],
  evidencia_sugerida: ['Registro firmado', 'Versión aprobada en repositorio'],
  longitud_sugerida_palabras: 120,
});

export const isoContractsDocumentation: AIContractDocumentation[] = [
  {
    id: 'iso_gap_evaluation_v1',
    version: 'v1',
    title: 'Evaluación de brechas ISO',
    objective:
      'Diagnosticar nivel de cumplimiento, hallazgos y prioridades de cierre en 90 días.',
    responseMode: 'json',
    fields: [
      {
        path: 'contract_id',
        type: '"iso_gap_evaluation_v1"',
        required: true,
        description: 'Identificador del contrato.',
      },
      {
        path: 'version',
        type: '"v1"',
        required: true,
        description: 'Versión de contrato.',
      },
      {
        path: 'idioma',
        type: '"es"',
        required: true,
        description: 'Idioma de salida.',
      },
      {
        path: 'nivel_madurez',
        type: '"B1" | "B2" | "B3"',
        required: true,
        description: 'Nivel de madurez inferido/objetivo.',
      },
      {
        path: 'puntaje_cumplimiento',
        type: 'number (0-100)',
        required: true,
        description: 'Estimación de cumplimiento del alcance.',
      },
      {
        path: 'hallazgos[].clausula_iso.codigo',
        type: 'string',
        required: true,
        description: 'Código de cláusula ISO asociado al hallazgo.',
      },
      {
        path: 'prioridades_90_dias[].plazo_dias',
        type: 'integer (1-90)',
        required: true,
        description: 'Plazo recomendado para ejecución.',
      },
    ],
    examplesByMaturity: {
      B1: {
        contract_id: 'iso_gap_evaluation_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B1',
        confianza_modelo: 0.73,
        resumen_ejecutivo:
          'El área presenta prácticas operativas activas, pero con formalización documental insuficiente y seguimiento reactivo.',
        puntaje_cumplimiento: 48,
        estado_general: 'parcial',
        fortalezas: ['Compromiso operativo del responsable de área'],
        hallazgos: [sharedGapHallazgo('01')],
        prioridades_90_dias: [
          {
            prioridad: 'alta',
            accion: 'Crear matriz maestra de documentos y responsables.',
            clausula_iso: '7.5',
            responsable_sugerido: 'Coordinador de Calidad',
            plazo_dias: 30,
          },
        ],
        supuestos: [
          'No se recibió evidencia de aprobación formal de documentos.',
        ],
        advertencias: [
          'Validar alcance real antes de extrapolar puntaje a todo el SGC.',
        ],
      },
      B2: {
        contract_id: 'iso_gap_evaluation_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B2',
        confianza_modelo: 0.82,
        resumen_ejecutivo:
          'Existe base documental y roles definidos, pero la disciplina de actualización y control de evidencias es inconsistente.',
        puntaje_cumplimiento: 67,
        estado_general: 'parcial',
        fortalezas: [
          'Responsables de proceso identificados',
          'Registros de ejecución parciales disponibles',
        ],
        hallazgos: [
          sharedGapHallazgo('02'),
          {
            ...sharedGapHallazgo('03'),
            severidad: 'alta',
            clausula_iso: {
              codigo: '9.1',
              titulo: 'Seguimiento, medición, análisis y evaluación',
              relevancia: 'Permite evaluar desempeño y eficacia del SGC.',
            },
            descripcion:
              'Los indicadores se registran sin criterio homogéneo de análisis.',
            evidencia_observada:
              'Se observaron planillas con fórmulas distintas.',
            brecha: 'No hay método estandarizado para análisis de resultados.',
            riesgo_asociado:
              'Decisiones de mejora basadas en datos inconsistentes.',
            accion_inmediata_sugerida:
              'Definir ficha de indicador y responsable de validación.',
          },
        ],
        prioridades_90_dias: [
          {
            prioridad: 'alta',
            accion: 'Implementar control de versiones y revisión mensual.',
            clausula_iso: '7.5',
            responsable_sugerido: 'Responsable de Calidad',
            plazo_dias: 45,
          },
          {
            prioridad: 'media',
            accion: 'Estandarizar fichas de indicadores críticos.',
            clausula_iso: '9.1',
            responsable_sugerido: 'Líderes de Proceso',
            plazo_dias: 60,
          },
        ],
        supuestos: [
          'La muestra analizada representa el proceso principal del área.',
        ],
        advertencias: [
          'El puntaje puede variar si se revisan más registros históricos.',
        ],
      },
      B3: {
        contract_id: 'iso_gap_evaluation_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B3',
        confianza_modelo: 0.9,
        resumen_ejecutivo:
          'El proceso demuestra control operativo robusto, con brechas focalizadas en trazabilidad de cambios y evidencia de eficacia.',
        puntaje_cumplimiento: 83,
        estado_general: 'cumple',
        fortalezas: [
          'Proceso estandarizado y difundido',
          'Seguimiento de indicadores con frecuencia definida',
        ],
        hallazgos: [
          {
            ...sharedGapHallazgo('04'),
            severidad: 'baja',
            descripcion:
              'La revisión de cambios documentales no siempre conserva justificación de modificación.',
            riesgo_asociado:
              'Menor trazabilidad para auditoría sobre decisiones de actualización.',
          },
        ],
        prioridades_90_dias: [
          {
            prioridad: 'media',
            accion:
              'Agregar registro de justificación en historial de cambios.',
            clausula_iso: '7.5',
            responsable_sugerido: 'Document Control Owner',
            plazo_dias: 30,
          },
        ],
        supuestos: [],
        advertencias: [
          'Corroborar eficacia con resultados trimestrales antes de cerrar hallazgo.',
        ],
      },
    },
  },
  {
    id: 'iso_indicator_analysis_v1',
    version: 'v1',
    title: 'Análisis de indicador ISO/SGC',
    objective:
      'Analizar tendencia, desvío, causas probables y recomendaciones.',
    responseMode: 'json',
    fields: [
      {
        path: 'indicator.nombre',
        type: 'string',
        required: true,
        description: 'Nombre del indicador evaluado.',
      },
      {
        path: 'indicator.tendencia',
        type: '"mejora" | "estable" | "deterioro" | "sin_datos"',
        required: true,
        description: 'Comportamiento del indicador.',
      },
      {
        path: 'indicator.estado_meta',
        type: '"en_meta" | "en_riesgo" | "fuera_meta"',
        required: true,
        description: 'Estado respecto a meta.',
      },
      {
        path: 'causas_probables[]',
        type: 'array',
        required: true,
        description: 'Causas con evidencia y nivel de impacto.',
      },
      {
        path: 'recomendaciones[]',
        type: 'array',
        required: true,
        description: 'Acciones sugeridas con prioridad e impacto esperado.',
      },
    ],
    examplesByMaturity: {
      B1: {
        contract_id: 'iso_indicator_analysis_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B1',
        confianza_modelo: 0.7,
        indicador: {
          nombre: 'Cumplimiento de entregas',
          unidad: '%',
          periodo_analizado: 'Enero 2026',
          valor_actual: 82,
          meta: 95,
          tendencia: 'deterioro',
          estado_meta: 'fuera_meta',
          desviacion_absoluta: -13,
          desviacion_porcentual: -13.68,
        },
        resumen_ejecutivo:
          'El indicador está fuera de meta y muestra deterioro, con necesidad de acciones operativas inmediatas.',
        hallazgos_clave: ['Incumplimiento sostenido de la meta mensual'],
        causas_probables: [
          {
            causa: 'Planificación diaria reactiva',
            evidencia: 'Se reportan reprogramaciones frecuentes en registros.',
            impacto_estimado: 'alto',
          },
        ],
        alertas: [
          {
            severidad: 'alta',
            tipo: 'variacion',
            mensaje: 'Desvío superior al 10% respecto a la meta.',
          },
        ],
        recomendaciones: [
          {
            prioridad: 'alta',
            accion: 'Implementar tablero diario de entregas pendientes.',
            impacto_esperado: 'Reducir atrasos de corto plazo.',
            plazo_dias: 15,
          },
        ],
        datos_faltantes: ['Detalle por turno y causa de atraso'],
      },
      B2: {
        contract_id: 'iso_indicator_analysis_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B2',
        confianza_modelo: 0.81,
        indicador: {
          nombre: 'Rechazos en inspección final',
          unidad: '%',
          periodo_analizado: 'Q4 2025',
          valor_actual: 3.8,
          meta: 2.5,
          tendencia: 'deterioro',
          estado_meta: 'en_riesgo',
          desviacion_absoluta: 1.3,
          desviacion_porcentual: 52,
        },
        resumen_ejecutivo:
          'El indicador supera la meta y requiere control de causas de proceso, aunque existe información útil para análisis.',
        hallazgos_clave: [
          'Variabilidad mayor en lotes de proveedores específicos',
          'Registro de retrabajos incompleto en 2 semanas',
        ],
        causas_probables: [
          {
            causa: 'Criterios de inspección no homogéneos entre inspectores',
            evidencia:
              'Diferencias en planillas de inspección y rechazos por turno.',
            impacto_estimado: 'medio',
          },
          {
            causa: 'Variación de materia prima',
            evidencia: 'Incremento de defectos coincide con lote proveedor B.',
            impacto_estimado: 'alto',
          },
        ],
        alertas: [
          {
            severidad: 'media',
            tipo: 'datos',
            mensaje:
              'Faltan registros completos de retrabajo para parte del período.',
          },
        ],
        recomendaciones: [
          {
            prioridad: 'alta',
            accion:
              'Estandarizar criterios de inspección y recalibrar checklists.',
            impacto_esperado: 'Reducir dispersión y falsos rechazos.',
            plazo_dias: 30,
          },
          {
            prioridad: 'media',
            accion:
              'Abrir análisis con proveedor B sobre lotes con defectos recurrentes.',
            impacto_esperado: 'Disminuir defectos de origen.',
            plazo_dias: 45,
          },
        ],
        datos_faltantes: ['Histórico por inspector de los últimos 3 meses'],
      },
      B3: {
        contract_id: 'iso_indicator_analysis_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B3',
        confianza_modelo: 0.92,
        indicador: {
          nombre: 'Cumplimiento de acciones correctivas en plazo',
          unidad: '%',
          periodo_analizado: '2025 anual',
          valor_actual: 96,
          meta: 95,
          tendencia: 'mejora',
          estado_meta: 'en_meta',
          desviacion_absoluta: 1,
          desviacion_porcentual: 1.05,
        },
        resumen_ejecutivo:
          'El indicador se mantiene en meta con tendencia favorable, con oportunidades de consolidar análisis de eficacia.',
        hallazgos_clave: [
          'Cumplimiento sostenido durante tres trimestres',
          'Mayor demora residual en acciones interáreas',
        ],
        causas_probables: [
          {
            causa: 'Seguimiento semanal por comité de calidad',
            evidencia: 'Actas de revisión muestran escalamiento temprano.',
            impacto_estimado: 'alto',
          },
        ],
        alertas: [],
        recomendaciones: [
          {
            prioridad: 'media',
            accion:
              'Agregar medición de eficacia post-cierre para acciones críticas.',
            impacto_esperado:
              'Mejorar calidad del cierre y aprendizaje organizacional.',
            plazo_dias: 60,
          },
        ],
        datos_faltantes: [],
      },
    },
  },
  {
    id: 'iso_action_recommendation_v1',
    version: 'v1',
    title: 'Recomendación de acciones ISO',
    objective:
      'Proponer acciones priorizadas con verificación, quick wins y seguimiento.',
    responseMode: 'json',
    fields: [
      {
        path: 'origen',
        type: 'enum',
        required: true,
        description: 'Origen del caso (auditoría, NC, etc.).',
      },
      {
        path: 'acciones_recomendadas[]',
        type: 'array',
        required: true,
        description:
          'Acciones con prioridad, impacto, esfuerzo y verificación.',
      },
      {
        path: 'acciones_recomendadas[].clausulas_iso_relacionadas[]',
        type: 'array<string>',
        required: true,
        description: 'Cláusulas ISO vinculadas a cada acción.',
      },
      {
        path: 'quick_wins[]',
        type: 'array<string>',
        required: true,
        description: 'IDs de acciones de implementación rápida.',
      },
      {
        path: 'seguimiento_kpis[]',
        type: 'array',
        required: true,
        description: 'KPIs para seguimiento de eficacia de implementación.',
      },
    ],
    examplesByMaturity: {
      B1: {
        contract_id: 'iso_action_recommendation_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B1',
        confianza_modelo: 0.72,
        origen: 'no_conformidad',
        resumen_contexto:
          'Se detectó uso de formato obsoleto en producción sin control de retiro.',
        acciones_recomendadas: [
          {
            ...sharedAction('AC-01', 'alta'),
            tipo_accion: 'correccion',
            descripcion:
              'Retirar formatos obsoletos de puntos de uso y reemplazar versión vigente.',
            justificacion:
              'Contiene la no conformidad y evita repetición inmediata.',
            esfuerzo: 'bajo',
            plazo_dias: 7,
          },
          {
            ...sharedAction('AC-02', 'media'),
            tipo_accion: 'correctiva',
            descripcion:
              'Definir listado maestro de formatos con responsable de actualización.',
            plazo_dias: 21,
          },
        ],
        quick_wins: ['AC-01'],
        secuencia_implementacion: [
          'Contener uso de formatos obsoletos',
          'Actualizar listado maestro',
          'Capacitar responsables de área',
        ],
        riesgos_implementacion: [
          {
            riesgo: 'Retiro incompleto de copias impresas',
            mitigacion: 'Verificación por sector con checklist firmado.',
          },
        ],
        seguimiento_kpis: [
          {
            indicador: 'Uso de formatos vigentes',
            objetivo: '100% puntos de uso con versión vigente',
            frecuencia: 'semanal',
          },
        ],
        advertencias: [
          'Confirmar alcance de la distribución física de formatos.',
        ],
      },
      B2: {
        contract_id: 'iso_action_recommendation_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B2',
        confianza_modelo: 0.84,
        origen: 'auditoria',
        resumen_contexto:
          'Auditoría interna identificó seguimiento irregular de indicadores y cierres tardíos de acciones.',
        acciones_recomendadas: [
          { ...sharedAction('AC-01', 'alta') },
          {
            ...sharedAction('AC-02', 'media'),
            tipo_accion: 'mejora',
            descripcion:
              'Implementar rutina mensual de revisión de indicadores con acta estándar.',
            justificacion:
              'Mejora consistencia del análisis y decisiones del proceso.',
            impacto: 'medio',
            esfuerzo: 'medio',
            plazo_dias: 45,
            dependencias: ['AC-01'],
            clausulas_iso_relacionadas: ['9.1', '9.3'],
          },
          {
            ...sharedAction('AC-03', 'baja'),
            tipo_accion: 'preventiva',
            descripcion:
              'Capacitar líderes en criterios de evidencia y cierre de acciones.',
            justificacion: 'Reduce recurrencia por cierre débil de acciones.',
            impacto: 'medio',
            esfuerzo: 'bajo',
            plazo_dias: 60,
            dependencias: ['AC-02'],
            clausulas_iso_relacionadas: ['7.2', '10.2'],
          },
        ],
        quick_wins: ['AC-01'],
        secuencia_implementacion: [
          'Formalizar control documental',
          'Instalar revisión mensual de indicadores',
          'Capacitar líderes y validar cierres',
        ],
        riesgos_implementacion: [
          {
            riesgo: 'Sobrecarga de responsables con nuevas rutinas',
            mitigacion:
              'Definir agenda fija y plantillas de registro para reducir tiempo.',
          },
        ],
        seguimiento_kpis: [
          {
            indicador: 'Acciones cerradas en plazo',
            objetivo: '>= 90%',
            frecuencia: 'mensual',
          },
          {
            indicador: 'Indicadores analizados con acta',
            objetivo: '100% indicadores críticos',
            frecuencia: 'mensual',
          },
        ],
        advertencias: [
          'Alinear plazos con disponibilidad real de líderes de proceso.',
        ],
      },
      B3: {
        contract_id: 'iso_action_recommendation_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B3',
        confianza_modelo: 0.93,
        origen: 'mejora',
        resumen_contexto:
          'Se busca elevar eficacia del cierre de acciones y trazabilidad de evidencias entre procesos.',
        acciones_recomendadas: [
          {
            ...sharedAction('AC-01', 'alta'),
            tipo_accion: 'mejora',
            descripcion:
              'Integrar workflow digital con evidencia obligatoria y aprobación escalonada de cierres.',
            justificacion:
              'Fortalece trazabilidad y calidad del cierre, reduciendo reprocesos de auditoría.',
            impacto: 'alto',
            esfuerzo: 'alto',
            plazo_dias: 120,
            criterio_verificacion:
              'Workflow operativo con evidencias adjuntas y trazabilidad por estado.',
            clausulas_iso_relacionadas: ['7.5', '9.1', '10.2'],
          },
          {
            ...sharedAction('AC-02', 'media'),
            tipo_accion: 'preventiva',
            descripcion:
              'Definir criterios de aceptación de evidencia por tipo de acción y severidad.',
            justificacion:
              'Previene cierres débiles y variabilidad entre evaluadores.',
            impacto: 'alto',
            esfuerzo: 'medio',
            plazo_dias: 45,
            dependencias: [],
            clausulas_iso_relacionadas: ['10.2', '7.2'],
          },
        ],
        quick_wins: ['AC-02'],
        secuencia_implementacion: [
          'Definir criterios de aceptación de evidencia',
          'Diseñar workflow digital',
          'Piloto en proceso crítico',
          'Despliegue general',
        ],
        riesgos_implementacion: [
          {
            riesgo: 'Resistencia al cambio en responsables de proceso',
            mitigacion: 'Piloto con métricas y entrenamiento por rol.',
          },
          {
            riesgo: 'Parametrización insuficiente del workflow',
            mitigacion: 'Definir pruebas de aceptación con casos reales.',
          },
        ],
        seguimiento_kpis: [
          {
            indicador: 'Reaperturas de acciones',
            objetivo: '<= 5%',
            frecuencia: 'mensual',
          },
          {
            indicador: 'Tiempo de validación de cierre',
            objetivo: '<= 5 días',
            frecuencia: 'semanal',
          },
        ],
        advertencias: [
          'Confirmar capacidad tecnológica antes de planificar despliegue total.',
        ],
      },
    },
  },
  {
    id: 'iso_document_generation_v1',
    version: 'v1',
    title: 'Estructura para generación documental ISO',
    objective:
      'Diseñar estructura, insumos requeridos y criterios de calidad para posterior redacción de documento.',
    responseMode: 'json',
    fields: [
      {
        path: 'tipo_documento',
        type: 'enum',
        required: true,
        description: 'Tipo de documento del SGC.',
      },
      {
        path: 'estructura[]',
        type: 'array',
        required: true,
        description: 'Secciones ordenadas del documento.',
      },
      {
        path: 'requisitos_entrada[]',
        type: 'array',
        required: true,
        description: 'Datos necesarios para redactar el documento final.',
      },
      {
        path: 'criterios_calidad[]',
        type: 'array<string>',
        required: true,
        description: 'Criterios de calidad de la redacción/estructura.',
      },
      {
        path: 'salida_final_recomendada',
        type: '"json_estructura" | "texto_documento" | "mixto"',
        required: true,
        description: 'Modalidad sugerida para la etapa siguiente.',
      },
    ],
    examplesByMaturity: {
      B1: {
        contract_id: 'iso_document_generation_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B1',
        confianza_modelo: 0.75,
        tipo_documento: 'procedimiento',
        titulo_propuesto: 'Procedimiento de Control de Documentos',
        objetivo_documento:
          'Definir reglas básicas para crear, aprobar y actualizar documentos del SGC.',
        audiencia: 'Responsables de proceso y calidad',
        tono: 'operativo',
        clausulas_iso_relacionadas: ['7.5'],
        requisitos_entrada: [
          {
            campo: 'responsable_control_documental',
            descripcion: 'Rol responsable de administrar documentos vigentes',
            obligatorio: true,
            ejemplo: 'Coordinador de Calidad',
          },
        ],
        estructura: [
          sharedDocSection(1, 'Objetivo'),
          sharedDocSection(2, 'Alcance'),
          sharedDocSection(3, 'Responsabilidades'),
        ],
        criterios_calidad: [
          'Lenguaje claro y directo',
          'Secciones numeradas',
          'Roles y registros identificados',
        ],
        notas_redaccion:
          'Usar verbos de acción y evitar ambigüedad en responsabilidades.',
        salida_final_recomendada: 'mixto',
      },
      B2: {
        contract_id: 'iso_document_generation_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B2',
        confianza_modelo: 0.86,
        tipo_documento: 'procedimiento',
        titulo_propuesto: 'Procedimiento de Auditorías Internas',
        objetivo_documento:
          'Estandarizar planificación, ejecución y seguimiento de auditorías internas del SGC.',
        audiencia: 'Auditores internos y líderes de proceso',
        tono: 'tecnico',
        clausulas_iso_relacionadas: ['9.2', '10.2'],
        requisitos_entrada: [
          {
            campo: 'frecuencia_programa',
            descripcion: 'Periodicidad del programa de auditorías',
            obligatorio: true,
            ejemplo: 'Semestral',
          },
          {
            campo: 'criterios_auditoria',
            descripcion: 'Criterios y documentos de referencia',
            obligatorio: true,
            ejemplo: 'ISO 9001:2015, procedimientos internos vigentes',
          },
        ],
        estructura: [
          sharedDocSection(1, 'Objetivo'),
          sharedDocSection(2, 'Alcance'),
          sharedDocSection(3, 'Definiciones'),
          sharedDocSection(4, 'Desarrollo'),
        ],
        criterios_calidad: [
          'Trazabilidad con cláusulas ISO',
          'Criterios y registros claramente definidos',
          'Secuencia de actividades auditable',
        ],
        notas_redaccion:
          'Explicitar criterios de competencia del auditor y seguimiento de hallazgos.',
        salida_final_recomendada: 'texto_documento',
      },
      B3: {
        contract_id: 'iso_document_generation_v1',
        version: 'v1',
        idioma: 'es',
        nivel_madurez: 'B3',
        confianza_modelo: 0.94,
        tipo_documento: 'manual',
        titulo_propuesto: 'Manual Integrado de Gestión de Calidad',
        objetivo_documento:
          'Describir la arquitectura del SGC, gobernanza, procesos y mecanismos de mejora.',
        audiencia: 'Dirección, auditores y líderes de proceso',
        tono: 'formal',
        clausulas_iso_relacionadas: ['4.4', '5.1', '6.1', '7.5', '9.3', '10.3'],
        requisitos_entrada: [
          {
            campo: 'mapa_procesos_vigente',
            descripcion: 'Mapa de procesos y responsables actualizados',
            obligatorio: true,
            ejemplo: 'Mapa de procesos versión 3 aprobado por dirección',
          },
          {
            campo: 'politica_y_objetivos',
            descripcion: 'Política y objetivos de calidad vigentes',
            obligatorio: true,
            ejemplo: 'Política 2026 y tablero de objetivos estratégicos',
          },
        ],
        estructura: [
          sharedDocSection(1, 'Contexto y Alcance del SGC'),
          sharedDocSection(2, 'Gobernanza y Responsabilidades'),
          sharedDocSection(3, 'Arquitectura de Procesos'),
          sharedDocSection(4, 'Gestión de Riesgos y Oportunidades'),
          sharedDocSection(5, 'Seguimiento, Medición y Mejora'),
        ],
        criterios_calidad: [
          'Coherencia entre procesos, roles y registros',
          'Trazabilidad con cláusulas ISO relevantes',
          'Consistencia terminológica del SGC',
        ],
        notas_redaccion:
          'Mantener tono institucional y evitar duplicar contenido que ya está en procedimientos.',
        salida_final_recomendada: 'mixto',
      },
    },
  },
];
