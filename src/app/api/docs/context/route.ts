import { NextResponse } from 'next/server';

import { getAllDocs, getDocBySlug } from '@/lib/docs/loader';
import { getDocsForRoute } from '@/lib/docs/mapping';
import type { Doc, DocMeta } from '@/types/docs';

type ContextHelpDoc = Doc & {
  relatedDocs: DocMeta[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const route = searchParams.get('route')?.trim() ?? '';

  if (!route) {
    return NextResponse.json({ docs: [] }, { status: 200 });
  }

  const allDocs = getAllDocs();
  const docs = getDocsForRoute(route)
    .filter(doc => doc.status === 'active')
    .map(meta => {
      const doc = getDocBySlug(meta.slug);

      if (!doc) {
        return null;
      }

      const relatedDocs = allDocs
        .filter(candidate => {
          if (candidate.slug === meta.slug || candidate.status !== 'active') {
            return false;
          }

          if (candidate.module === meta.module) {
            return true;
          }

          return candidate.tags.some(tag => meta.tags.includes(tag));
        })
        .slice(0, 4);

      return {
        meta: doc.meta,
        content: doc.content,
        relatedDocs,
      };
    })
    .filter((doc): doc is ContextHelpDoc => doc !== null);

  return NextResponse.json({ docs }, { status: 200 });
}
