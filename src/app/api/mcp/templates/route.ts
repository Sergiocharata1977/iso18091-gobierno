/**
 * API MCP - Listar Plantillas de Tareas
 * GET /api/mcp/templates
 */

import { withAuth } from '@/lib/api/withAuth';
import { getAllTemplates } from '@/services/mcp/templates';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, _context, _auth) => {
  try {
    const templates = getAllTemplates();

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    console.error('[API /mcp/templates] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
});
