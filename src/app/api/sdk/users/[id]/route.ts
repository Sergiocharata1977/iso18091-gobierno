import { withAuth, AuthenticatedRequest } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { UserProfileService } from '@/lib/sdk/modules/rrhh/UserProfileService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schemas de validación
const ChangeRoleSchema = z.object({
  newRole: z.enum(['admin', 'auditor', 'manager', 'user', 'viewer']),
});

const ChangePermissionsSchema = z.object({
  permissions: z.array(
    z.enum([
      'create_audit',
      'edit_audit',
      'delete_audit',
      'view_audit',
      'create_finding',
      'edit_finding',
      'delete_finding',
      'create_action',
      'edit_action',
      'delete_action',
      'manage_users',
      'manage_roles',
      'view_reports',
      'export_data',
    ])
  ),
});

const ToggleStatusSchema = z.object({
  active: z.boolean(),
});

export const GET = withAuth(async (req: AuthenticatedRequest, context: any) => {
  try {
    const { params } = context;
    const userService = new UserProfileService();
    const userProfile = await userService.getUserProfile(params.id);

    if (!userProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    return errorHandler(error);
  }
});

export const PUT = withAuth(async (req: AuthenticatedRequest, context: any) => {
  try {
    const { params } = context;
    const body = await req.json();
    const userService = new UserProfileService();

    // Cambiar rol
    if (body.newRole) {
      const validated = ChangeRoleSchema.parse({ newRole: body.newRole });
      await userService.changeUserRole(
        params.id,
        validated.newRole,
        req.user.uid
      );

      return NextResponse.json({
        success: true,
        message: 'User role updated successfully',
      });
    }

    // Cambiar permisos
    if (body.permissions) {
      const validated = ChangePermissionsSchema.parse({
        permissions: body.permissions,
      });
      await userService.changeUserPermissions(
        params.id,
        validated.permissions,
        req.user.uid
      );

      return NextResponse.json({
        success: true,
        message: 'User permissions updated successfully',
      });
    }

    // Cambiar estado
    if (body.active !== undefined) {
      const validated = ToggleStatusSchema.parse({ active: body.active });
      await userService.toggleUserStatus(
        params.id,
        validated.active,
        req.user.uid
      );

      return NextResponse.json({
        success: true,
        message: 'User status updated successfully',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'No valid update fields provided',
      },
      { status: 400 }
    );
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

export const DELETE = withAuth(
  async (req: AuthenticatedRequest, context: any) => {
    try {
      const { params } = context;
      const userService = new UserProfileService();
      await userService.deleteUserProfile(params.id);

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      return errorHandler(error);
    }
  }
);
