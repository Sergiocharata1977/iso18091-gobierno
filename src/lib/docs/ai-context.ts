import type { DocMeta, DocModule } from '@/types/docs';

import { getAllDocs, getDocBySlug, getDocsByModule } from './loader';
import { getDocsForRoute } from './mapping';

const DEFAULT_MAX_CHARS = 3200;

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('es');
}

function normalizePathname(pathname: string): string {
  const [withoutQuery] = pathname.split('?');
  const [withoutHash] = withoutQuery.split('#');
  const trimmed = withoutHash.trim();

  if (!trimmed || trimmed === '/') {
    return '/';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[*-]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimToLength(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

function resolveDocRoleMatch(doc: DocMeta, userRole?: string): boolean {
  if (!userRole) {
    return false;
  }

  const normalizedRole = normalizeText(userRole);
  return doc.roles.some(role => normalizeText(role) === normalizedRole);
}

function inferModuleFromPathname(pathname: string): DocModule | null {
  const normalizedPath = normalizePathname(pathname);
  const activeDocs = getAllDocs().filter(doc => doc.status === 'active');

  const routeMatches = getDocsForRoute(normalizedPath).filter(
    doc => doc.status === 'active'
  );
  if (routeMatches.length > 0) {
    return routeMatches[0].module;
  }

  const segments = normalizedPath
    .split('/')
    .map(segment => normalizeText(segment))
    .filter(Boolean);

  const directSegmentMap: Partial<Record<string, DocModule>> = {
    rrhh: 'rrhh',
    procesos: 'procesos',
    documentos: 'documentos',
    crm: 'crm',
    contabilidad: 'contabilidad',
    auditorias: 'auditorias',
    hallazgos: 'hallazgos',
    acciones: 'acciones',
    'mi-panel': 'mi-panel',
    chat: 'don-candido',
    'historial-conversaciones': 'don-candido',
    mensajes: 'mensajes',
    ejecutivo: 'ejecutivo',
    noticias: 'noticias',
    calendario: 'calendario',
    sgsi: 'sgsi',
    terminales: 'terminales',
    hse: 'hse',
    dealer: 'dealer',
    solicitudes: 'dealer',
    compras: 'dealer',
    admin: 'admin',
    agentes: 'agentes',
    'centro-agentico': 'agentes',
    revisiones: 'revisiones',
    'mi-departamento': 'rrhh',
    'puntos-norma': 'procesos',
    'mapa-procesos': 'procesos',
  };

  for (const segment of segments) {
    const directModule = directSegmentMap[segment];
    if (directModule) {
      return directModule;
    }
  }

  const moduleScores = new Map<DocModule, number>();
  for (const doc of activeDocs) {
    const score = segments.reduce((acc, segment) => {
      if (normalizeText(doc.module).includes(segment)) {
        return acc + 3;
      }

      return (
        acc +
        doc.tags.reduce(
          (tagAcc, tag) =>
            tagAcc + (normalizeText(tag).includes(segment) ? 1 : 0),
          0
        )
      );
    }, 0);

    if (score > 0) {
      moduleScores.set(doc.module, (moduleScores.get(doc.module) || 0) + score);
    }
  }

  const rankedModules = [...moduleScores.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0], 'es');
  });

  return rankedModules[0]?.[0] || null;
}

function rankDocsForPathname(pathname: string, userRole?: string): DocMeta[] {
  const normalizedPath = normalizePathname(pathname);
  const activeDocs = getAllDocs().filter(doc => doc.status === 'active');
  const routeMatchSlugs = new Set(
    getDocsForRoute(normalizedPath)
      .filter(doc => doc.status === 'active')
      .map(doc => doc.slug)
  );
  const inferredModule = inferModuleFromPathname(normalizedPath);
  const pathSegments = normalizedPath
    .split('/')
    .map(segment => normalizeText(segment))
    .filter(Boolean);

  const scoredDocs = new Map<string, { doc: DocMeta; score: number }>();

  const registerScore = (doc: DocMeta, score: number) => {
    const current = scoredDocs.get(doc.slug);
    if (!current || score > current.score) {
      scoredDocs.set(doc.slug, { doc, score });
    }
  };

  for (const doc of activeDocs) {
    let score = 0;

    if (doc.screen && normalizePathname(doc.screen) === normalizedPath) {
      score += 400;
    } else if (routeMatchSlugs.has(doc.slug)) {
      score += 300;
    }

    if (inferredModule && doc.module === inferredModule) {
      score += 200;
    }

    const tagMatches = doc.tags.reduce(
      (acc, tag) =>
        acc +
        (pathSegments.some(
          segment =>
            normalizeText(tag).includes(segment) ||
            segment.includes(normalizeText(tag))
        )
          ? 1
          : 0),
      0
    );
    if (tagMatches > 0) {
      score += 100 + tagMatches * 10;
    }

    if (resolveDocRoleMatch(doc, userRole)) {
      score += 25;
    }

    if (score > 0) {
      registerScore(doc, score);
    }
  }

  return [...scoredDocs.values()]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.doc.order !== right.doc.order) {
        return left.doc.order - right.doc.order;
      }

      return left.doc.title.localeCompare(right.doc.title, 'es');
    })
    .map(entry => entry.doc);
}

export function formatDocsForPrompt(
  docs: DocMeta[],
  maxChars = DEFAULT_MAX_CHARS
): string {
  const activeDocs = docs.filter(doc => doc.status === 'active');
  if (activeDocs.length === 0 || maxChars <= 0) {
    return '';
  }

  const sections: string[] = [];
  let currentLength = 0;

  for (const meta of activeDocs) {
    const doc = getDocBySlug(meta.slug);
    if (!doc || doc.meta.status !== 'active') {
      continue;
    }

    const contentExcerpt = trimToLength(stripMarkdown(doc.content), 900);
    const section = [
      `Documento: ${doc.meta.title}`,
      `Modulo: ${doc.meta.module}`,
      `Pantalla: ${doc.meta.screen || 'sin pantalla declarada'}`,
      `Resumen: ${doc.meta.summary}`,
      doc.meta.tags.length > 0 ? `Tags: ${doc.meta.tags.join(', ')}` : '',
      contentExcerpt ? `Contenido clave: ${contentExcerpt}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const separator = sections.length > 0 ? '\n\n---\n\n' : '';
    const remainingChars = maxChars - currentLength - separator.length;
    if (remainingChars <= 0) {
      break;
    }

    const trimmedSection = trimToLength(section, remainingChars);
    sections.push(`${separator}${trimmedSection}`);
    currentLength += separator.length + trimmedSection.length;

    if (trimmedSection.length < section.length) {
      break;
    }
  }

  return sections.join('');
}

export function getDocSummariesForModule(module: DocModule): string {
  const docs = getDocsByModule(module).filter(doc => doc.status === 'active');

  if (docs.length === 0) {
    return '';
  }

  return docs
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.title.localeCompare(right.title, 'es');
    })
    .map(
      doc =>
        `- ${doc.title}: ${doc.summary}${doc.tags.length > 0 ? ` [${doc.tags.join(', ')}]` : ''}`
    )
    .join('\n');
}

export function getContextDocsForScreen(
  pathname: string,
  userRole?: string
): string {
  const rankedDocs = rankDocsForPathname(pathname, userRole);
  return formatDocsForPrompt(rankedDocs);
}
