import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { DocumentService } from '@/lib/sdk/modules/documents/DocumentService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const AccessedSchema = z.object({
  limit: z.number().int().positive().default(10),
});

export const GET = withAuth(async req => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 10;

    const validated = AccessedSchema.parse({ limit });

    const documentService = new DocumentService();
    const documents = await documentService.getMostAccessedDocuments(
      validated.limit
    );

    return NextResponse.json({
      success: true,
      data: documents,
      count: documents.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      );
    }
    return errorHandler(error);
  }
});
