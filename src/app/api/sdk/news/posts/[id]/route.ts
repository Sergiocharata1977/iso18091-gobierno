/**
 * News Post by ID API Routes - SDK Unified
 *
 * GET /api/sdk/news/posts/[id] - Get post by ID
 * DELETE /api/sdk/news/posts/[id] - Delete post
 */

import { NextRequest, NextResponse } from 'next/server';
import { PostService } from '@/lib/sdk/modules/news';
import { AuthContext, withAuth } from '@/lib/api/withAuth';
import {
  getRequestedOrgIdFromSearch,
  isRecordAllowedByOrg,
  validateRequestedOrg,
} from '@/lib/api/orgScope';

export const GET = withAuth(
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

      if (!id) {
        return NextResponse.json(
          { error: 'ID de post requerido' },
          { status: 400 }
        );
      }

      const requestedOrgId = getRequestedOrgIdFromSearch(
        request.nextUrl.searchParams
      );
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const service = new PostService();
      const post = await service.getById(id);

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

      return NextResponse.json({ post });
    } catch (error) {
      console.error('Error in GET /api/sdk/news/posts/[id]:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAuth(
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

      if (!id) {
        return NextResponse.json(
          { error: 'ID de post requerido' },
          { status: 400 }
        );
      }

      const requestedOrgId = getRequestedOrgIdFromSearch(
        request.nextUrl.searchParams
      );
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const service = new PostService();
      const post = await service.getById(id);

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

      await service.delete(id);

      return NextResponse.json({
        message: 'Post eliminado exitosamente',
        id,
      });
    } catch (error) {
      console.error('Error in DELETE /api/sdk/news/posts/[id]:', error);
      return NextResponse.json(
        {
          error: 'Error al eliminar post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
);
