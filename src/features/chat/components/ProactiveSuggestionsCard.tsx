'use client';

import { cn } from '@/lib/utils';
import { ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ProactiveSuggestion } from '../services/ProactiveHintsService';

interface ProactiveSuggestionsCardProps {
  suggestions: ProactiveSuggestion[];
  onDismiss?: (id: string) => void;
}

export function ProactiveSuggestionsCard({
  suggestions,
  onDismiss,
}: ProactiveSuggestionsCardProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id));

  if (visibleSuggestions.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
    onDismiss?.(id);
  };

  const getTypeStyles = (tipo: ProactiveSuggestion['tipo']) => {
    switch (tipo) {
      case 'siguiente_paso':
        return 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800';
      case 'felicitacion':
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800';
      case 'recordatorio':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800';
      case 'alerta':
        return 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800';
    }
  };

  const getButtonStyles = (tipo: ProactiveSuggestion['tipo']) => {
    switch (tipo) {
      case 'siguiente_paso':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'felicitacion':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'recordatorio':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'alerta':
        return 'bg-red-600 hover:bg-red-700 text-white';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <span className="text-lg">💡</span>
        Sugerencias de Don Cándido
      </h3>

      {visibleSuggestions.slice(0, 3).map(suggestion => (
        <div
          key={suggestion.id}
          className={cn(
            'rounded-xl p-4 border transition-all',
            getTypeStyles(suggestion.tipo)
          )}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{suggestion.icono}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {suggestion.titulo}
                </h4>
                <button
                  onClick={() => handleDismiss(suggestion.id)}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
                  title="Descartar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {suggestion.mensaje}
              </p>
              {suggestion.accion && (
                <Link
                  href={suggestion.accion.ruta}
                  className={cn(
                    'inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    getButtonStyles(suggestion.tipo)
                  )}
                >
                  {suggestion.accion.texto}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
