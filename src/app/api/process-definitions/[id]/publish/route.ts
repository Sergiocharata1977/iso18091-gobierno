import { withAuth } from '@/lib/api/withAuth';
import { ProcessDefinitionServiceAdmin } from '@/services/processRecords/ProcessDefinitionServiceAdmin';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const { changes } = body; // Optional changes to apply during publish

    if (!id) {
      return NextResponse.json(
        { error: 'ID de proceso requerido' },
        { status: 400 }
      );
    }

    const newId = await ProcessDefinitionServiceAdmin.publicarNuevaVersion(
      id as string,
      changes || {}
    );

    return NextResponse.json({
      success: true,
      new_id: newId,
      message: 'Nueva versión publicada exitosamente',
    });
  } catch (error) {
    console.error('Error al publicar nueva versión:', error);
    return NextResponse.json(
      { error: 'Error interno al publicar nueva versión' },
      { status: 500 }
    );
  }
});
