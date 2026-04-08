import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { updateCommentSchema } from '@/lib/validations/news';
import { NextResponse } from 'next/server';

const COMMENTS_COLLECTION = 'news_comments';
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

async function getCommentWithOrg(commentId: string) {
  const db = getAdminFirestore();
  const commentRef = db.collection(COMMENTS_COLLECTION).doc(commentId);
  const commentDoc = await commentRef.get();

  if (!commentDoc.exists) {
    return { db, commentRef, commentData: null, postData: null };
  }

  const commentData = commentDoc.data();
  let postData: Record<string, any> | null = null;

  if (commentData?.postId) {
    const postDoc = await db
      .collection(POSTS_COLLECTION)
      .doc(commentData.postId)
      .get();
    postData = postDoc.exists ? (postDoc.data() as Record<string, any>) : null;
  }

  return { db, commentRef, commentData, postData };
}

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const { commentRef, commentData, postData } = await getCommentWithOrg(id);

      if (!commentData) {
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

      if (denyByOrg(auth, postData?.organizationId)) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Acceso denegado' },
          },
          { status: 403 }
        );
      }

      if (commentData.authorId !== auth.uid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'No tienes permisos para editar este comentario',
            },
          },
          { status: 403 }
        );
      }

      const body = await request.json();
      const validationResult = updateCommentSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_COMMENT_DATA',
              message: 'Datos de comentario invalidos',
              details: validationResult.error.issues,
            },
          },
          { status: 400 }
        );
      }

      await commentRef.update({
        content: validationResult.data.content,
        isEdited: true,
        updatedAt: new Date(),
      });

      const updatedDoc = await commentRef.get();
      return NextResponse.json({
        success: true,
        data: {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        },
      });
    } catch (error) {
      console.error('Error in PATCH /api/news/comments/[id]:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Error al actualizar comentario',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [...INTERACT_ROLES] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const { db, commentRef, commentData, postData } =
        await getCommentWithOrg(id);

      if (!commentData) {
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

      if (denyByOrg(auth, postData?.organizationId)) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Acceso denegado' },
          },
          { status: 403 }
        );
      }

      const isAdmin = ['admin', 'gerente', 'super_admin'].includes(auth.role);
      const isAuthor = commentData.authorId === auth.uid;

      if (!isAuthor && !isAdmin) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'No tienes permisos para eliminar este comentario',
            },
          },
          { status: 403 }
        );
      }

      await commentRef.update({
        isActive: false,
        updatedAt: new Date(),
      });

      const postId = commentData.postId;
      if (postId) {
        const postRef = db.collection(POSTS_COLLECTION).doc(postId);
        const postDoc = await postRef.get();
        if (postDoc.exists) {
          const currentCount = postDoc.data()?.commentCount || 0;
          await postRef.update({
            commentCount: Math.max(0, currentCount - 1),
          });
        }
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error in DELETE /api/news/comments/[id]:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Error al eliminar comentario',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [...INTERACT_ROLES] }
);
