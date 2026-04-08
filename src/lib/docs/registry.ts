import type { DocMeta, DocSearchResult } from '@/types/docs';

import { getAllDocs, getDocBySlug } from './loader';

let cachedIndex: Map<string, DocMeta> | null = null;

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('es');
}

export function buildIndex(): Map<string, DocMeta> {
  const index = new Map<string, DocMeta>();

  for (const doc of getAllDocs()) {
    index.set(doc.slug, doc);
  }

  cachedIndex = index;
  return index;
}

function getIndex(): Map<string, DocMeta> {
  return cachedIndex ?? buildIndex();
}

export function searchDocs(query: string): DocSearchResult[] {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const results: DocSearchResult[] = [];

  for (const meta of getIndex().values()) {
    const title = normalizeText(meta.title);
    const summary = normalizeText(meta.summary);
    const tags = meta.tags.map(tag => normalizeText(tag));

    if (title.includes(normalizedQuery)) {
      results.push({ meta, matchType: 'title', highlight: meta.title });
      continue;
    }

    const matchingTag = meta.tags.find(tag =>
      normalizeText(tag).includes(normalizedQuery)
    );
    if (matchingTag) {
      results.push({ meta, matchType: 'tag', highlight: matchingTag });
      continue;
    }

    if (summary.includes(normalizedQuery)) {
      results.push({ meta, matchType: 'summary', highlight: meta.summary });
      continue;
    }

    if (tags.some(tag => tag.includes(normalizedQuery))) {
      results.push({ meta, matchType: 'tag' });
      continue;
    }

    const doc = getDocBySlug(meta.slug);
    if (doc && normalizeText(doc.content).includes(normalizedQuery)) {
      results.push({ meta, matchType: 'content' });
    }
  }

  return results.sort((left, right) => {
    if (left.meta.order !== right.meta.order) {
      return left.meta.order - right.meta.order;
    }

    return left.meta.title.localeCompare(right.meta.title, 'es');
  });
}
