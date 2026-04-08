import { withAuth } from '@/lib/api/withAuth';
import { DocumentCreateSchema } from '@/lib/validations/documents';
import { DocumentServiceAdmin } from '@/services/documents/DocumentServiceAdmin';
import { DocumentCreateData } from '@/types/documents';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// GET /api/documents - List documents with filters and pagination
export const GET = withAuth(async (request, _context, auth) => {
  try {
    const { searchParams } = new URL(request.url);

    // MULTI-TENANT: Usar organization_id del usuario autenticado
    let organizationId = auth.organizationId;

    // Si es super admin y no tiene org (o quiere ver otra), permitir override por query param
    if (auth.role === 'super_admin' && searchParams.get('organization_id')) {
      organizationId = searchParams.get('organization_id')!;
    }

    if (!organizationId && auth.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 403 }
      );
    }

    // Parse filters
    const filters: Record<string, string | boolean | undefined> = {};

    // Solo filtrar por organización si tenemos un ID válido
    if (organizationId) {
      filters.organization_id = organizationId;
    }
    if (searchParams.get('type')) filters.type = searchParams.get('type')!;
    if (searchParams.get('status'))
      filters.status = searchParams.get('status')!;
    if (searchParams.get('category'))
      filters.category = searchParams.get('category')!;
    if (searchParams.get('responsible_user_id'))
      filters.responsible_user_id = searchParams.get('responsible_user_id')!;
    if (searchParams.get('process_id'))
      filters.process_id = searchParams.get('process_id')!;
    if (searchParams.get('is_archived'))
      filters.is_archived = searchParams.get('is_archived') === 'true';

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'created_at';
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

    const result = await DocumentServiceAdmin.getPaginated(filters, {
      page,
      limit,
      sort,
      order,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting documents:', error);
    return NextResponse.json(
      { error: 'Error al obtener documentos' },
      { status: 500 }
    );
  }
});

// POST /api/documents - Create new document
export const POST = withAuth(async (request, _context, auth) => {
  try {
    const body = await request.json();

    // MULTI-TENANT: Usar organization_id del usuario autenticado
    const organizationId = auth.organizationId;
    if (!organizationId && auth.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 403 }
      );
    }

    // Asegurar que el documento se cree en la organización del usuario
    body.organization_id = organizationId;

    // Validate with Zod
    const validatedData = DocumentCreateSchema.parse(
      body
    ) as DocumentCreateData;

    const document = await DocumentServiceAdmin.create(validatedData);

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Error al crear documento' },
      { status: 500 }
    );
  }
});
