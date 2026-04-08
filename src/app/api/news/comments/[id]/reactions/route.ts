import { withAuth } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { createReactionSchema } from '@/lib/validations/news';
import { CommentService } from '@/services/news/CommentService';
import { ReactionService } from '@/services/news/ReactionService';
import { NextResponse } from 'next/server';

const POSTS_COLLECTION = 'news_posts';
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

export const POST = withAuth(
  async (request, { params }, auth) => {
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
        'comment',
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
      console.error('Error in POST /api/news/comments/[id]/reactions:', error);
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
