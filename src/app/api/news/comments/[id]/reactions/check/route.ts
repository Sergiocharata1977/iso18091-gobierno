import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { CommentService } from '@/services/news/CommentService';
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

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const comment = await CommentService.getById(id);
      if (!comment) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'COMMENT_NOT_FOUND',
              message: 'Comentario no encontrado',
            },
          },
          { status: 404 }
        );
      }

      const db = getAdminFirestore();
      const postDoc = await db
        .collection(POSTS_COLLECTION)
        .doc(comment.postId)
        .get();
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

      if (denyByOrg(auth, postDoc.data()?.organizationId)) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Acceso denegado' },
          },
          { status: 403 }
        );
      }

      const reacted = await ReactionService.hasUserReacted(
        'comment',
        id,
        auth.uid
      );

      return NextResponse.json({
        success: true,
        data: { reacted },
      });
    } catch (error) {
      console.error(
        'Error in GET /api/news/comments/[id]/reactions/check:',
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
