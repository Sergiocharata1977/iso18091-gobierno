/**
 * API MCP - Listar Tareas Pendientes
 * GET /api/mcp/tareas
 */

import { withAuth } from '@/lib/api/withAuth';
import { getTasksForUser } from '@/services/mcp';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    if (!auth.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID missing' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const userId = searchParams.get('user_id');

    if (
      (organizationId &&
        organizationId !== auth.organizationId &&
        auth.role !== 'super_admin') ||
      (userId && userId !== auth.uid && auth.role !== 'super_admin')
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden organization or user' },
        { status: 403 }
      );
    }

    const result = await getTasksForUser(auth.organizationId, auth.uid);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[API /mcp/tareas] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
});
