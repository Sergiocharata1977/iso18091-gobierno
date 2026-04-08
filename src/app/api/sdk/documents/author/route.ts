import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { DocumentService } from '@/lib/sdk/modules/documents/DocumentService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const AuthorSchema = z.object({
  authorId: z.string().min(1, 'Author ID is required'),
});

export const GET = withAuth(async req => {
  try {
    const { searchParams } = new URL(req.url);
    const authorId = searchParams.get('authorId');

    if (!authorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Author ID is required',
        },
        { status: 400 }
      );
    }

    const validated = AuthorSchema.parse({ authorId });

    const documentService = new DocumentService();
    const documents = await documentService.getByAuthor(validated.authorId);

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
