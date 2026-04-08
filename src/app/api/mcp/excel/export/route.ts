/**
 * API Route: Export MCP Executions to Excel/CSV
 * POST /api/mcp/excel/export
 *
 * Genera un archivo Excel/CSV con el historial de ejecuciones MCP
 */

import { withAuth } from '@/lib/api/withAuth';
import { exportExecutionsToExcel } from '@/services/excel';
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
    const { organization_id, user_id, filename, sheetName, limit, estado } =
      body;

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

    const executions = await getExecutionHistory(auth.organizationId, {
      limit: limit || 100,
      estado,
    });

    if (executions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No executions to export',
          rowsExported: 0,
        },
      });
    }

    const result = await exportExecutionsToExcel(
      auth.organizationId,
      auth.uid,
      executions,
      {
        filename: filename || `mcp_export_${Date.now()}.csv`,
        sheetName: sheetName || 'Ejecuciones MCP',
      }
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
        filename: result.filename,
        base64: result.base64,
        mimeType: result.mimeType,
        size: result.size,
        rowsExported: executions.length,
        executionId: result.executionId,
      },
    });
  } catch (error) {
    console.error('[API] Excel Export Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
