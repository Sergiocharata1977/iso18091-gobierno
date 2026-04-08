/**
 * News Posts API Routes - SDK Unified
 *
 * GET /api/sdk/news/posts - List posts
 * POST /api/sdk/news/posts - Create post
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { PostService } from '@/lib/sdk/modules/news';
import { CreatePostSchema } from '@/lib/sdk/modules/news/validations';
import type { PostFilters } from '@/lib/sdk/modules/news/types';
import { AuthContext, withAuth } from '@/lib/api/withAuth';
import {
  getRequestedOrgIdFromBody,
  getRequestedOrgIdFromSearch,
  isRecordAllowedByOrg,
  validateRequestedOrg,
} from '@/lib/api/orgScope';

export const GET = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
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

      const searchParams = request.nextUrl.searchParams;
      const requestedOrgId = getRequestedOrgIdFromSearch(searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const filters: PostFilters = {
        author: searchParams.get('author') || undefined,
        dateFrom: searchParams.get('dateFrom') || undefined,
        dateTo: searchParams.get('dateTo') || undefined,
        tags: searchParams.get('tags')
          ? searchParams.get('tags')!.split(',')
          : undefined,
        search: searchParams.get('search') || undefined,
      };

      const options = {
        limit: searchParams.get('limit')
          ? parseInt(searchParams.get('limit')!)
          : 100,
        offset: searchParams.get('offset')
          ? parseInt(searchParams.get('offset')!)
          : 0,
      };

      const service = new PostService();
      const posts = await service.list(filters, options);
      const scopedPosts = posts.filter(post =>
        isRecordAllowedByOrg(post, auth.organizationId)
      );

      return NextResponse.json({
        posts: scopedPosts,
        count: scopedPosts.length,
      });
    } catch (error) {
      console.error('Error in GET /api/sdk/news/posts:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener posts',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
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

      const body = await request.json().catch(() => ({}));
      const requestedOrgId = getRequestedOrgIdFromBody(body);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const validatedData = CreatePostSchema.parse(body);
      const userId = auth.uid;

      const service = new PostService();
      const postId = await service.createAndReturnId(validatedData, userId);

      await getAdminFirestore()
        .collection('posts')
        .doc(postId)
        .set({ organization_id: auth.organizationId }, { merge: true });

      return NextResponse.json(
        { id: postId, message: 'Post creado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/news/posts:', error);
      return NextResponse.json(
        {
          error: 'Error al crear post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
);
