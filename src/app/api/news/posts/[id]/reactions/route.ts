import { withAuth } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { createReactionSchema } from '@/lib/validations/news';
import { PostService } from '@/services/news/PostService';
import { ReactionService } from '@/services/news/ReactionService';
import { NextResponse } from 'next/server';

const INTERACT_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'super_admin',
] as const;

function denyByOrg(
  auth: { role: string; organizationId: string },
  postOrgId?: string
) {
  return (
    auth.role !== 'super_admin' &&
    !!auth.organizationId &&
    !!postOrgId &&
    postOrgId !== auth.organizationId
  );
}

function getPostOrgId(
  postData: Record<string, unknown> | undefined
): string | undefined {
  if (!postData) return undefined;
  const legacy = postData.organization_id;
  const current = postData.organizationId;
  if (typeof current === 'string' && current) return current;
  if (typeof legacy === 'string' && legacy) return legacy;
  return undefined;
}

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const post = await PostService.getById(id);
      if (!post) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'POST_NOT_FOUND',
              message: 'Publicacion no encontrada',
            },
          },
          { status: 404 }
        );
      }

      if (
        denyByOrg(
          auth,
          getPostOrgId(post as unknown as Record<string, unknown>)
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Acceso denegado' },
          },
          { status: 403 }
        );
      }

      const body = await request.json();
      const validationResult = createReactionSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_POST_DATA',
              message: 'Datos de reaccion invalidos',
              details: validationResult.error.issues,
            },
          },
          { status: 400 }
        );
      }

      const firebaseAuth = getAdminAuth();
      const userRecord = await firebaseAuth.getUser(auth.uid);
      const userName = userRecord.displayName || auth.email || 'Usuario';

      const result = await ReactionService.toggleReaction(
        'post',
        id,
        auth.uid,
        userName,
        validationResult.data.type
      );

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in POST /api/news/posts/[id]/reactions:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Error al procesar reaccion',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [...INTERACT_ROLES] }
);
