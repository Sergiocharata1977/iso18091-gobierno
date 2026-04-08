import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { ReactionService } from '@/services/news/ReactionService';
import { NextResponse } from 'next/server';

const POSTS_COLLECTION = 'news_posts';
const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
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

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const db = getAdminFirestore();
      const postDoc = await db.collection(POSTS_COLLECTION).doc(id).get();

      if (!postDoc.exists) {
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

      const postData = postDoc.data();
      if (
        denyByOrg(
          auth,
          getPostOrgId(postData as Record<string, unknown> | undefined)
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

      const reacted = await ReactionService.hasUserReacted(
        'post',
        id,
        auth.uid
      );

      return NextResponse.json({
        success: true,
        data: { reacted },
      });
    } catch (error) {
      console.error(
        'Error in GET /api/news/posts/[id]/reactions/check:',
        error
      );
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Error al verificar reaccion',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);
