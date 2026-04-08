import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { UserProfileService } from '@/lib/sdk/modules/rrhh/UserProfileService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req, { params }: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const userService = new UserProfileService();
    const history = await userService.getUserChangeHistory(params.id, limit);

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    return errorHandler(error);
  }
});
