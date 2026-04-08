/**
 * Google Sheets Service
 * Integración MCP con Google Sheets API v4
 *
 * Usa service account credentials para autenticación server-side
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import { MCPEvidence, MCPStep, MCPTaskExecution } from '@/types/mcp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// Types
// ============================================================================

export interface SheetExportConfig {
  spreadsheetId: string;
  sheetName?: string;
  range?: string; // e.g., "A1:Z1000"
  includeHeaders?: boolean;
}

export interface SheetWriteRequest {
  organization_id: string;
  user_id: string;
  spreadsheetId: string;
  sheetName: string;
  range: string;
  values: (string | number | boolean)[][];
  append?: boolean; // If true, append rows instead of overwrite
}

export interface SheetReadRequest {
  organization_id: string;
  user_id: string;
  spreadsheetId: string;
  sheetName: string;
  range: string;
}

export interface SheetExportResult {
  success: boolean;
  rowsWritten?: number;
  range?: string;
  executionId?: string;
  error?: string;
}

export interface SheetReadResult {
  success: boolean;
  values?: (string | number | boolean)[][];
  rows?: number;
  columns?: number;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

const COLLECTION_EXECUTIONS = 'mcp_executions';
const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Gets Google OAuth2 access token using service account
 * Requires GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY env vars
 */
async function getGoogleAccessToken(): Promise<string> {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Google service account credentials not configured');
  }

  // Create JWT for service account
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  // Sign JWT (using Web Crypto API for Edge compatibility)
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import private key
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get Google access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Read data from a Google Sheet
 */
export async function readFromSheet(
  request: SheetReadRequest
): Promise<SheetReadResult> {
  const startTime = Date.now();
  const steps: MCPStep[] = [];

  try {
    // Step 1: Get access token
    steps.push({
      orden: 1,
      accion: 'Obteniendo token de acceso Google',
      resultado: 'ok',
      timestamp: new Date(),
    });

    const accessToken = await getGoogleAccessToken();

    // Step 2: Build request
    const range = request.sheetName
      ? `${request.sheetName}!${request.range}`
      : request.range;

    const url = `${GOOGLE_SHEETS_API_BASE}/${request.spreadsheetId}/values/${encodeURIComponent(range)}`;

    steps.push({
      orden: 2,
      accion: `Leyendo rango: ${range}`,
      resultado: 'ok',
      timestamp: new Date(),
    });

    // Step 3: Make request
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      steps.push({
        orden: 3,
        accion: 'Error en lectura',
        resultado: 'error',
        error_mensaje: error,
        timestamp: new Date(),
      });
      throw new Error(`Sheets API error: ${error}`);
    }

    const data = await response.json();
    const values = data.values || [];

    steps.push({
      orden: 3,
      accion: `Lectura exitosa: ${values.length} filas`,
      resultado: 'ok',
      timestamp: new Date(),
      duracion_ms: Date.now() - startTime,
    });

    // Register execution
    await registerSheetExecution({
      organization_id: request.organization_id,
      user_id: request.user_id,
      tipo: 'extraccion',
      sistema_origen: 'Google Sheets',
      url_origen: `https://docs.google.com/spreadsheets/d/${request.spreadsheetId}`,
      estado: 'exitoso',
      duracion_ms: Date.now() - startTime,
      log_pasos: steps,
    });

    return {
      success: true,
      values,
      rows: values.length,
      columns: values[0]?.length || 0,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await registerSheetExecution({
      organization_id: request.organization_id,
      user_id: request.user_id,
      tipo: 'extraccion',
      sistema_origen: 'Google Sheets',
      url_origen: `https://docs.google.com/spreadsheets/d/${request.spreadsheetId}`,
      estado: 'fallido',
      duracion_ms: Date.now() - startTime,
      log_pasos: [
        ...steps,
        {
          orden: steps.length + 1,
          accion: 'Error general',
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
 * Write data to a Google Sheet
 */
export async function writeToSheet(
  request: SheetWriteRequest
): Promise<SheetExportResult> {
  const startTime = Date.now();
  const steps: MCPStep[] = [];

  try {
    // Step 1: Get access token
    steps.push({
      orden: 1,
      accion: 'Obteniendo token de acceso Google',
      resultado: 'ok',
      timestamp: new Date(),
    });

    const accessToken = await getGoogleAccessToken();

    // Step 2: Build request
    const range = `${request.sheetName}!${request.range}`;
    const method = request.append ? 'append' : 'update';

    const url = request.append
      ? `${GOOGLE_SHEETS_API_BASE}/${request.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
      : `${GOOGLE_SHEETS_API_BASE}/${request.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

    steps.push({
      orden: 2,
      accion: `${request.append ? 'Agregando' : 'Escribiendo'} ${request.values.length} filas en ${range}`,
      resultado: 'ok',
      timestamp: new Date(),
    });

    // Step 3: Make request
    const response = await fetch(url, {
      method: request.append ? 'POST' : 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: request.values,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      steps.push({
        orden: 3,
        accion: 'Error en escritura',
        resultado: 'error',
        error_mensaje: error,
        timestamp: new Date(),
      });
      throw new Error(`Sheets API error: ${error}`);
    }

    const data = await response.json();
    const updatedRange = data.updatedRange || data.tableRange || range;
    const rowsWritten =
      data.updatedRows || data.updates?.updatedRows || request.values.length;

    steps.push({
      orden: 3,
      accion: `Escritura exitosa: ${rowsWritten} filas`,
      resultado: 'ok',
      timestamp: new Date(),
      duracion_ms: Date.now() - startTime,
    });

    // Register execution
    const executionResult = await registerSheetExecution({
      organization_id: request.organization_id,
      user_id: request.user_id,
      tipo: 'carga_datos',
      sistema_origen: 'Google Sheets',
      url_origen: `https://docs.google.com/spreadsheets/d/${request.spreadsheetId}`,
      estado: 'exitoso',
      duracion_ms: Date.now() - startTime,
      log_pasos: steps,
    });

    return {
      success: true,
      rowsWritten,
      range: updatedRange,
      executionId: executionResult.execution_id,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await registerSheetExecution({
      organization_id: request.organization_id,
      user_id: request.user_id,
      tipo: 'carga_datos',
      sistema_origen: 'Google Sheets',
      url_origen: `https://docs.google.com/spreadsheets/d/${request.spreadsheetId}`,
      estado: 'fallido',
      duracion_ms: Date.now() - startTime,
      log_pasos: [
        ...steps,
        {
          orden: steps.length + 1,
          accion: 'Error general',
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
 * Export MCP executions to a Google Sheet (reporting feature)
 */
export async function exportExecutionsToSheet(
  organizationId: string,
  userId: string,
  config: SheetExportConfig,
  executions: MCPTaskExecution[]
): Promise<SheetExportResult> {
  // Transform executions to sheet rows
  const headers = [
    'ID',
    'Fecha',
    'Tipo',
    'Sistema Origen',
    'Estado',
    'Duración (ms)',
    'Pasos',
    'URL Origen',
  ];

  const rows = executions.map(exec => [
    exec.id,
    exec.created_at instanceof Date
      ? exec.created_at.toISOString()
      : new Date((exec.created_at as any).seconds * 1000).toISOString(),
    exec.tipo,
    exec.sistema_origen,
    exec.estado,
    exec.duracion_ms,
    exec.log_pasos?.length || 0,
    exec.url_origen || '',
  ]);

  const values = config.includeHeaders !== false ? [headers, ...rows] : rows;

  return writeToSheet({
    organization_id: organizationId,
    user_id: userId,
    spreadsheetId: config.spreadsheetId,
    sheetName: config.sheetName || 'MCP Executions',
    range: config.range || 'A1',
    values: values as (string | number | boolean)[][],
    append: false,
  });
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function registerSheetExecution(params: {
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
