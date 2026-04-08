import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { DocumentService } from '@/lib/sdk/modules/documents/DocumentService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const SearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  limit: z.number().int().positive().default(20),
});

export const POST = withAuth(async req => {
  try {
    const body = await req.json();
    const validated = SearchSchema.parse(body);

    const documentService = new DocumentService();
    const results = await documentService.fullTextSearch(
      validated.query,
      validated.limit
    );

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
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
