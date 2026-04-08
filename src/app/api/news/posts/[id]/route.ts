import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { updatePostSchema } from '@/lib/validations/news';
import { NextResponse } from 'next/server';

const COLLECTION_NAME = 'news_posts';
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
      const docRef = db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
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

      const post = {
        id: docSnap.id,
        ...docSnap.data(),
      };

      if (denyByOrg(auth, getPostOrgId(post as Record<string, unknown>))) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Acceso denegado' },
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: post,
      });
    } catch (error) {
      console.error('Error in GET /api/news/posts/[id]:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Error al obtener publicacion',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const db = getAdminFirestore();
      const docRef = db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
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

      const postData = docSnap.data();
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

      if (postData?.authorId !== auth.uid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'No tienes permisos para editar esta publicacion',
            },
          },
          { status: 403 }
        );
      }

      const body = await request.json();
      const validationResult = updatePostSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_POST_DATA',
              message: 'Datos de publicacion invalidos',
              details: validationResult.error.issues,
            },
          },
          { status: 400 }
        );
      }

      await docRef.update({
        content: validationResult.data.content,
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      });

      const updatedDocSnap = await docRef.get();
      const updatedPost = {
        id: updatedDocSnap.id,
        ...updatedDocSnap.data(),
      };

      return NextResponse.json({
        success: true,
        data: updatedPost,
      });
    } catch (error) {
      console.error('Error in PATCH /api/news/posts/[id]:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Error al actualizar publicacion',
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
      const db = getAdminFirestore();
      const docRef = db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
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

      const postData = docSnap.data();
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

      const isAdmin = ['admin', 'gerente', 'super_admin'].includes(auth.role);
      const isAuthor = postData?.authorId === auth.uid;

      if (!isAuthor && !isAdmin) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'No tienes permisos para eliminar esta publicacion',
            },
          },
          { status: 403 }
        );
      }

      await docRef.update({
        isActive: false,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
      });
    } catch (error) {
      console.error('Error in DELETE /api/news/posts/[id]:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Error al eliminar publicacion',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [...INTERACT_ROLES] }
);
