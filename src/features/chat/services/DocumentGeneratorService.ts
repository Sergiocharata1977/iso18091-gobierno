// ============================================
// SERVICIO DE GENERACIÓN DE DOCUMENTOS ISO
// ============================================
// Templates para generar documentos del SGC con ayuda de IA

export interface DocumentTemplate {
  id: string;
  nombre: string;
  tipoDocumento:
    | 'politica'
    | 'procedimiento'
    | 'instructivo'
    | 'formato'
    | 'manual';
  descripcion: string;
  clausulasISO: string[];
  camposRequeridos: TemplateField[];
  promptIA: string;
  ejemploContenido?: string;
}

export interface TemplateField {
  id: string;
  nombre: string;
  tipo: 'texto' | 'textarea' | 'select' | 'lista';
  placeholder?: string;
  opciones?: string[];
  requerido: boolean;
}

export interface GeneratedDocument {
  titulo: string;
  contenido: string;
  tipoDocumento: string;
  clausulasISO: string[];
  fechaGeneracion: Date;
}

/**
 * Servicio para generar documentos del SGC con ayuda de IA
 */
export class DocumentGeneratorService {
  /**
   * Templates disponibles para generar documentos
   */
  static readonly TEMPLATES: DocumentTemplate[] = [
    {
      id: 'politica-calidad',
      nombre: 'Política de Calidad',
      tipoDocumento: 'politica',
      descripcion:
        'Declaración del compromiso de la organización con la calidad',
      clausulasISO: ['5.2'],
      camposRequeridos: [
        {
          id: 'nombreOrg',
          nombre: 'Nombre de la organización',
          tipo: 'texto',
          requerido: true,
        },
        {
          id: 'actividad',
          nombre: 'Actividad principal de la organización',
          tipo: 'textarea',
          placeholder: 'Ej: Fabricación de productos alimenticios',
          requerido: true,
        },
        {
          id: 'compromiso1',
          nombre: 'Compromiso principal',
          tipo: 'texto',
          placeholder: 'Ej: Satisfacer las necesidades del cliente',
          requerido: true,
        },
        {
          id: 'compromiso2',
          nombre: 'Segundo compromiso',
          tipo: 'texto',
          placeholder: 'Ej: Mejorar continuamente nuestros procesos',
          requerido: false,
        },
        {
          id: 'compromiso3',
          nombre: 'Tercer compromiso',
          tipo: 'texto',
          placeholder: 'Ej: Cumplir con los requisitos legales',
          requerido: false,
        },
      ],
      promptIA: `Genera una Política de Calidad profesional para {{nombreOrg}}, una organización dedicada a {{actividad}}.

La política debe:
1. Ser breve (máximo 150 palabras)
2. Incluir los compromisos: {{compromiso1}}, {{compromiso2}}, {{compromiso3}}
3. Mencionar la mejora continua
4. Ser adecuada para ISO 9001:2015
5. Terminar con la firma del responsable

Formato: texto plano sin encabezados.`,
      ejemploContenido: `En [NOMBRE ORGANIZACIÓN], nos comprometemos a:

• Satisfacer las necesidades y expectativas de nuestros clientes
• Cumplir con los requisitos legales y reglamentarios aplicables
• Mejorar continuamente la eficacia de nuestro Sistema de Gestión de Calidad
• Proporcionar los recursos necesarios para el logro de nuestros objetivos

Esta política es comunicada y entendida por todo el personal y está disponible para las partes interesadas.

Firma: _____________________
Representante de la Dirección
Fecha: ____________________`,
    },
    {
      id: 'procedimiento-control-documentos',
      nombre: 'Procedimiento de Control de Documentos',
      tipoDocumento: 'procedimiento',
      descripcion: 'Define cómo se controlan los documentos del SGC',
      clausulasISO: ['7.5'],
      camposRequeridos: [
        {
          id: 'nombreOrg',
          nombre: 'Nombre de la organización',
          tipo: 'texto',
          requerido: true,
        },
        {
          id: 'responsable',
          nombre: 'Responsable del control documental',
          tipo: 'texto',
          placeholder: 'Ej: Coordinador de Calidad',
          requerido: true,
        },
        {
          id: 'ubicacion',
          nombre: 'Ubicación de documentos',
          tipo: 'select',
          opciones: [
            'Servidor interno',
            'Sistema 9001 App',
            'Carpetas físicas',
            'Nube (Google Drive, SharePoint)',
          ],
          requerido: true,
        },
      ],
      promptIA: `Genera un Procedimiento de Control de Documentos para {{nombreOrg}}.

Responsable: {{responsable}}
Ubicación de documentos: {{ubicacion}}

Incluir secciones:
1. OBJETIVO
2. ALCANCE
3. RESPONSABILIDADES
4. DESARROLLO (pasos para crear, revisar, aprobar, distribuir y controlar documentos)
5. REGISTROS

Formato profesional con numeración.`,
    },
    {
      id: 'procedimiento-auditorias',
      nombre: 'Procedimiento de Auditorías Internas',
      tipoDocumento: 'procedimiento',
      descripcion:
        'Define cómo se planifican y ejecutan las auditorías internas',
      clausulasISO: ['9.2'],
      camposRequeridos: [
        {
          id: 'nombreOrg',
          nombre: 'Nombre de la organización',
          tipo: 'texto',
          requerido: true,
        },
        {
          id: 'frecuencia',
          nombre: 'Frecuencia de auditorías',
          tipo: 'select',
          opciones: ['Anual', 'Semestral', 'Trimestral'],
          requerido: true,
        },
        {
          id: 'responsableAuditoria',
          nombre: 'Responsable del programa de auditorías',
          tipo: 'texto',
          requerido: true,
        },
      ],
      promptIA: `Genera un Procedimiento de Auditorías Internas para {{nombreOrg}}.

Frecuencia: {{frecuencia}}
Responsable del programa: {{responsableAuditoria}}

Incluir:
1. OBJETIVO
2. ALCANCE
3. DEFINICIONES (auditoría, auditor, hallazgo, no conformidad)
4. RESPONSABILIDADES
5. DESARROLLO
   - Programación anual
   - Preparación de la auditoría
   - Ejecución
   - Informe
   - Seguimiento de hallazgos
6. REGISTROS`,
    },
    {
      id: 'procedimiento-acciones-correctivas',
      nombre: 'Procedimiento de Acciones Correctivas',
      tipoDocumento: 'procedimiento',
      descripcion: 'Define cómo se gestionan las acciones correctivas',
      clausulasISO: ['10.2'],
      camposRequeridos: [
        {
          id: 'nombreOrg',
          nombre: 'Nombre de la organización',
          tipo: 'texto',
          requerido: true,
        },
        {
          id: 'plazoMaximo',
          nombre: 'Plazo máximo para cierre (días)',
          tipo: 'texto',
          placeholder: 'Ej: 30',
          requerido: true,
        },
        {
          id: 'responsable',
          nombre: 'Responsable de seguimiento',
          tipo: 'texto',
          requerido: true,
        },
      ],
      promptIA: `Genera un Procedimiento de Acciones Correctivas para {{nombreOrg}}.

Plazo máximo de cierre: {{plazoMaximo}} días
Responsable de seguimiento: {{responsable}}

Incluir:
1. OBJETIVO
2. ALCANCE
3. DEFINICIONES (no conformidad, acción correctiva, causa raíz)
4. RESPONSABILIDADES
5. DESARROLLO
   - Identificación de no conformidades
   - Análisis de causa raíz (mencionar técnicas: 5 Por qué, Ishikawa)
   - Definición de acciones
   - Implementación
   - Verificación de eficacia
   - Cierre
6. REGISTROS`,
    },
    {
      id: 'formato-acta-reunion',
      nombre: 'Formato de Acta de Reunión',
      tipoDocumento: 'formato',
      descripcion: 'Plantilla para registrar reuniones del SGC',
      clausulasISO: ['7.5', '9.3'],
      camposRequeridos: [
        {
          id: 'nombreOrg',
          nombre: 'Nombre de la organización',
          tipo: 'texto',
          requerido: true,
        },
      ],
      promptIA: `Genera un formato de Acta de Reunión para {{nombreOrg}}.

Debe incluir campos para:
- Fecha y hora
- Lugar
- Tipo de reunión
- Participantes (nombre, cargo, firma)
- Orden del día
- Desarrollo de temas
- Acuerdos y compromisos (responsable, fecha límite)
- Firma del responsable

Formato de tabla con espacios para completar.`,
    },
    {
      id: 'objetivos-calidad',
      nombre: 'Objetivos de Calidad',
      tipoDocumento: 'politica',
      descripcion: 'Definición de objetivos SMART para el SGC',
      clausulasISO: ['6.2'],
      camposRequeridos: [
        {
          id: 'nombreOrg',
          nombre: 'Nombre de la organización',
          tipo: 'texto',
          requerido: true,
        },
        {
          id: 'proceso1',
          nombre: 'Proceso 1',
          tipo: 'texto',
          placeholder: 'Ej: Producción',
          requerido: true,
        },
        {
          id: 'proceso2',
          nombre: 'Proceso 2',
          tipo: 'texto',
          placeholder: 'Ej: Ventas',
          requerido: false,
        },
        {
          id: 'proceso3',
          nombre: 'Proceso 3',
          tipo: 'texto',
          placeholder: 'Ej: Atención al cliente',
          requerido: false,
        },
      ],
      promptIA: `Genera una matriz de Objetivos de Calidad para {{nombreOrg}}.

Procesos a considerar: {{proceso1}}, {{proceso2}}, {{proceso3}}

Para cada proceso, definir:
- Objetivo (específico y medible)
- Indicador
- Meta
- Fórmula de cálculo
- Frecuencia de medición
- Responsable

Los objetivos deben ser SMART (específicos, medibles, alcanzables, relevantes, con tiempo).

Formato: tabla markdown.`,
    },
  ];

  /**
   * Obtener todos los templates disponibles
   */
  static getTemplates(): DocumentTemplate[] {
    return this.TEMPLATES;
  }

  /**
   * Obtener template por ID
   */
  static getTemplateById(id: string): DocumentTemplate | undefined {
    return this.TEMPLATES.find(t => t.id === id);
  }

  /**
   * Obtener template por nombre (tolerante a mayúsculas/acentos)
   */
  static getTemplateByName(nombre: string): DocumentTemplate | undefined {
    const normalizedTarget = this.normalizeTemplateLookupKey(nombre);
    if (!normalizedTarget) return undefined;

    return this.TEMPLATES.find(template => {
      return (
        this.normalizeTemplateLookupKey(template.nombre) === normalizedTarget ||
        this.normalizeTemplateLookupKey(template.id) === normalizedTarget
      );
    });
  }

  /**
   * Resolver template por `templateId` o `templateName` manteniendo compatibilidad legacy.
   */
  static resolveTemplate(input: {
    templateId?: string | null;
    templateName?: string | null;
  }): DocumentTemplate | undefined {
    if (input.templateId) {
      const byId = this.getTemplateById(input.templateId);
      if (byId) return byId;
    }

    if (input.templateName) {
      return this.getTemplateByName(input.templateName);
    }

    return undefined;
  }

  /**
   * Generar prompt para IA reemplazando variables
   */
  static generatePrompt(
    templateId: string,
    values: Record<string, string>
  ): string {
    const template = this.getTemplateById(templateId);
    if (!template) return '';

    let prompt = template.promptIA;

    // Reemplazar cada variable {{campo}} con su valor
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      prompt = prompt.replace(regex, value || '');
    });

    // Limpiar variables no reemplazadas
    prompt = prompt.replace(/\{\{[^}]+\}\}/g, '');

    return prompt;
  }

  /**
   * Obtener templates por tipo de documento
   */
  static getTemplatesByType(
    tipo: DocumentTemplate['tipoDocumento']
  ): DocumentTemplate[] {
    return this.TEMPLATES.filter(t => t.tipoDocumento === tipo);
  }

  /**
   * Obtener templates por cláusula ISO
   */
  static getTemplatesByClause(clausula: string): DocumentTemplate[] {
    return this.TEMPLATES.filter(t => t.clausulasISO.includes(clausula));
  }

  /**
   * Contract/version de prompt estructurado utilizado para generación documental por dominio.
   */
  static getPromptContractIdForTemplate(
    _template?: DocumentTemplate
  ): 'iso_document_generation_v1' {
    return 'iso_document_generation_v1';
  }

  /**
   * Inferir tipo documental si solo se dispone de `templateName`.
   */
  static inferDocumentTypeFromTemplateName(
    templateName?: string | null
  ): DocumentTemplate['tipoDocumento'] | undefined {
    if (!templateName) return undefined;

    const normalized = this.normalizeTemplateLookupKey(templateName);
    if (!normalized) return undefined;

    if (normalized.includes('politica')) return 'politica';
    if (normalized.includes('procedimiento')) return 'procedimiento';
    if (normalized.includes('instructivo')) return 'instructivo';
    if (normalized.includes('formato') || normalized.includes('acta'))
      return 'formato';
    if (normalized.includes('manual')) return 'manual';

    return undefined;
  }

  private static normalizeTemplateLookupKey(value?: string | null): string {
    if (!value) return '';

    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
