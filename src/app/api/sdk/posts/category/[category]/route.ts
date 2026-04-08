import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { PostService } from '@/lib/sdk/modules/news/PostService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req, { params }) => {
  try {
    const { category } = params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category is required',
        },
        { status: 400 }
      );
    }

    const postService = new PostService();
    const posts = await postService.getByCategory(category, limit);

    return NextResponse.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    return errorHandler(error);
  }
});
