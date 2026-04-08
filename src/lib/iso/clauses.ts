/**
 * Diccionario centralizado de Cláusulas ISO 9001:2015
 */

export const ISO_CLAUSES = {
  // 4. Contexto de la organización
  '4.1': 'Comprensión de la organización y de su contexto',
  '4.2':
    'Comprensión de las necesidades y expectativas de las partes interesadas',
  '4.3': 'Determinación del alcance del sistema de gestión de la calidad',
  '4.4': 'Sistema de gestión de la calidad y sus procesos',

  // 5. Liderazgo
  '5.1': 'Liderazgo y compromiso',
  '5.1.1': 'Generalidades',
  '5.1.2': 'Enfoque al cliente',
  '5.2': 'Política',
  '5.2.1': 'Establecimiento de la política de la calidad',
  '5.2.2': 'Comunicación de la política de la calidad',
  '5.3': 'Roles, responsabilidades y autoridades en la organización',

  // 6. Planificación
  '6.1': 'Acciones para abordar riesgos y oportunidades',
  '6.2': 'Objetivos de la calidad y planificación para lograrlos',
  '6.3': 'Planificación de los cambios',

  // 7. Apoyo
  '7.1': 'Recursos',
  '7.1.2': 'Personas',
  '7.1.3': 'Infraestructura',
  '7.1.4': 'Ambiente para la operación de los procesos',
  '7.1.5': 'Recursos de seguimiento y medición',
  '7.1.6': 'Conocimientos de la organización',
  '7.2': 'Competencia',
  '7.3': 'Toma de conciencia',
  '7.4': 'Comunicación',
  '7.5': 'Información documentada',
  '7.5.1': 'Generalidades',
  '7.5.2': 'Creación y actualización',
  '7.5.3': 'Control de la información documentada',

  // 8. Operación
  '8.1': 'Planificación y control operacional',
  '8.2': 'Requisitos para los productos y servicios',
  '8.3': 'Diseño y desarrollo de los productos y servicios',
  '8.4':
    'Control de los procesos, productos y servicios suministrados externamente',
  '8.5': 'Producción y provisión del servicio',
  '8.6': 'Liberación de los productos y servicios',
  '8.7': 'Control de las salidas no conformes',

  // 9. Evaluación del desempeño
  '9.1': 'Seguimiento, medición, análisis y evaluación',
  '9.1.2': 'Satisfacción del cliente',
  '9.1.3': 'Análisis y evaluación',
  '9.2': 'Auditoría interna',
  '9.3': 'Revisión por la dirección',

  // 10. Mejora
  '10.1': 'Generalidades',
  '10.2': 'No conformidad y acción correctiva',
  '10.3': 'Mejora continua',
} as const;

export type IsoClauseKey = keyof typeof ISO_CLAUSES;

/**
 * Obtiene la etiqueta completa de una cláusula
 * @param key Clave de la cláusula (ej: '4.1')
 * @returns String formateado "ISO 9001:2015 – Cláusula X: Nombre"
 */
export function getClauseLabel(key: string): string {
  const name = ISO_CLAUSES[key as IsoClauseKey];
  if (!name) return `ISO 9001:2015 – Cláusula ${key}`;
  return `ISO 9001:2015 – Cláusula ${key}: ${name}`;
}
