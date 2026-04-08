import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { PostService } from '@/lib/sdk/modules/news/PostService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async req => {
  try {
    const postService = new PostService();
    const stats = await postService.getPostStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return errorHandler(error);
  }
});
