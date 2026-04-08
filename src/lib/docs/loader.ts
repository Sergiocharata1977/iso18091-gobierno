import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import type { Doc, DocMeta, DocModule } from '@/types/docs';

import { parseDoc } from './parser';

const DOCS_RELATIVE_PATH = path.join('content', 'docs');

function resolveDocsRoot(): string {
  const envOverride = process.env.DOCS_ROOT_PATH?.trim();

  if (envOverride && existsSync(envOverride)) {
    return envOverride;
  }

  const searchBases = [process.cwd(), __dirname];

  for (const basePath of searchBases) {
    let currentPath = path.resolve(basePath);

    for (let depth = 0; depth < 8; depth += 1) {
      const candidate = path.join(currentPath, DOCS_RELATIVE_PATH);

      if (existsSync(candidate)) {
        return candidate;
      }

      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        break;
      }

      currentPath = parentPath;
    }
  }

  return path.join(process.cwd(), DOCS_RELATIVE_PATH);
}

const DOCS_ROOT = resolveDocsRoot();

export function getDocsRoot(): string {
  return DOCS_ROOT;
}

function isMarkdownFile(filePath: string): boolean {
  return /\.(md|mdx)$/i.test(filePath);
}

function slugFromFilePath(filePath: string): string {
  const relativePath = path.relative(DOCS_ROOT, filePath);
  return relativePath.replace(/\.(md|mdx)$/i, '').replace(/\\/g, '/');
}

function collectDocFiles(directoryPath: string): string[] {
  if (!existsSync(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath).flatMap(entry => {
    const fullPath = path.join(directoryPath, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return collectDocFiles(fullPath);
    }

    return isMarkdownFile(fullPath) ? [fullPath] : [];
  });
}

function sortDocs<T extends DocMeta>(docs: T[]): T[] {
  return [...docs].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return left.title.localeCompare(right.title, 'es');
  });
}

function isValidDocMeta(doc: DocMeta): boolean {
  return Boolean(doc.title && doc.slug && doc.module);
}

function enrichDoc(filePath: string): Doc {
  const rawContent = readFileSync(filePath, 'utf8');
  const parsedDoc = parseDoc(rawContent);
  const fallbackSlug = slugFromFilePath(filePath);

  return {
    ...parsedDoc,
    meta: {
      ...parsedDoc.meta,
      slug: parsedDoc.meta.slug || fallbackSlug,
    },
  };
}

export function getAllDocs(): DocMeta[] {
  return sortDocs(
    collectDocFiles(DOCS_ROOT)
      .map(filePath => enrichDoc(filePath).meta)
      .filter(isValidDocMeta)
  );
}

export function getDocBySlug(slug: string): Doc | null {
  const normalizedSlug = slug.trim().replace(/^\/+|\/+$/g, '');

  if (!normalizedSlug || !existsSync(DOCS_ROOT)) {
    return null;
  }

  const match = collectDocFiles(DOCS_ROOT).find(
    filePath =>
      slugFromFilePath(filePath) === normalizedSlug ||
      enrichDoc(filePath).meta.slug === normalizedSlug
  );

  if (!match) {
    return null;
  }

  const doc = enrichDoc(match);
  return isValidDocMeta(doc.meta) ? doc : null;
}

export function getDocsByModule(module: DocModule): DocMeta[] {
  return getAllDocs().filter(doc => doc.module === module);
}
