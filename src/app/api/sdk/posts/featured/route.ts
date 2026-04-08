import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { PostService } from '@/lib/sdk/modules/news/PostService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async req => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    const postService = new PostService();
    const featuredPosts = await postService.getFeaturedPosts(limit);

    return NextResponse.json({
      success: true,
      data: featuredPosts,
    });
  } catch (error) {
    return errorHandler(error);
  }
});
