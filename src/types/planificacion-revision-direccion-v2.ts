/**
 * Planificación y Revisión por la Dirección - VERSIÓN 2.0 (ISO 9001:2026-Ready)
 *
 * Cambios principales vs V1:
 * - Cultura de Calidad (Cl. 5.1.1 expandido)
 * - Comportamiento Ético (nuevo requisito 2026)
 * - Partes Interesadas expandido (Cl. 4.2)
 * - Riesgos y Oportunidades separados (Cl. 6.1)
 * - Revisión por la Dirección mejorada (Cl. 9.3)
 * - Sostenibilidad y ESG (Enmienda 2024)
 * - Gestión del Conocimiento (Cl. 7.1.6 expandido)
 */

// ===== TIPOS BASE (heredados de V1) =====
export type EstadoRevision = 'borrador' | 'vigente' | 'historico';
export type EstadoPolitica =
  | 'borrador'
  | 'en_revision'
  | 'vigente'
  | 'obsoleta';
export type FrecuenciaRevision = 'trimestral' | 'semestral' | 'anual';
export type TipoProductoServicio = 'producto' | 'servicio';
export type TipoUbicacion =
  | 'sede_principal'
  | 'sucursal'
  | 'planta'
  | 'almacen'
  | 'oficina';

// ===== IDENTIDAD ORGANIZACIONAL (V1 compatible) =====
export interface IdentidadOrganizacional {
  NOMBRE_ORGANIZACION: string;
  SECTOR: string;
  DESCRIPCION: string;
  TOTAL_EMPLEADOS: number;
  EMPLEADOS_CON_ACCESO: number;
  MISION: string;
  VISION: string;
}

// ===== ALCANCE DEL SGC (V1 compatible) =====
export interface AlcanceSGC {
  DESCRIPCION: string;
  LIMITES: string;
  PRODUCTOS_SERVICIOS: Array<{
    nombre: string;
    descripcion: string;
    tipo: TipoProductoServicio;
  }>;
  UBICACIONES: Array<{
    nombre: string;
    direccion?: string;
    tipo: TipoUbicacion;
  }>;
}

// ===== CONTEXTO ORGANIZACIONAL (V1 mejorado) =====
export interface Contexto {
  FECHA_ANALISIS: string;
  FRECUENCIA_REVISION: FrecuenciaRevision;

  CUESTIONES_EXTERNAS: Array<{
    tipo:
      | 'economico'
      | 'tecnologico'
      | 'competitivo'
      | 'mercado'
      | 'cultural'
      | 'social'
      | 'legal'
      | 'ambiental'
      | 'climatico'; // NUEVO: climatico
    descripcion: string;
    impacto: 'positivo' | 'negativo' | 'neutral';
    nivel_impacto: 'bajo' | 'medio' | 'alto';
    ambito: 'internacional' | 'nacional' | 'regional' | 'local';
  }>;

  CUESTIONES_INTERNAS: Array<{
    tipo:
      | 'valores'
      | 'cultura'
      | 'conocimientos'
      | 'desempeño'
      | 'recursos'
      | 'capacidades'
      | 'estructura';
    descripcion: string;
    estado_actual: string;
    fortaleza_debilidad: 'fortaleza' | 'debilidad';
  }>;

  // NUEVO ISO 2026: Factores ESG (Environmental, Social, Governance)
  FACTORES_ESG?: {
    ambientales: string[];
    sociales: string[];
    gobernanza: string[];
  };
}

// ===== ESTRUCTURA (V1 compatible) =====
export interface Estructura {
  ORGANIGRAMA_URL?: string;
  OTROS_DATOS?: string;
}

// ===== POLÍTICA (V1 compatible) =====
export interface Politica {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  contenido?: string;
  proposito?: string;
  alcance?: string;
  version: string;
  fecha_aprobacion?: string;
  fecha_revision?: string;
  fecha_proxima_revision?: string;
  aprobador_id?: string;
  aprobador_nombre?: string;
  estado: EstadoPolitica;
  procesos_relacionados?: string[];
  departamentos_aplicables?: string[];
  puntos_norma?: string[];
  documento_url?: string;
  adjuntos?: Array<{ nombre: string; url: string }>;
}

// ===== PARTES INTERESADAS (NUEVO ISO 2026) =====
export interface ParteInteresada {
  id: string;
  nombre: string;
  tipo:
    | 'cliente'
    | 'proveedor'
    | 'empleado'
    | 'accionista'
    | 'regulador'
    | 'comunidad'
    | 'socio'
    | 'otro';
  categoria?: string; // Ej: "Cliente VIP", "Proveedor Crítico"

  // Necesidades y Expectativas (Cl. 4.2)
  necesidades: string[];
  expectativas: string[];
  requisitos_aplicables: string[];

  // Análisis de Influencia e Impacto
  nivel_influencia: 'bajo' | 'medio' | 'alto';
  nivel_impacto: 'bajo' | 'medio' | 'alto';

  // Estrategia de Gestión
  estrategia_gestion: string;
  frecuencia_interaccion:
    | 'diaria'
    | 'semanal'
    | 'mensual'
    | 'trimestral'
    | 'anual';
  canal_comunicacion?: string; // Ej: "Email", "Portal Cliente", "Reuniones"

  // Metadata
  responsable_relacion_id?: string;
  fecha_ultima_actualizacion: string;
  notas?: string;
}

// ===== CULTURA DE CALIDAD (NUEVO ISO 2026 - Cl. 5.1.1) =====
export interface CulturaCalidad {
  descripcion: string;
  valores_calidad: string[]; // Ej: ["Excelencia", "Innovación", "Cliente primero"]

  // Iniciativas para Promover la Cultura
  iniciativas_activas: Array<{
    id: string;
    nombre: string;
    descripcion: string;
    responsable_id?: string;
    responsable_nombre?: string;
    estado: 'planificada' | 'en_curso' | 'completada' | 'cancelada';
    fecha_inicio?: string;
    fecha_fin?: string;
    evidencias?: Array<{ nombre: string; url: string }>;
  }>;

  // Evaluación de Madurez de la Cultura
  evaluacion_madurez?: {
    fecha: string;
    nivel: 1 | 2 | 3 | 4 | 5; // 1=Inicial, 5=Optimizado
    areas_mejora: string[];
    fortalezas: string[];
    metodo_evaluacion?: string; // Ej: "Encuesta", "Entrevistas", "Observación"
  };

  fecha_ultima_revision: string;
}

// ===== COMPORTAMIENTO ÉTICO (NUEVO ISO 2026) =====
export interface ComportamientoEtico {
  // Código de Ética
  codigo_etica_url?: string;
  codigo_etica_version?: string;
  fecha_aprobacion_codigo?: string;

  // Canales de Denuncia
  canales_denuncia: Array<{
    id: string;
    tipo:
      | 'email'
      | 'formulario_web'
      | 'telefono'
      | 'presencial'
      | 'buzón'
      | 'otro';
    contacto: string;
    descripcion?: string;
    es_anonimo: boolean;
  }>;

  // Capacitaciones en Ética
  capacitaciones_etica: Array<{
    id: string;
    titulo: string;
    fecha: string;
    participantes_count: number;
    duracion_horas?: number;
    modalidad?: 'presencial' | 'virtual' | 'hibrida';
    evidencia_url?: string;
  }>;

  // Estadísticas de Incidentes
  incidentes_reportados_anio_actual: number;
  incidentes_resueltos_anio_actual: number;
  tiempo_promedio_resolucion_dias?: number;

  fecha_ultima_revision: string;
  notas?: string;
}

// ===== RIESGOS Y OPORTUNIDADES (NUEVO ISO 2026 - Cl. 6.1) =====
export interface RiesgoOportunidad {
  id: string;
  tipo: 'riesgo' | 'oportunidad';

  // Fuente de Identificación
  fuente:
    | 'contexto_externo'
    | 'contexto_interno'
    | 'partes_interesadas'
    | 'procesos'
    | 'cambio_organizacional'
    | 'auditoria'
    | 'otro';

  // Descripción
  titulo: string;
  descripcion: string;

  // Evaluación
  probabilidad: 'muy_baja' | 'baja' | 'media' | 'alta' | 'muy_alta';
  impacto: 'muy_bajo' | 'bajo' | 'medio' | 'alto' | 'muy_alto';
  nivel_riesgo: 'bajo' | 'medio' | 'alto' | 'critico'; // Calculado: probabilidad × impacto

  // Acciones Planificadas
  acciones_planificadas: Array<{
    id: string;
    descripcion: string;
    tipo:
      | 'mitigar'
      | 'eliminar'
      | 'aceptar'
      | 'transferir'
      | 'explotar'
      | 'mejorar';
    responsable_id?: string;
    responsable_nombre?: string;
    fecha_limite?: string;
    estado: 'pendiente' | 'en_curso' | 'completada' | 'cancelada';
    accion_id?: string; // Link al módulo de Acciones (si se creó formalmente)
  }>;

  // Vinculación con el SGC
  proceso_relacionado_id?: string;
  proceso_relacionado_nombre?: string;
  objetivo_calidad_relacionado_id?: string;
  kpi_seguimiento?: string;

  // Estado y Seguimiento
  estado: 'identificado' | 'en_tratamiento' | 'controlado' | 'cerrado';
  fecha_identificacion: string;
  fecha_ultima_revision: string;
  fecha_cierre?: string;

  // Metadata
  responsable_seguimiento_id?: string;
  responsable_seguimiento_nombre?: string;
  notas?: string;
}

// ===== GESTIÓN DEL CONOCIMIENTO (NUEVO ISO 2026 - Cl. 7.1.6) =====
export interface GestionConocimiento {
  // Conocimientos Críticos Identificados
  conocimientos_criticos: Array<{
    id: string;
    nombre: string;
    descripcion: string;
    tipo: 'tecnico' | 'proceso' | 'cliente' | 'producto' | 'normativo' | 'otro';
    nivel_criticidad: 'bajo' | 'medio' | 'alto';

    // Fuentes del Conocimiento
    fuentes: Array<{
      tipo: 'persona' | 'documento' | 'sistema' | 'base_datos' | 'otro';
      identificador: string; // ID de persona, URL de documento, etc.
      descripcion?: string;
    }>;

    // Estrategia de Preservación
    estrategia_preservacion: string;
    documentado: boolean;
    documento_url?: string;

    // Transferencia
    plan_transferencia?: string;
    responsable_transferencia_id?: string;
  }>;

  // Mecanismos de Captura y Transferencia
  mecanismos_captura: string[]; // Ej: ["Lecciones aprendidas", "Mentoring", "Documentación"]
  frecuencia_revision_conocimiento: FrecuenciaRevision;

  fecha_ultima_revision: string;
}

// ===== REVISIÓN POR LA DIRECCIÓN (NUEVO ISO 2026 - Cl. 9.3) =====
export interface RevisionDireccion {
  id: string;
  fecha: string;
  periodo: string; // Ej: "2026-Q1"

  // Participantes
  participantes: Array<{
    id: string;
    nombre: string;
    cargo: string;
    rol_reunion?: 'presidente' | 'secretario' | 'participante';
  }>;

  // ENTRADAS (Cl. 9.3.2) - ISO 2026 expandido
  entradas: {
    // Entradas tradicionales (ISO 2015)
    estado_acciones_anteriores: string;
    cambios_contexto: string;
    desempeño_procesos: string;
    conformidad_productos_servicios: string;
    no_conformidades_acciones_correctivas: string;
    resultados_seguimiento_medicion: string;
    resultados_auditorias: string;
    desempeño_proveedores_externos: string;
    adecuacion_recursos: string;
    eficacia_acciones_riesgos_oportunidades: string;
    oportunidades_mejora: string;

    // NUEVAS ENTRADAS ISO 2026
    estado_cultura_calidad: string;
    estado_comportamiento_etico: string;
    cambios_partes_interesadas: string;
    gestion_conocimiento_critico: string;
    factores_esg_sostenibilidad: string;
    digitalizacion_automatizacion: string; // Nuevos sistemas, integraciones
  };

  // SALIDAS (Cl. 9.3.3)
  salidas: {
    oportunidades_mejora_identificadas: string[];
    necesidades_cambio_sgc: string[];
    necesidades_recursos: string[];

    // Acciones Generadas (vinculadas al módulo de Acciones)
    acciones_generadas: Array<{
      accion_id?: string; // ID de la acción creada en el módulo de Acciones
      descripcion: string;
      tipo: 'correctiva' | 'preventiva' | 'mejora';
      responsable_id?: string;
      responsable_nombre?: string;
      fecha_limite?: string;
      estado?: 'pendiente' | 'en_curso' | 'completada';
    }>;

    // Decisiones Estratégicas
    decisiones_estrategicas?: string[];
  };

  // Documentación
  acta_reunion_url?: string;
  presentaciones_urls?: Array<{ nombre: string; url: string }>;

  // Estado
  estado: 'borrador' | 'en_revision' | 'aprobada';
  aprobado_por_id?: string;
  aprobado_por_nombre?: string;
  fecha_aprobacion?: string;

  // Metadata
  created_at: string;
  created_by: string;
  notas?: string;
}

// ===== TRACKING DE COMPLETADO (expandido) =====
export interface CompletadoTracking {
  // Secciones V1
  identidad: boolean;
  alcance: boolean;
  contexto: boolean;
  estructura: boolean;
  politicas: boolean;

  // Secciones NUEVAS ISO 2026
  partes_interesadas: boolean;
  cultura_calidad: boolean;
  comportamiento_etico: boolean;
  riesgos_oportunidades: boolean;
  gestion_conocimiento: boolean;
  revision_direccion: boolean;
}

// ===== CONFIGURACIÓN ISO 2026 =====
export interface ConfiguracionISO2026 {
  habilitar_requisitos_2026: boolean; // Toggle para mostrar/ocultar secciones nuevas
  version_iso_objetivo: '2015' | '2026';
  fecha_activacion_2026?: string;
  notas_transicion?: string;
}

// ===== REGISTRO PRINCIPAL V2 =====
export interface PlanificacionRevisionDireccionV2 {
  id: string;

  // Versionado
  fecha_revision: string;
  periodo: string;
  estado: EstadoRevision;
  version: string; // "2.0"

  // Configuración ISO
  configuracion_iso: ConfiguracionISO2026;

  // Tracking de completado
  completado: CompletadoTracking;

  // ===== SECCIONES V1 (compatibles) =====
  IdentidadOrganizacional: IdentidadOrganizacional;
  AlcanceSGC: AlcanceSGC;
  Contexto: Contexto;
  Estructura: Estructura;
  Politicas: Politica[];

  // ===== SECCIONES NUEVAS ISO 2026 =====
  PartesInteresadas: ParteInteresada[];
  CulturaCalidad: CulturaCalidad;
  ComportamientoEtico: ComportamientoEtico;
  RiesgosOportunidades: RiesgoOportunidad[];
  GestionConocimiento: GestionConocimiento;
  RevisionesDireccion: RevisionDireccion[];

  // ===== METADATA =====
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;

  // Migración
  migrado_desde_v1?: boolean;
  v1_id?: string; // ID del documento original si fue migrado
}

// ===== DATOS PARA CREAR NUEVA REVISIÓN V2 =====
export interface CreatePlanificacionRevisionV2Data {
  fecha_revision: string;
  periodo: string;
  configuracion_iso?: Partial<ConfiguracionISO2026>;

  // Datos iniciales opcionales
  IdentidadOrganizacional?: Partial<IdentidadOrganizacional>;
  AlcanceSGC?: Partial<AlcanceSGC>;
  Contexto?: Partial<Contexto>;
  Estructura?: Partial<Estructura>;
  Politicas?: Politica[];

  // Datos ISO 2026 opcionales
  PartesInteresadas?: ParteInteresada[];
  CulturaCalidad?: Partial<CulturaCalidad>;
  ComportamientoEtico?: Partial<ComportamientoEtico>;
  RiesgosOportunidades?: RiesgoOportunidad[];
  GestionConocimiento?: Partial<GestionConocimiento>;

  created_by: string;
}

// ===== DATOS PARA ACTUALIZAR SECCIÓN (PATCH) =====
export interface UpdateSectionV2Data {
  section:
    | 'IdentidadOrganizacional'
    | 'AlcanceSGC'
    | 'Contexto'
    | 'Estructura'
    | 'Politicas'
    | 'PartesInteresadas'
    | 'CulturaCalidad'
    | 'ComportamientoEtico'
    | 'RiesgosOportunidades'
    | 'GestionConocimiento'
    | 'RevisionesDireccion'
    | 'ConfiguracionISO';

  data: any; // El tipo específico depende de la sección
  updated_by: string;
}

// ===== HELPERS PARA CÁLCULOS =====

/**
 * Calcula el nivel de riesgo basado en probabilidad e impacto
 */
export function calcularNivelRiesgo(
  probabilidad: RiesgoOportunidad['probabilidad'],
  impacto: RiesgoOportunidad['impacto']
): RiesgoOportunidad['nivel_riesgo'] {
  const scoreProb = { muy_baja: 1, baja: 2, media: 3, alta: 4, muy_alta: 5 };
  const scoreImp = { muy_bajo: 1, bajo: 2, medio: 3, alto: 4, muy_alto: 5 };

  const score = scoreProb[probabilidad] * scoreImp[impacto];

  if (score >= 20) return 'critico';
  if (score >= 12) return 'alto';
  if (score >= 6) return 'medio';
  return 'bajo';
}

/**
 * Calcula el porcentaje de progreso de completado
 */
export function calcularProgresoCompletado(
  completado: CompletadoTracking
): number {
  const valores = Object.values(completado);
  const completados = valores.filter(Boolean).length;
  return Math.round((completados / valores.length) * 100);
}
