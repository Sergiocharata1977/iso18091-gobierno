/**
 * Personnel Detail API Route - SDK Unified
 *
 * GET /api/sdk/rrhh/personnel/[id] - Get personnel by ID
 * PUT /api/sdk/rrhh/personnel/[id] - Update personnel
 * DELETE /api/sdk/rrhh/personnel/[id] - Delete personnel
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { PersonnelService } from '@/lib/sdk/modules/rrhh';

export const GET = withAuth(async (request, { params }, auth) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de personal requerido' },
        { status: 400 }
      );
    }

    const service = new PersonnelService();
    const personnel = await service.getById(id);

    if (!personnel) {
      return NextResponse.json(
        { error: 'Personal no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: personnel }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/sdk/rrhh/personnel/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener personal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, { params }, auth) => {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID de personal requerido' },
        { status: 400 }
      );
    }

    const service = new PersonnelService();
    await service.update(id, body, auth.uid);

    return NextResponse.json(
      { message: 'Personal actualizado exitosamente', id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/sdk/rrhh/personnel/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al actualizar personal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, { params }, auth) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de personal requerido' },
        { status: 400 }
      );
    }

    const service = new PersonnelService();
    await service.delete(id);

    return NextResponse.json(
      { message: 'Personal eliminado exitosamente', id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/sdk/rrhh/personnel/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al eliminar personal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
