import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { DocumentService } from '@/lib/sdk/modules/documents/DocumentService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async req => {
  try {
    const documentService = new DocumentService();
    const stats = await documentService.getAdvancedStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return errorHandler(error);
  }
});
