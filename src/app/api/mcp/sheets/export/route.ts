/**
 * API Route: Export MCP Executions to Google Sheets
 * POST /api/mcp/sheets/export
 *
 * Exporta el historial de ejecuciones MCP a una hoja de Google Sheets
 */

import { withAuth } from '@/lib/api/withAuth';
import { exportExecutionsToSheet } from '@/services/google-sheets';
import { getExecutionHistory } from '@/services/mcp';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, _context, auth) => {
  try {
    if (!auth.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID missing' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      organization_id,
      user_id,
      spreadsheetId,
      sheetName,
      range,
      includeHeaders,
      limit,
      estado,
    } = body;

    if (
      (organization_id &&
        organization_id !== auth.organizationId &&
        auth.role !== 'super_admin') ||
      (user_id && user_id !== auth.uid && auth.role !== 'super_admin')
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden organization or user' },
        { status: 403 }
      );
    }

    if (!spreadsheetId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: spreadsheetId',
        },
        { status: 400 }
      );
    }

    const executions = await getExecutionHistory(auth.organizationId, {
      limit: limit || 100,
      estado,
    });

    if (executions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No executions to export',
          rowsWritten: 0,
        },
      });
    }

    const result = await exportExecutionsToSheet(
      auth.organizationId,
      auth.uid,
      {
        spreadsheetId,
        sheetName: sheetName || 'MCP Executions',
        range: range || 'A1',
        includeHeaders: includeHeaders !== false,
      },
      executions
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        executionsExported: executions.length,
        rowsWritten: result.rowsWritten,
        range: result.range,
        executionId: result.executionId,
      },
    });
  } catch (error) {
    console.error('[API] Sheets Export Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
