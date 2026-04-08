/**
 * API MCP - Completar Tarea
 * POST /api/mcp/tareas/completar
 */

import { withAuth } from '@/lib/api/withAuth';
import { markTaskCompleted } from '@/services/mcp';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const CompleteTaskSchema = z.object({
  organization_id: z.string().optional(),
  user_id: z.string().optional(),
  tarea_id: z.string().optional(),
  hallazgo_id: z.string().optional(),
  accion_id: z.string().optional(),

  tipo: z.enum([
    'facturacion',
    'formulario',
    'extraccion',
    'carga_datos',
    'otro',
  ]),
  sistema_origen: z.string().min(1, 'sistema_origen es requerido'),
  url_origen: z.string().url('URL de origen invalida'),
  comando_original: z.string().optional(),

  estado: z.enum(['exitoso', 'fallido', 'parcial', 'pendiente']),
  duracion_ms: z.number().min(0),
  log_pasos: z.array(
    z.object({
      orden: z.number().optional(),
      accion: z.string(),
      selector: z.string().optional(),
      valor: z.string().optional(),
      resultado: z.enum(['ok', 'error', 'skipped']),
      error_mensaje: z.string().optional(),
      duracion_ms: z.number().optional(),
    })
  ),
});

export const POST = withAuth(async (request, _context, auth) => {
  try {
    if (!auth.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID missing' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = CompleteTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos invalidos',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    if (
      (data.organization_id &&
        data.organization_id !== auth.organizationId &&
        auth.role !== 'super_admin') ||
      (data.user_id && data.user_id !== auth.uid && auth.role !== 'super_admin')
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden organization or user' },
        { status: 403 }
      );
    }

    const result = await markTaskCompleted({
      ...data,
      organization_id: auth.organizationId,
      user_id: auth.uid,
    });

    return NextResponse.json({
      success: true,
      data: {
        execution_id: result.execution_id,
      },
    });
  } catch (error: any) {
    console.error('[API /mcp/tareas/completar] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
});
