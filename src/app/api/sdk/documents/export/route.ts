import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { DocumentService } from '@/lib/sdk/modules/documents/DocumentService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const ExportSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  format: z.enum(['json', 'markdown', 'html', 'pdf']).default('json'),
});

export const POST = withAuth(async req => {
  try {
    const body = await req.json();
    const validated = ExportSchema.parse(body);

    const documentService = new DocumentService();
    const exported = await documentService.exportDocument(
      validated.documentId,
      validated.format
    );

    // Set appropriate content type based on format
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      markdown: 'text/markdown',
      html: 'text/html',
      pdf: 'application/pdf',
    };

    return new NextResponse(exported, {
      headers: {
        'Content-Type': contentTypes[validated.format],
        'Content-Disposition': `attachment; filename="document.${validated.format}"`,
      },
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
