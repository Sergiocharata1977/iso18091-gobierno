import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { checkRateLimit } from '@/lib/api/rateLimit';
import { getAdminAuth } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ResetPasswordBody {
  uid: string;
  newPassword: string;
  emailVerified?: boolean;
}

const resetHandler = async (
  request: NextRequest,
  _context: { params: Promise<Record<string, string>> },
  auth: AuthContext
) => {
  try {
    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 5,
      windowSeconds: 3600,
      identifier: `temp-reset-password:${auth.organizationId || 'no-org'}:${auth.uid}`,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = (await request.json()) as Partial<ResetPasswordBody>;
    const { uid, newPassword, emailVerified = true } = body;

    if (!uid || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'uid y newPassword son requeridos' },
        { status: 400 }
      );
    }

    if (newPassword.length < 12) {
      return NextResponse.json(
        {
          success: false,
          error: 'La contrasena debe tener al menos 12 caracteres',
        },
        { status: 400 }
      );
    }

    const authService = getAdminAuth();

    await authService.updateUser(uid, {
      password: newPassword,
      emailVerified,
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      uid,
    });
  } catch (error: any) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
};

export const POST = withAuth(resetHandler, {
  roles: ['super_admin'],
  allowNoOrg: true,
});

export const GET = withAuth(resetHandler, {
  roles: ['super_admin'],
  allowNoOrg: true,
});
