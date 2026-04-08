import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { DocumentService } from '@/lib/sdk/modules/documents/DocumentService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const DateRangeSchema = z.object({
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
});

export const GET = withAuth(async req => {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Start date and end date are required',
        },
        { status: 400 }
      );
    }

    const validated = DateRangeSchema.parse({
      startDate,
      endDate,
    });

    const documentService = new DocumentService();
    const documents = await documentService.getByDateRange(
      new Date(validated.startDate),
      new Date(validated.endDate)
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
