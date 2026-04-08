import { withAuth } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import {
  createPostSchema,
  paginationSchema,
  postFiltersSchema,
} from '@/lib/validations/news';
import type { Post } from '@/types/news';
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

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const authorId = searchParams.get('authorId') || undefined;
      const search = searchParams.get('search') || undefined;
      const requestedOrgId = searchParams.get('organizationId') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_POST_DATA',
              message: 'organizationId es requerido',
            },
          },
          { status: 400 }
        );
      }

      const paginationResult = paginationSchema.safeParse({ page, limit });
      if (!paginationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_POST_DATA',
              message: 'Parametros de paginacion invalidos',
              details: paginationResult.error.issues,
            },
          },
          { status: 400 }
        );
      }

      const filtersResult = postFiltersSchema.safeParse({ authorId, search });
      if (!filtersResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_POST_DATA',
              message: 'Filtros invalidos',
              details: filtersResult.error.issues,
            },
          },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const pageLimit = paginationResult.data.limit;
      const currentPage = paginationResult.data.page;

      let queryRefPrimary = db
        .collection(COLLECTION_NAME)
        .where('organizationId', '==', organizationId);
      let queryRefLegacy = db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId);

      if (filtersResult.data.authorId) {
        queryRefPrimary = queryRefPrimary.where(
          'authorId',
          '==',
          filtersResult.data.authorId
        );
        queryRefLegacy = queryRefLegacy.where(
          'authorId',
          '==',
          filtersResult.data.authorId
        );
      }

      const [snapshotPrimary, snapshotLegacy] = await Promise.all([
        queryRefPrimary.get(),
        queryRefLegacy.get(),
      ]);

      const merged = new Map<string, Post>();
      for (const doc of snapshotPrimary.docs) {
        merged.set(doc.id, {
          id: doc.id,
          ...doc.data(),
        } as Post);
      }
      for (const doc of snapshotLegacy.docs) {
        if (!merged.has(doc.id)) {
          merged.set(doc.id, {
            id: doc.id,
            ...doc.data(),
          } as Post);
        }
      }

      // Fallback legacy: posts antiguos sin campo organizationId/organization_id.
      // Se incluyen solo si el autor pertenece a la misma organización.
      if (merged.size === 0) {
        const fallbackSnapshot = await db
          .collection(COLLECTION_NAME)
          .where('isActive', '==', true)
          .orderBy('createdAt', 'desc')
          .limit(200)
          .get();

        const authorOrgCache = new Map<string, string | null>();
        for (const doc of fallbackSnapshot.docs) {
          if (merged.has(doc.id)) continue;
          const data = doc.data() as Record<string, unknown>;
          const postOrg =
            (data.organizationId as string | undefined) ||
            (data.organization_id as string | undefined) ||
            null;

          if (postOrg === organizationId) {
            merged.set(doc.id, { id: doc.id, ...data } as Post);
            continue;
          }

          if (postOrg) continue;

          const authorId = data.authorId as string | undefined;
          if (!authorId) continue;

          let authorOrg = authorOrgCache.get(authorId);
          if (authorOrg === undefined) {
            const authorDoc = await db.collection('users').doc(authorId).get();
            authorOrg =
              (authorDoc.data()?.organization_id as string | undefined) || null;
            authorOrgCache.set(authorId, authorOrg);
          }

          if (authorOrg === organizationId) {
            merged.set(doc.id, { id: doc.id, ...data } as Post);
          }
        }
      }

      let posts: Post[] = Array.from(merged.values()).filter(post => {
        const isActive = (post as any).isActive;
        return isActive !== false;
      });

      if (filtersResult.data.search) {
        const searchLower = filtersResult.data.search.toLowerCase();
        posts = posts.filter(post =>
          post.content.toLowerCase().includes(searchLower)
        );
      }

      posts.sort((a, b) => {
        const toMillis = (value: unknown): number => {
          if (!value) return 0;
          if (
            typeof value === 'object' &&
            value !== null &&
            'toDate' in value
          ) {
            const d = (value as { toDate?: () => Date }).toDate?.();
            return d ? d.getTime() : 0;
          }
          if (value instanceof Date) return value.getTime();
          if (typeof value === 'string') {
            const t = new Date(value).getTime();
            return Number.isNaN(t) ? 0 : t;
          }
          return 0;
        };
        return toMillis((b as any).createdAt) - toMillis((a as any).createdAt);
      });

      const total = posts.length;
      const offset = Math.max(0, (currentPage - 1) * pageLimit);
      const pagedPosts = posts.slice(offset, offset + pageLimit);
      const hasMore = offset + pageLimit < total;

      return NextResponse.json({
        success: true,
        data: pagedPosts,
        pagination: {
          page: currentPage,
          limit: pageLimit,
          total,
          hasMore,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/news/posts:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Error al obtener publicaciones',
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
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const requestedOrgId = body.organizationId;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;
      const { content, images = [] } = body;

      const validationResult = createPostSchema.safeParse({
        content,
        organizationId,
      });
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

      if (images.length > 5) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TOO_MANY_IMAGES',
              message: 'Maximo 5 imagenes permitidas',
            },
          },
          { status: 400 }
        );
      }

      const firebaseAuth = getAdminAuth();
      const userRecord = await firebaseAuth.getUser(auth.uid);
      let userName = userRecord.displayName || null;
      const userPhotoURL = userRecord.photoURL || null;
      const db = getAdminFirestore();
      const now = new Date();

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

      const postData = {
        content: validationResult.data.content,
        images,
        attachments: [],
        authorId: auth.uid,
        authorName: userName,
        authorPhotoURL: userPhotoURL,
        organizationId: validationResult.data.organizationId,
        isEdited: false,
        editedAt: null,
        commentCount: 0,
        reactionCount: 0,
        isModerated: false,
        moderatedBy: null,
        moderatedAt: null,
        moderationReason: null,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      };

      const docRef = await db.collection(COLLECTION_NAME).add(postData);
      return NextResponse.json(
        {
          success: true,
          data: { id: docRef.id, ...postData },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/news/posts:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Error al crear publicacion',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [...INTERACT_ROLES] }
);
