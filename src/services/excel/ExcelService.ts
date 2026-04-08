/**
 * Excel/XLSX Service
 * Generación y exportación de archivos Excel para MCP
 *
 * Usa SheetJS (xlsx) para generar archivos XLSX sin dependencias nativas
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import { MCPEvidence, MCPStep, MCPTaskExecution } from '@/types/mcp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// Types
// ============================================================================

export interface ExcelExportConfig {
  filename?: string;
  sheetName?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
}

export interface ExcelExportResult {
  success: boolean;
  filename?: string;
  base64?: string;
  mimeType?: string;
  size?: number;
  executionId?: string;
  error?: string;
}

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

// ============================================================================
// CSV/TSV Generation (No dependencies needed)
// ============================================================================

const COLLECTION_EXECUTIONS = 'mcp_executions';

/**
 * Escapa valores para CSV
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Si contiene comas, comillas o saltos de línea, envolver en comillas
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convierte un array de objetos a CSV
 */
export function objectsToCSV(
  data: Record<string, any>[],
  columns?: ExcelColumn[]
): string {
  if (data.length === 0) return '';

  // Determinar columnas
  const cols =
    columns || Object.keys(data[0]).map(key => ({ header: key, key }));

  // Header row
  const headerRow = cols.map(col => escapeCSVValue(col.header)).join(',');

  // Data rows
  const dataRows = data.map(row =>
    cols.map(col => escapeCSVValue(row[col.key])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Genera un archivo XLSX usando formato XML (Office Open XML simplificado)
 * Esta implementación no requiere dependencias externas
 */
export function generateSimpleXLSX(
  data: Record<string, any>[],
  config: ExcelExportConfig = {}
): { base64: string; mimeType: string } {
  const sheetName = config.sheetName || 'Sheet1';

  if (data.length === 0) {
    // Archivo vacío
    return {
      base64: '',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  const columns = Object.keys(data[0]);

  // Generar filas XML
  let rowsXML = '';

  // Header row
  if (config.includeHeaders !== false) {
    rowsXML += '<row>';
    columns.forEach(col => {
      rowsXML += `<c t="inlineStr"><is><t>${escapeXML(col)}</t></is></c>`;
    });
    rowsXML += '</row>';
  }

  // Data rows
  data.forEach(row => {
    rowsXML += '<row>';
    columns.forEach(col => {
      const value = row[col];
      if (typeof value === 'number') {
        rowsXML += `<c><v>${value}</v></c>`;
      } else {
        rowsXML += `<c t="inlineStr"><is><t>${escapeXML(String(value ?? ''))}</t></is></c>`;
      }
    });
    rowsXML += '</row>';
  });

  // Crear estructura XLSX (SpreadsheetML)
  const sheetXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowsXML}</sheetData>
</worksheet>`;

  // Para una implementación completa de XLSX necesitaríamos crear un ZIP con múltiples archivos XML
  // Por ahora, generamos CSV que Excel puede abrir directamente
  const csvContent = objectsToCSV(
    data,
    columns.map(c => ({ header: c, key: c }))
  );
  const base64 = Buffer.from(csvContent, 'utf-8').toString('base64');

  return {
    base64,
    mimeType: 'text/csv', // Excel abre CSV sin problemas
  };
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// MCP Export Functions
// ============================================================================

/**
 * Exporta ejecuciones MCP a formato Excel/CSV
 */
export async function exportExecutionsToExcel(
  organizationId: string,
  userId: string,
  executions: MCPTaskExecution[],
  config: ExcelExportConfig = {}
): Promise<ExcelExportResult> {
  const startTime = Date.now();
  const steps: MCPStep[] = [];

  try {
    steps.push({
      orden: 1,
      accion: 'Preparando datos para exportación',
      resultado: 'ok',
      timestamp: new Date(),
    });

    // Transformar ejecuciones a formato tabular
    const data = executions.map(exec => ({
      ID: exec.id,
      Fecha: formatDate(exec.created_at),
      Tipo: exec.tipo,
      Sistema: exec.sistema_origen,
      Estado: exec.estado,
      'Duración (ms)': exec.duracion_ms,
      'Pasos Ejecutados': exec.log_pasos?.length || 0,
      Evidencias: exec.evidencias?.length || 0,
      URL: exec.url_origen || '',
    }));

    steps.push({
      orden: 2,
      accion: `Generando archivo con ${data.length} registros`,
      resultado: 'ok',
      timestamp: new Date(),
    });

    // Generar archivo
    const result = generateSimpleXLSX(data, {
      sheetName: config.sheetName || 'Ejecuciones MCP',
      includeHeaders: true,
    });

    const filename = config.filename || `mcp_export_${Date.now()}.csv`;

    steps.push({
      orden: 3,
      accion: 'Archivo generado exitosamente',
      resultado: 'ok',
      timestamp: new Date(),
      duracion_ms: Date.now() - startTime,
    });

    // Registrar ejecución
    const executionResult = await registerExcelExecution({
      organization_id: organizationId,
      user_id: userId,
      tipo: 'extraccion',
      sistema_origen: 'Excel Export',
      url_origen: `local://${filename}`,
      estado: 'exitoso',
      duracion_ms: Date.now() - startTime,
      log_pasos: steps,
    });

    return {
      success: true,
      filename,
      base64: result.base64,
      mimeType: result.mimeType,
      size: Buffer.from(result.base64, 'base64').length,
      executionId: executionResult.execution_id,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await registerExcelExecution({
      organization_id: organizationId,
      user_id: userId,
      tipo: 'extraccion',
      sistema_origen: 'Excel Export',
      url_origen: 'local://error',
      estado: 'fallido',
      duracion_ms: Date.now() - startTime,
      log_pasos: [
        ...steps,
        {
          orden: steps.length + 1,
          accion: 'Error en generación',
          resultado: 'error',
          error_mensaje: errorMsg,
          timestamp: new Date(),
        },
      ],
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Genera un archivo Excel/CSV a partir de datos genéricos
 */
export function generateExcelFromData(
  data: Record<string, any>[],
  config: ExcelExportConfig = {}
): ExcelExportResult {
  try {
    const result = generateSimpleXLSX(data, config);
    const filename = config.filename || `export_${Date.now()}.csv`;

    return {
      success: true,
      filename,
      base64: result.base64,
      mimeType: result.mimeType,
      size: Buffer.from(result.base64, 'base64').length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(date: any): string {
  if (!date) return '';
  const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

async function registerExcelExecution(params: {
  organization_id: string;
  user_id: string;
  tipo: 'extraccion' | 'carga_datos';
  sistema_origen: string;
  url_origen: string;
  estado: 'exitoso' | 'fallido';
  duracion_ms: number;
  log_pasos: MCPStep[];
}): Promise<{ execution_id: string }> {
  const db = getAdminFirestore();

  const executionData = {
    organization_id: params.organization_id,
    user_id: params.user_id,
    tipo: params.tipo,
    sistema_origen: params.sistema_origen,
    url_origen: params.url_origen,
    estado: params.estado,
    duracion_ms: params.duracion_ms,
    log_pasos: params.log_pasos.map((step, idx) => ({
      ...step,
      orden: step.orden ?? idx + 1,
      timestamp: Timestamp.now(),
    })),
    evidencias: [] as MCPEvidence[],
    created_at: FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection(COLLECTION_EXECUTIONS).add(executionData);
  return { execution_id: docRef.id };
}
