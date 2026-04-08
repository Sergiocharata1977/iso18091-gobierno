import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { DocumentService } from '@/lib/sdk/modules/documents/DocumentService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const ShareSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  permissions: z.enum(['view', 'comment', 'edit']),
});

export const POST = withAuth(async req => {
  try {
    const body = await req.json();
    const validated = ShareSchema.parse(body);

    const documentService = new DocumentService();
    await documentService.shareDocument(
      validated.documentId,
      validated.userIds,
      validated.permissions,
      req.user.uid
    );

    return NextResponse.json({
      success: true,
      message: 'Document shared successfully',
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
