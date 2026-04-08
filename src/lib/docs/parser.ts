import type { Doc, DocCategory, DocMeta, DocModule } from '@/types/docs';

const FRONTMATTER_REGEX = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/;
const ARRAY_ITEM_REGEX = /^-\s+(.*)$/;
const QUOTED_VALUE_REGEX = /^(['"])(.*)\1$/;

type FrontmatterValue = string | string[] | number | boolean;

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(QUOTED_VALUE_REGEX);
  return match ? match[2] : trimmed;
}

function parseInlineArray(value: string): string[] {
  const normalized = value.trim();

  if (!normalized.startsWith('[') || !normalized.endsWith(']')) {
    return [];
  }

  const inner = normalized.slice(1, -1).trim();

  if (!inner) {
    return [];
  }

  return inner
    .split(',')
    .map(item => stripQuotes(item))
    .filter(Boolean);
}

function parseScalar(rawValue: string): FrontmatterValue {
  const value = stripQuotes(rawValue);

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    return parseInlineArray(value);
  }

  return value;
}

function parseFrontmatter(
  frontmatter: string
): Record<string, FrontmatterValue> {
  const result: Record<string, FrontmatterValue> = {};
  const lines = frontmatter.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (!rawValue) {
      const items: string[] = [];

      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1];
        const nextTrimmed = nextLine.trim();

        if (!nextTrimmed) {
          index += 1;
          continue;
        }

        const itemMatch = nextTrimmed.match(ARRAY_ITEM_REGEX);
        if (!itemMatch) {
          break;
        }

        items.push(stripQuotes(itemMatch[1]));
        index += 1;
      }

      result[key] = items;
      continue;
    }

    result[key] = parseScalar(rawValue);
  }

  return result;
}

function toStringArray(value: FrontmatterValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map(item => stripQuotes(item))
      .filter(Boolean);
  }

  return [];
}

function toDocMeta(frontmatter: Record<string, FrontmatterValue>): DocMeta {
  return {
    title: String(frontmatter.title ?? ''),
    slug: String(frontmatter.slug ?? ''),
    module: String(frontmatter.module ?? '') as DocModule,
    screen: String(frontmatter.screen ?? ''),
    summary: String(frontmatter.summary ?? ''),
    roles: toStringArray(frontmatter.roles),
    tags: toStringArray(frontmatter.tags),
    relatedRoutes: toStringArray(frontmatter.relatedRoutes),
    entity: frontmatter.entity ? String(frontmatter.entity) : undefined,
    order: typeof frontmatter.order === 'number' ? frontmatter.order : 0,
    status: String(frontmatter.status ?? 'draft') as DocMeta['status'],
    category: String(frontmatter.category ?? 'usuario') as DocCategory,
    lastValidated: String(frontmatter.lastValidated ?? ''),
  };
}

export function parseDoc(rawContent: string): Doc {
  const match = rawContent.match(FRONTMATTER_REGEX);

  if (!match) {
    return {
      meta: toDocMeta({}),
      content: rawContent.trim(),
    };
  }

  const [, frontmatterBlock] = match;
  const content = rawContent.slice(match[0].length).trim();

  return {
    meta: toDocMeta(parseFrontmatter(frontmatterBlock)),
    content,
  };
}
