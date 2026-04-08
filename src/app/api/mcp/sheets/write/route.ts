/**
 * API Route: Google Sheets Write
 * POST /api/mcp/sheets/write
 *
 * Escribe o agrega datos a una hoja de Google Sheets
 */

import { withAuth } from '@/lib/api/withAuth';
import { writeToSheet } from '@/services/google-sheets';
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
      values,
      append,
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

    if (!spreadsheetId || !range || !values) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: spreadsheetId, range, values',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(values) || !values.every(row => Array.isArray(row))) {
      return NextResponse.json(
        { success: false, error: 'Invalid values format. Expected 2D array.' },
        { status: 400 }
      );
    }

    const result = await writeToSheet({
      organization_id: auth.organizationId,
      user_id: auth.uid,
      spreadsheetId,
      sheetName: sheetName || 'Sheet1',
      range,
      values,
      append: append === true,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        rowsWritten: result.rowsWritten,
        range: result.range,
        executionId: result.executionId,
      },
    });
  } catch (error) {
    console.error('[API] Sheets Write Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
