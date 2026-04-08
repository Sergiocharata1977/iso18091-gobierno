'use client';

import React from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}

function normalizeHeadingText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function buildTableOfContents(content: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const occurrences = new Map<string, number>();

  for (const line of content.split('\n')) {
    const match = line.match(/^(##|###)\s+(.*)$/);

    if (!match) {
      continue;
    }

    const [, marker, rawText] = match;
    const baseId = normalizeHeadingText(rawText);
    const count = occurrences.get(baseId) ?? 0;
    occurrences.set(baseId, count + 1);

    headings.push({
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
      text: rawText.trim(),
      level: marker === '##' ? 2 : 3,
    });
  }

  return headings;
}

function getNodeText(children: React.ReactNode): string {
  return Array.isArray(children)
    ? children.map(child => getNodeText(child)).join('')
    : typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : React.isValidElement<{ children?: React.ReactNode }>(children)
        ? getNodeText(children.props.children)
        : '';
}

interface DocumentationContentProps {
  content: string;
  className?: string;
}

export function DocumentationContent({
  content,
  className,
}: DocumentationContentProps) {
  const headings = buildTableOfContents(content);
  const headingOccurrences = new Map<string, number>();

  return (
    <div
      className={cn('grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]', className)}
    >
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6 md:p-8">
          <article className="prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-headings:text-slate-900 prose-p:leading-7 prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:text-emerald-800 hover:prose-a:underline prose-strong:text-slate-900 prose-li:text-slate-700 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-slate-800 prose-pre:border prose-pre:border-slate-200 prose-pre:bg-slate-950 prose-blockquote:border-l-emerald-500">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children, ...props }) => {
                  const text = getNodeText(children);
                  const baseId = normalizeHeadingText(text);
                  const count = headingOccurrences.get(baseId) ?? 0;
                  headingOccurrences.set(baseId, count + 1);
                  const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

                  return (
                    <h2 id={id} {...props}>
                      {children}
                    </h2>
                  );
                },
                h3: ({ children, ...props }) => {
                  const text = getNodeText(children);
                  const baseId = normalizeHeadingText(text);
                  const count = headingOccurrences.get(baseId) ?? 0;
                  headingOccurrences.set(baseId, count + 1);
                  const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

                  return (
                    <h3 id={id} {...props}>
                      {children}
                    </h3>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        </CardContent>
      </Card>

      <aside className="h-fit xl:sticky xl:top-6">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Tabla de contenidos
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  Secciones
                </h2>
              </div>

              {headings.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Este documento todavia no tiene secciones detectables.
                </p>
              ) : (
                <nav aria-label="Tabla de contenidos">
                  <ul className="space-y-2">
                    {headings.map(heading => (
                      <li key={heading.id}>
                        <Link
                          href={`#${heading.id}`}
                          className={cn(
                            'block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-emerald-700',
                            heading.level === 3 && 'ml-4 text-xs'
                          )}
                        >
                          {heading.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
