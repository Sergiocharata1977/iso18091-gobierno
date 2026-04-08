import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { PostService } from '@/lib/sdk/modules/news/PostService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async req => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const postService = new PostService();
    const trendingPosts = await postService.getTrendingPosts(limit);

    return NextResponse.json({
      success: true,
      data: trendingPosts,
    });
  } catch (error) {
    return errorHandler(error);
  }
});
