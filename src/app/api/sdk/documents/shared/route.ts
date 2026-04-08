import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { DocumentService } from '@/lib/sdk/modules/documents/DocumentService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async req => {
  try {
    const documentService = new DocumentService();
    const documents = await documentService.getSharedDocuments(req.user.uid);

    return NextResponse.json({
      success: true,
      data: documents,
      count: documents.length,
    });
  } catch (error) {
    return errorHandler(error);
  }
});
