import { existsSync } from 'node:fs';

import { NextResponse } from 'next/server';

import { getAllDocs, getDocsRoot } from '@/lib/docs/loader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const docsRoot = getDocsRoot();
  const docs = getAllDocs();

  return NextResponse.json(
    {
      ok: true,
      docsRoot,
      docsRootExists: existsSync(docsRoot),
      docsCount: docs.length,
      sampleSlugs: docs.slice(0, 5).map(doc => doc.slug),
    },
    { status: 200 }
  );
}
