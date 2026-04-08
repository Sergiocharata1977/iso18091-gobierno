'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface TraceabilityItem {
  type: 'audit' | 'finding' | 'action';
  id: string;
  number: string;
  title: string;
}

interface TraceabilityBreadcrumbProps {
  items: TraceabilityItem[];
  currentId?: string;
}

export function TraceabilityBreadcrumb({
  items,
  currentId,
}: TraceabilityBreadcrumbProps) {
  const getHref = (item: TraceabilityItem) => {
    switch (item.type) {
      case 'audit':
        return `/mejoras/auditorias/${item.id}`;
      case 'finding':
        return `/mejoras/hallazgos/${item.id}`;
      case 'action':
        return `/mejoras/acciones/${item.id}`;
      default:
        return '#';
    }
  };

  const getLabel = (item: TraceabilityItem) => {
    switch (item.type) {
      case 'audit':
        return 'Auditoría';
      case 'finding':
        return 'Hallazgo';
      case 'action':
        return 'Acción';
      default:
        return '';
    }
  };

  if (items.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      {items.map((item, index) => {
        const isCurrent = item.id === currentId;
        const isLast = index === items.length - 1;

        return (
          <div key={item.id} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
            )}
            {isCurrent || isLast ? (
              <span className="font-medium text-gray-900">
                {getLabel(item)} {item.number}
              </span>
            ) : (
              <Link
                href={getHref(item)}
                className="hover:text-green-600 transition-colors"
              >
                {getLabel(item)} {item.number}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
