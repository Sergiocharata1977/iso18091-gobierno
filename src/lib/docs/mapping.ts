import type { DocMeta } from '@/types/docs';

import { getAllDocs } from './loader';

const ROUTE_ALIASES: Array<[from: string, to: string]> = [
  ['/quality/objetivos', '/procesos/objetivos'],
  ['/quality/indicadores', '/procesos/indicadores'],
  ['/quality/mediciones', '/procesos/mediciones'],
  ['/rrhh/trainings', '/rrhh/capacitaciones'],
  ['/rrhh/evaluations', '/rrhh/evaluaciones'],
  ['/rrhh/personnel', '/rrhh/personal'],
];

function normalizePathname(pathname: string): string {
  const [withoutQuery] = pathname.split('?');
  const [withoutHash] = withoutQuery.split('#');
  const trimmed = withoutHash.trim();

  if (!trimmed || trimmed === '/') {
    return '/';
  }

  const normalized = `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
  const withoutDashboardPrefix = normalized.replace(/^\/dashboard(?=\/|$)/, '');

  return ROUTE_ALIASES.reduce((currentPath, [from, to]) => {
    if (currentPath === from) {
      return to;
    }

    if (currentPath.startsWith(`${from}/`)) {
      return `${to}${currentPath.slice(from.length)}`;
    }

    return currentPath;
  }, withoutDashboardPrefix || '/');
}

function routePatternToRegex(routePattern: string): RegExp {
  const normalized = normalizePathname(routePattern);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withDynamicSegments = escaped
    .replace(/\\\[\.{3}[^\]]+\\\]/g, '.+')
    .replace(/\\\[[^\]]+\\\]/g, '[^/]+')
    .replace(/\\\*/g, '.*');

  return new RegExp(`^${withDynamicSegments}$`);
}

function matchesRoute(pathname: string, routePattern: string): boolean {
  const normalizedPath = normalizePathname(pathname);
  const normalizedPattern = normalizePathname(routePattern);

  if (normalizedPath === normalizedPattern) {
    return true;
  }

  if (
    normalizedPattern !== '/' &&
    !normalizedPattern.includes('[') &&
    !normalizedPattern.includes('*') &&
    normalizedPath.startsWith(`${normalizedPattern}/`)
  ) {
    return true;
  }

  return routePatternToRegex(normalizedPattern).test(normalizedPath);
}

function isRelevantForRoute(doc: DocMeta, pathname: string): boolean {
  if (doc.screen && matchesRoute(pathname, doc.screen)) {
    return true;
  }

  return doc.relatedRoutes.some(route => matchesRoute(pathname, route));
}

export function getDocsForRoute(pathname: string): DocMeta[] {
  return getAllDocs()
    .filter(doc => isRelevantForRoute(doc, pathname))
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.title.localeCompare(right.title, 'es');
    });
}
