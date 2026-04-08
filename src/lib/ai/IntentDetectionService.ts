/**
 * Servicio de Detección de Intenciones Avanzado
 * Detecta intenciones del usuario con contexto y confianza
 */

export type IntentType =
  | 'audit_query'
  | 'document_search'
  | 'user_management'
  | 'calendar_event'
  | 'quality_metric'
  | 'process_definition'
  | 'report_generation'
  | 'data_analysis'
  | 'compliance_check'
  | 'general_question';

export interface DetectedIntent {
  type: IntentType;
  confidence: number; // 0-1
  keywords: string[];
  context: Record<string, any>;
  suggestedAction?: string;
}

export class IntentDetectionService {
  /**
   * Detectar intención del usuario
   */
  static detectIntent(message: string, userContext?: any): DetectedIntent {
    const messageLower = message.toLowerCase();
    const keywords = this.extractKeywords(messageLower);

    // Detectar intención basada en palabras clave
    if (this.matchesAuditIntent(messageLower, keywords)) {
      return {
        type: 'audit_query',
        confidence: this.calculateConfidence(messageLower, [
          'audit',
          'auditoría',
          'hallazgo',
          'no conformidad',
        ]),
        keywords: keywords.filter(k =>
          ['audit', 'auditoría', 'hallazgo', 'no conformidad'].includes(k)
        ),
        context: { module: 'audits' },
        suggestedAction: 'Buscar auditorías o hallazgos',
      };
    }

    if (this.matchesDocumentIntent(messageLower, keywords)) {
      return {
        type: 'document_search',
        confidence: this.calculateConfidence(messageLower, [
          'documento',
          'archivo',
          'pdf',
          'buscar',
        ]),
        keywords: keywords.filter(k =>
          ['documento', 'archivo', 'pdf', 'buscar'].includes(k)
        ),
        context: { module: 'documents' },
        suggestedAction: 'Buscar documentos',
      };
    }

    if (this.matchesUserIntent(messageLower, keywords)) {
      return {
        type: 'user_management',
        confidence: this.calculateConfidence(messageLower, [
          'usuario',
          'empleado',
          'personal',
          'rol',
        ]),
        keywords: keywords.filter(k =>
          ['usuario', 'empleado', 'personal', 'rol'].includes(k)
        ),
        context: { module: 'users' },
        suggestedAction: 'Gestionar usuarios',
      };
    }

    if (this.matchesCalendarIntent(messageLower, keywords)) {
      return {
        type: 'calendar_event',
        confidence: this.calculateConfidence(messageLower, [
          'evento',
          'reunión',
          'calendario',
          'fecha',
        ]),
        keywords: keywords.filter(k =>
          ['evento', 'reunión', 'calendario', 'fecha'].includes(k)
        ),
        context: { module: 'calendar' },
        suggestedAction: 'Gestionar eventos',
      };
    }

    if (this.matchesQualityIntent(messageLower, keywords)) {
      return {
        type: 'quality_metric',
        confidence: this.calculateConfidence(messageLower, [
          'calidad',
          'métrica',
          'indicador',
          'objetivo',
        ]),
        keywords: keywords.filter(k =>
          ['calidad', 'métrica', 'indicador', 'objetivo'].includes(k)
        ),
        context: { module: 'quality' },
        suggestedAction: 'Ver métricas de calidad',
      };
    }

    if (this.matchesProcessIntent(messageLower, keywords)) {
      return {
        type: 'process_definition',
        confidence: this.calculateConfidence(messageLower, [
          'proceso',
          'procedimiento',
          'flujo',
          'etapa',
        ]),
        keywords: keywords.filter(k =>
          ['proceso', 'procedimiento', 'flujo', 'etapa'].includes(k)
        ),
        context: { module: 'processes' },
        suggestedAction: 'Ver procesos',
      };
    }

    if (this.matchesReportIntent(messageLower, keywords)) {
      return {
        type: 'report_generation',
        confidence: this.calculateConfidence(messageLower, [
          'reporte',
          'informe',
          'exportar',
          'generar',
        ]),
        keywords: keywords.filter(k =>
          ['reporte', 'informe', 'exportar', 'generar'].includes(k)
        ),
        context: { module: 'reports' },
        suggestedAction: 'Generar reporte',
      };
    }

    if (this.matchesAnalysisIntent(messageLower, keywords)) {
      return {
        type: 'data_analysis',
        confidence: this.calculateConfidence(messageLower, [
          'análisis',
          'estadística',
          'tendencia',
          'comparar',
        ]),
        keywords: keywords.filter(k =>
          ['análisis', 'estadística', 'tendencia', 'comparar'].includes(k)
        ),
        context: { module: 'analytics' },
        suggestedAction: 'Analizar datos',
      };
    }

    if (this.matchesComplianceIntent(messageLower, keywords)) {
      return {
        type: 'compliance_check',
        confidence: this.calculateConfidence(messageLower, [
          'cumplimiento',
          'conformidad',
          'iso',
          'requisito',
        ]),
        keywords: keywords.filter(k =>
          ['cumplimiento', 'conformidad', 'iso', 'requisito'].includes(k)
        ),
        context: { module: 'compliance' },
        suggestedAction: 'Verificar cumplimiento',
      };
    }

    // Intención por defecto
    return {
      type: 'general_question',
      confidence: 0.5,
      keywords,
      context: {},
      suggestedAction: 'Responder pregunta general',
    };
  }

  /**
   * Extraer palabras clave del mensaje
   */
  private static extractKeywords(message: string): string[] {
    const stopWords = new Set([
      'el',
      'la',
      'de',
      'que',
      'y',
      'a',
      'en',
      'un',
      'es',
      'se',
      'no',
      'por',
      'con',
      'su',
      'para',
      'es',
      'al',
      'lo',
      'como',
      'más',
      'o',
      'pero',
      'sus',
      'le',
      'ya',
      'o',
      'este',
      'sí',
      'porque',
      'esta',
      'son',
      'entre',
      'está',
      'cuando',
      'muy',
      'sin',
      'sobre',
      'ser',
      'tiene',
      'también',
      'me',
      'hasta',
      'hay',
      'donde',
      'han',
      'quien',
      'están',
      'estado',
      'desde',
      'todo',
      'nos',
      'durante',
      'estados',
      'todos',
      'uno',
      'les',
      'ni',
      'contra',
      'otros',
      'fueron',
      'ese',
      'eso',
      'había',
      'ante',
      'ellos',
      'e',
      'esto',
      'mí',
      'antes',
      'algunos',
      'qué',
      'unos',
      'yo',
      'otro',
      'otras',
      'otra',
      'él',
      'tanto',
      'esa',
      'estos',
      'mucho',
      'quienes',
      'nada',
      'muchos',
      'cual',
      'sea',
      'poco',
      'ella',
      'estar',
      'haber',
      'estas',
      'estaba',
      'estamos',
      'algunas',
      'algo',
      'nosotros',
      'mi',
      'mis',
      'tú',
      'te',
      'ti',
      'tu',
      'tus',
      'ellas',
      'nosotras',
      'vosotros',
      'vosotras',
      'os',
      'mío',
      'mía',
      'míos',
      'mías',
      'tuyo',
      'tuya',
      'tuyos',
      'tuyas',
      'suyo',
      'suya',
      'suyos',
      'suyas',
      'nuestro',
      'nuestra',
      'nuestros',
      'nuestras',
      'vuestro',
      'vuestra',
      'vuestros',
      'vuestras',
      'esos',
      'esas',
      'estoy',
      'estás',
      'estamos',
      'estáis',
      'están',
      'estaba',
      'estabas',
      'estábamos',
      'estabais',
      'estaban',
      'estuve',
      'estuviste',
      'estuvo',
      'estuvimos',
      'estuvisteis',
      'estuvieron',
      'estaré',
      'estarás',
      'estará',
      'estaremos',
      'estaréis',
      'estarán',
      'estaría',
      'estarías',
      'estaríamos',
      'estaríais',
      'estarían',
      'esté',
      'estés',
      'estemos',
      'estéis',
      'estén',
      'estuviera',
      'estuvieras',
      'estuviéramos',
      'estuvierais',
      'estuvieran',
      'estuviese',
      'estuvieses',
      'estuviésemos',
      'estuvieseis',
      'estuviesen',
      'estando',
      'estado',
      'estada',
      'estados',
      'estadas',
      'estad',
    ]);

    const words = message
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/[^\w]/g, ''));

    return [...new Set(words)];
  }

  /**
   * Calcular confianza de la intención
   */
  private static calculateConfidence(
    message: string,
    keywords: string[]
  ): number {
    let matches = 0;
    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        matches++;
      }
    }
    return Math.min(0.95, 0.5 + (matches / keywords.length) * 0.45);
  }

  /**
   * Verificar si coincide con intención de auditoría
   */
  private static matchesAuditIntent(
    message: string,
    keywords: string[]
  ): boolean {
    const auditKeywords = [
      'audit',
      'auditoría',
      'hallazgo',
      'no conformidad',
      'nc',
      'acción correctiva',
    ];
    return auditKeywords.some(k => message.includes(k));
  }

  /**
   * Verificar si coincide con intención de documento
   */
  private static matchesDocumentIntent(
    message: string,
    keywords: string[]
  ): boolean {
    const docKeywords = [
      'documento',
      'archivo',
      'pdf',
      'buscar',
      'compartir',
      'exportar',
    ];
    return docKeywords.some(k => message.includes(k));
  }

  /**
   * Verificar si coincide con intención de usuario
   */
  private static matchesUserIntent(
    message: string,
    keywords: string[]
  ): boolean {
    const userKeywords = [
      'usuario',
      'empleado',
      'personal',
      'rol',
      'permiso',
      'acceso',
    ];
    return userKeywords.some(k => message.includes(k));
  }

  /**
   * Verificar si coincide con intención de calendario
   */
  private static matchesCalendarIntent(
    message: string,
    keywords: string[]
  ): boolean {
    const calKeywords = [
      'evento',
      'reunión',
      'calendario',
      'fecha',
      'hora',
      'agendar',
    ];
    return calKeywords.some(k => message.includes(k));
  }

  /**
   * Verificar si coincide con intención de calidad
   */
  private static matchesQualityIntent(
    message: string,
    keywords: string[]
  ): boolean {
    const qualityKeywords = [
      'calidad',
      'métrica',
      'indicador',
      'objetivo',
      'kpi',
      'medición',
    ];
    return qualityKeywords.some(k => message.includes(k));
  }

  /**
   * Verificar si coincide con intención de proceso
   */
  private static matchesProcessIntent(
    message: string,
    keywords: string[]
  ): boolean {
    const processKeywords = [
      'proceso',
      'procedimiento',
      'flujo',
      'etapa',
      'paso',
      'workflow',
    ];
    return processKeywords.some(k => message.includes(k));
  }

  /**
   * Verificar si coincide con intención de reporte
   */
  private static matchesReportIntent(
    message: string,
    keywords: string[]
  ): boolean {
    const reportKeywords = [
      'reporte',
      'informe',
      'exportar',
      'generar',
      'descargar',
      'pdf',
    ];
    return reportKeywords.some(k => message.includes(k));
  }

  /**
   * Verificar si coincide con intención de análisis
   */
  private static matchesAnalysisIntent(
    message: string,
    keywords: string[]
  ): boolean {
    const analysisKeywords = [
      'análisis',
      'estadística',
      'tendencia',
      'comparar',
      'gráfico',
      'datos',
    ];
    return analysisKeywords.some(k => message.includes(k));
  }

  /**
   * Verificar si coincide con intención de cumplimiento
   */
  private static matchesComplianceIntent(
    message: string,
    keywords: string[]
  ): boolean {
    const complianceKeywords = [
      'cumplimiento',
      'conformidad',
      'iso',
      'requisito',
      'norma',
      'estándar',
    ];
    return complianceKeywords.some(k => message.includes(k));
  }

  /**
   * Obtener prompt del sistema basado en intención
   */
  static getSystemPromptForIntent(intent: IntentType): string {
    const prompts: Record<IntentType, string> = {
      audit_query: `Eres un asistente especializado en auditorías ISO 9001. 
        Ayuda al usuario a buscar, analizar y gestionar auditorías, hallazgos y acciones correctivas.
        Proporciona información detallada sobre el estado de las auditorías y recomendaciones.`,

      document_search: `Eres un asistente especializado en gestión de documentos.
        Ayuda al usuario a buscar, compartir y exportar documentos.
        Proporciona información sobre versiones, permisos y acceso a documentos.`,

      user_management: `Eres un asistente especializado en gestión de usuarios.
        Ayuda al usuario a gestionar perfiles, roles, permisos y acceso.
        Proporciona información sobre usuarios, departamentos y competencias.`,

      calendar_event: `Eres un asistente especializado en gestión de calendario.
        Ayuda al usuario a crear, modificar y gestionar eventos y reuniones.
        Proporciona información sobre disponibilidad y sincronización de calendarios.`,

      quality_metric: `Eres un asistente especializado en métricas de calidad.
        Ayuda al usuario a analizar indicadores, objetivos y mediciones de calidad.
        Proporciona información sobre KPIs y tendencias de calidad.`,

      process_definition: `Eres un asistente especializado en procesos.
        Ayuda al usuario a entender, documentar y mejorar procesos.
        Proporciona información sobre flujos, etapas y procedimientos.`,

      report_generation: `Eres un asistente especializado en generación de reportes.
        Ayuda al usuario a crear, personalizar y exportar reportes.
        Proporciona información sobre datos, gráficos y análisis.`,

      data_analysis: `Eres un asistente especializado en análisis de datos.
        Ayuda al usuario a analizar tendencias, comparar datos y extraer insights.
        Proporciona información sobre estadísticas y patrones.`,

      compliance_check: `Eres un asistente especializado en cumplimiento normativo.
        Ayuda al usuario a verificar conformidad con ISO 9001 y otros estándares.
        Proporciona información sobre requisitos y recomendaciones de cumplimiento.`,

      general_question: `Eres un asistente inteligente para la gestión de calidad ISO 9001.
        Ayuda al usuario con preguntas generales sobre auditorías, documentos, usuarios, calendarios y más.
        Proporciona respuestas útiles y precisas basadas en el contexto.`,
    };

    return prompts[intent];
  }
}
