/**
 * Post Comments API Route - SDK Unified
 *
 * POST /api/sdk/news/posts/[id]/comments - Create comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { CommentService, PostService } from '@/lib/sdk/modules/news';
import { CreateCommentSchema } from '@/lib/sdk/modules/news/validations';
import { AuthContext, withAuth } from '@/lib/api/withAuth';
import {
  getRequestedOrgIdFromBody,
  isRecordAllowedByOrg,
  validateRequestedOrg,
} from '@/lib/api/orgScope';

export const POST = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      if (!auth.organizationId) {
        return NextResponse.json(
          {
            error: 'Sin organizacion',
            message: 'Usuario sin organizacion asignada',
          },
          { status: 403 }
        );
      }

      const params = await context.params;
      const { id } = params;
      const body = await request.json().catch(() => ({}));

      if (!id) {
        return NextResponse.json(
          { error: 'ID de post requerido' },
          { status: 400 }
        );
      }

      const requestedOrgId = getRequestedOrgIdFromBody(body);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const postService = new PostService();
      const post = await postService.getById(id);

      if (!post) {
        return NextResponse.json(
          { error: 'Post no encontrado' },
          { status: 404 }
        );
      }

      if (!isRecordAllowedByOrg(post, auth.organizationId)) {
        return NextResponse.json(
          {
            error: 'Acceso denegado',
            message: 'Post fuera del alcance de tu organizacion',
          },
          { status: 403 }
        );
      }

      const validatedData = CreateCommentSchema.parse(body);

      if (validatedData.postId !== id) {
        return NextResponse.json(
          { error: 'postId no coincide con la ruta solicitada' },
          { status: 400 }
        );
      }

      const userId = auth.uid;

      const service = new CommentService();
      const commentId = await service.createAndReturnId(validatedData, userId);

      await getAdminFirestore()
        .collection('comments')
        .doc(commentId)
        .set({ organization_id: auth.organizationId }, { merge: true });

      return NextResponse.json(
        { id: commentId, message: 'Comentario creado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/news/posts/[id]/comments:', error);
      return NextResponse.json(
        {
          error: 'Error al crear comentario',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
);
