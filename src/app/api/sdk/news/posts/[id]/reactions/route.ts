/**
 * Post Reactions API Route - SDK Unified
 *
 * POST /api/sdk/news/posts/[id]/reactions - Toggle reaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { PostService, ReactionService } from '@/lib/sdk/modules/news';
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

      const { reactionType } = body;
      if (!reactionType) {
        return NextResponse.json(
          { error: 'Tipo de reaccion requerido' },
          { status: 400 }
        );
      }

      const userId = auth.uid;

      const service = new ReactionService();
      await service.toggle(id, userId, reactionType);

      return NextResponse.json(
        { message: 'Reaccion toggled exitosamente', postId: id, reactionType },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/news/posts/[id]/reactions:', error);
      return NextResponse.json(
        {
          error: 'Error al crear reaccion',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
);
