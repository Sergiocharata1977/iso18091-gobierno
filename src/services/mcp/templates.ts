/**
 * MCP Task Templates
 * Plantillas predefinidas para automatizaciones comunes
 */

import { MCPTaskType } from '@/types/mcp';

// ============================================================================
// Types
// ============================================================================

export interface MCPTaskTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: MCPTaskType;
  categoria: 'facturacion' | 'datos' | 'reportes' | 'integracion' | 'otro';
  sistema_destino: string;
  icono: string; // Lucide icon name
  color: string; // Tailwind color class

  // Configuración
  pasos: MCPTemplateStep[];
  campos_requeridos: MCPTemplateField[];

  // Metadata
  requiere_auth?: boolean;
  tiempo_estimado_ms?: number;
  tags?: string[];
}

export interface MCPTemplateStep {
  orden: number;
  accion: string;
  descripcion?: string;
  tipo:
    | 'navegacion'
    | 'click'
    | 'input'
    | 'select'
    | 'espera'
    | 'extraccion'
    | 'validacion';
  selector?: string;
  campo?: string; // Si es input, referencia a campos_requeridos
}

export interface MCPTemplateField {
  id: string;
  label: string;
  tipo: 'text' | 'number' | 'date' | 'select' | 'file';
  requerido: boolean;
  placeholder?: string;
  opciones?: { value: string; label: string }[];
  validacion?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}

// ============================================================================
// Template Definitions
// ============================================================================

export const MCP_TASK_TEMPLATES: MCPTaskTemplate[] = [
  // =====================
  // Facturación
  // =====================
  {
    id: 'factura-afip',
    nombre: 'Generar Factura AFIP',
    descripcion: 'Genera una factura electrónica en el portal de AFIP',
    tipo: 'facturacion',
    categoria: 'facturacion',
    sistema_destino: 'AFIP',
    icono: 'FileText',
    color: 'blue',
    pasos: [
      { orden: 1, accion: 'Navegar al portal', tipo: 'navegacion' },
      { orden: 2, accion: 'Login con CUIT', tipo: 'input', campo: 'cuit' },
      { orden: 3, accion: 'Seleccionar punto de venta', tipo: 'select' },
      { orden: 4, accion: 'Completar datos cliente', tipo: 'input' },
      { orden: 5, accion: 'Ingresar items', tipo: 'input' },
      { orden: 6, accion: 'Generar comprobante', tipo: 'click' },
      { orden: 7, accion: 'Capturar CAE', tipo: 'extraccion' },
    ],
    campos_requeridos: [
      {
        id: 'cuit',
        label: 'CUIT',
        tipo: 'text',
        requerido: true,
        placeholder: '20-12345678-9',
      },
      {
        id: 'punto_venta',
        label: 'Punto de Venta',
        tipo: 'number',
        requerido: true,
      },
      {
        id: 'cliente_cuit',
        label: 'CUIT Cliente',
        tipo: 'text',
        requerido: true,
      },
      { id: 'monto', label: 'Monto Total', tipo: 'number', requerido: true },
    ],
    requiere_auth: true,
    tiempo_estimado_ms: 30000,
    tags: ['afip', 'factura', 'impuestos'],
  },

  // =====================
  // Datos / Excel
  // =====================
  {
    id: 'export-datos-excel',
    nombre: 'Exportar Datos a Excel',
    descripcion: 'Extrae datos de una tabla web y los exporta a Excel',
    tipo: 'extraccion',
    categoria: 'datos',
    sistema_destino: 'Excel',
    icono: 'FileSpreadsheet',
    color: 'emerald',
    pasos: [
      { orden: 1, accion: 'Navegar a la fuente', tipo: 'navegacion' },
      {
        orden: 2,
        accion: 'Localizar tabla',
        tipo: 'validacion',
        selector: 'table',
      },
      { orden: 3, accion: 'Extraer encabezados', tipo: 'extraccion' },
      { orden: 4, accion: 'Extraer filas', tipo: 'extraccion' },
      { orden: 5, accion: 'Generar archivo Excel', tipo: 'click' },
    ],
    campos_requeridos: [
      {
        id: 'url',
        label: 'URL de la página',
        tipo: 'text',
        requerido: true,
        placeholder: 'https://...',
      },
      {
        id: 'selector_tabla',
        label: 'Selector CSS (opcional)',
        tipo: 'text',
        requerido: false,
        placeholder: 'table.datos',
      },
    ],
    tiempo_estimado_ms: 15000,
    tags: ['excel', 'datos', 'extraccion'],
  },

  {
    id: 'sync-google-sheets',
    nombre: 'Sincronizar con Google Sheets',
    descripcion: 'Copia datos de una tabla a Google Sheets',
    tipo: 'carga_datos',
    categoria: 'integracion',
    sistema_destino: 'Google Sheets',
    icono: 'Sheet',
    color: 'green',
    pasos: [
      { orden: 1, accion: 'Obtener datos origen', tipo: 'extraccion' },
      { orden: 2, accion: 'Conectar a Google', tipo: 'navegacion' },
      { orden: 3, accion: 'Abrir hoja destino', tipo: 'navegacion' },
      { orden: 4, accion: 'Escribir datos', tipo: 'input' },
      { orden: 5, accion: 'Verificar escritura', tipo: 'validacion' },
    ],
    campos_requeridos: [
      {
        id: 'spreadsheet_id',
        label: 'ID o URL de la Hoja',
        tipo: 'text',
        requerido: true,
      },
      {
        id: 'sheet_name',
        label: 'Nombre de Pestaña',
        tipo: 'text',
        requerido: false,
        placeholder: 'Sheet1',
      },
      {
        id: 'rango',
        label: 'Rango',
        tipo: 'text',
        requerido: false,
        placeholder: 'A1:Z',
      },
    ],
    requiere_auth: true,
    tiempo_estimado_ms: 20000,
    tags: ['google', 'sheets', 'sync'],
  },

  // =====================
  // Reportes
  // =====================
  {
    id: 'generar-reporte-pdf',
    nombre: 'Generar Reporte PDF',
    descripcion: 'Genera un reporte en PDF desde datos del sistema',
    tipo: 'otro',
    categoria: 'reportes',
    sistema_destino: 'PDF',
    icono: 'FileDown',
    color: 'rose',
    pasos: [
      { orden: 1, accion: 'Recopilar datos', tipo: 'extraccion' },
      { orden: 2, accion: 'Aplicar plantilla', tipo: 'click' },
      { orden: 3, accion: 'Renderizar PDF', tipo: 'click' },
      { orden: 4, accion: 'Guardar archivo', tipo: 'click' },
    ],
    campos_requeridos: [
      {
        id: 'titulo',
        label: 'Título del Reporte',
        tipo: 'text',
        requerido: true,
      },
      {
        id: 'fecha_desde',
        label: 'Fecha Desde',
        tipo: 'date',
        requerido: false,
      },
      {
        id: 'fecha_hasta',
        label: 'Fecha Hasta',
        tipo: 'date',
        requerido: false,
      },
    ],
    tiempo_estimado_ms: 10000,
    tags: ['pdf', 'reporte', 'documentos'],
  },

  // =====================
  // Formularios
  // =====================
  {
    id: 'completar-formulario',
    nombre: 'Completar Formulario Web',
    descripcion: 'Rellena automáticamente un formulario con datos predefinidos',
    tipo: 'formulario',
    categoria: 'otro',
    sistema_destino: 'Web Form',
    icono: 'ClipboardList',
    color: 'amber',
    pasos: [
      { orden: 1, accion: 'Navegar al formulario', tipo: 'navegacion' },
      { orden: 2, accion: 'Identificar campos', tipo: 'validacion' },
      { orden: 3, accion: 'Rellenar campos', tipo: 'input' },
      { orden: 4, accion: 'Validar datos', tipo: 'validacion' },
      { orden: 5, accion: 'Enviar formulario', tipo: 'click' },
      { orden: 6, accion: 'Capturar confirmación', tipo: 'extraccion' },
    ],
    campos_requeridos: [
      {
        id: 'url_formulario',
        label: 'URL del Formulario',
        tipo: 'text',
        requerido: true,
      },
      {
        id: 'datos_json',
        label: 'Datos (JSON)',
        tipo: 'text',
        requerido: true,
        placeholder: '{"campo1": "valor1"}',
      },
    ],
    tiempo_estimado_ms: 20000,
    tags: ['formulario', 'automatizacion'],
  },

  // =====================
  // Extracción
  // =====================
  {
    id: 'extraer-tabla-web',
    nombre: 'Extraer Tabla de Página Web',
    descripcion:
      'Extrae datos de una tabla HTML y los convierte a formato estructurado',
    tipo: 'extraccion',
    categoria: 'datos',
    sistema_destino: 'Sistema',
    icono: 'Table',
    color: 'indigo',
    pasos: [
      { orden: 1, accion: 'Navegar a la página', tipo: 'navegacion' },
      { orden: 2, accion: 'Esperar carga tabla', tipo: 'espera' },
      { orden: 3, accion: 'Localizar tabla', tipo: 'validacion' },
      { orden: 4, accion: 'Extraer headers', tipo: 'extraccion' },
      { orden: 5, accion: 'Extraer filas', tipo: 'extraccion' },
      { orden: 6, accion: 'Transformar a JSON', tipo: 'click' },
    ],
    campos_requeridos: [
      { id: 'url', label: 'URL de la Página', tipo: 'text', requerido: true },
      {
        id: 'selector',
        label: 'Selector CSS',
        tipo: 'text',
        requerido: false,
        placeholder: 'table, .data-table',
      },
      {
        id: 'incluir_headers',
        label: 'Incluir Encabezados',
        tipo: 'select',
        requerido: true,
        opciones: [
          { value: 'true', label: 'Sí' },
          { value: 'false', label: 'No' },
        ],
      },
    ],
    tiempo_estimado_ms: 10000,
    tags: ['extraccion', 'tabla', 'web', 'datos'],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Obtener todas las plantillas
 */
export function getAllTemplates(): MCPTaskTemplate[] {
  return MCP_TASK_TEMPLATES;
}

/**
 * Obtener plantillas por categoría
 */
export function getTemplatesByCategory(
  categoria: MCPTaskTemplate['categoria']
): MCPTaskTemplate[] {
  return MCP_TASK_TEMPLATES.filter(t => t.categoria === categoria);
}

/**
 * Obtener una plantilla por ID
 */
export function getTemplateById(id: string): MCPTaskTemplate | undefined {
  return MCP_TASK_TEMPLATES.find(t => t.id === id);
}

/**
 * Buscar plantillas por término
 */
export function searchTemplates(query: string): MCPTaskTemplate[] {
  const q = query.toLowerCase();
  return MCP_TASK_TEMPLATES.filter(
    t =>
      t.nombre.toLowerCase().includes(q) ||
      t.descripcion.toLowerCase().includes(q) ||
      t.tags?.some(tag => tag.toLowerCase().includes(q))
  );
}

/**
 * Obtener categorías disponibles
 */
export function getCategories(): { id: string; label: string; icon: string }[] {
  return [
    { id: 'facturacion', label: 'Facturación', icon: 'FileText' },
    { id: 'datos', label: 'Datos', icon: 'Database' },
    { id: 'reportes', label: 'Reportes', icon: 'BarChart' },
    { id: 'integracion', label: 'Integración', icon: 'Plug' },
    { id: 'otro', label: 'Otros', icon: 'MoreHorizontal' },
  ];
}
