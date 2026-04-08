'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

interface DocumentationSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultsCount: number;
  className?: string;
}

export function DocumentationSearch({
  value,
  onChange,
  resultsCount,
  className,
}: DocumentationSearchProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="Buscar por titulo, tags o resumen"
          className="h-11 border-slate-200 bg-white pl-10 pr-10 text-slate-900 shadow-sm focus-visible:ring-emerald-500"
          aria-label="Buscar documentacion"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Limpiar busqueda"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <p className="text-sm text-slate-500">
        {resultsCount} documento{resultsCount === 1 ? '' : 's'} encontrado
        {resultsCount === 1 ? '' : 's'}.
      </p>
    </div>
  );
}
