import { withAuth } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { createCommentSchema } from '@/lib/validations/news';
import { NextResponse } from 'next/server';

const POSTS_COLLECTION = 'news_posts';
const COMMENTS_COLLECTION = 'news_comments';
const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
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

      const commentsSnapshot = await db
        .collection(COMMENTS_COLLECTION)
        .where('postId', '==', id)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'asc')
        .get();

      const comments = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({
        success: true,
        data: comments,
      });
    } catch (error) {
      console.error('Error in GET /api/news/posts/[id]/comments:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Error al obtener comentarios',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const db = getAdminFirestore();
      const postRef = db.collection(POSTS_COLLECTION).doc(id);
      const postDoc = await postRef.get();

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

      const body = await request.json();
      const validationResult = createCommentSchema.safeParse(body);
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

      const firebaseAuth = getAdminAuth();
      const userRecord = await firebaseAuth.getUser(auth.uid);
      let userName = userRecord.displayName || null;
      const userPhotoURL = userRecord.photoURL || null;

      if (!userName) {
        const userDoc = await db.collection('users').doc(auth.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userName =
            userData?.displayName ||
            userData?.name ||
            userData?.email?.split('@')[0] ||
            'Usuario';
        } else {
          userName = userRecord.email?.split('@')[0] || 'Usuario';
        }
      }

      const now = new Date();
      const commentData = {
        postId: id,
        content: validationResult.data.content,
        authorId: auth.uid,
        authorName: userName,
        authorPhotoURL: userPhotoURL,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        isEdited: false,
      };

      const commentRef = await db
        .collection(COMMENTS_COLLECTION)
        .add(commentData);
      await postRef.update({
        commentCount: (postData?.commentCount || 0) + 1,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            id: commentRef.id,
            ...commentData,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/news/posts/[id]/comments:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Error al crear comentario',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [...INTERACT_ROLES] }
);
