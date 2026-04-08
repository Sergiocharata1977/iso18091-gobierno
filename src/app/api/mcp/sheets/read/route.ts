/**
 * API Route: Google Sheets Read
 * POST /api/mcp/sheets/read
 *
 * Lee datos de una hoja de Google Sheets
 */

import { withAuth } from '@/lib/api/withAuth';
import { readFromSheet } from '@/services/google-sheets';
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
    const { organization_id, user_id, spreadsheetId, sheetName, range } = body;

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

    if (!spreadsheetId || !range) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: spreadsheetId, range',
        },
        { status: 400 }
      );
    }

    const result = await readFromSheet({
      organization_id: auth.organizationId,
      user_id: auth.uid,
      spreadsheetId,
      sheetName: sheetName || 'Sheet1',
      range,
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
        values: result.values,
        rows: result.rows,
        columns: result.columns,
      },
    });
  } catch (error) {
    console.error('[API] Sheets Read Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
