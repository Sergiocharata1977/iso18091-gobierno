'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { WhatsAppMessageV2 } from '@/types/whatsapp';

interface ConversationSearchProps {
  conversationId: string;
  onResultsChange: (messageIds: string[]) => void;
}

export function ConversationSearch({
  conversationId,
  onResultsChange,
}: ConversationSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (trimmedQuery.length < 3) {
      setLoading(false);
      setResultCount(0);
      setHasSearched(false);
      onResultsChange([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = `/api/whatsapp/conversations/${conversationId}/messages?search=${encodeURIComponent(trimmedQuery)}`;
        const res = await fetch(url, { cache: 'no-store' });
        const json = (await res.json()) as {
          success: boolean;
          data?: WhatsAppMessageV2[];
        };
        const data = json.success ? (json.data ?? []) : [];
        setResultCount(data.length);
        setHasSearched(true);
        onResultsChange(data.map(msg => msg.id));
      } catch {
        setResultCount(0);
        setHasSearched(true);
        onResultsChange([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [conversationId, onResultsChange, trimmedQuery]);

  const clearSearch = () => {
    setQuery('');
    setResultCount(0);
    setHasSearched(false);
    onResultsChange([]);
  };

  return (
    <div className="space-y-2 border-b border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar en chat..."
            className="h-9 border-slate-700 bg-slate-800 pl-9 pr-9 text-slate-100 placeholder:text-slate-500"
          />
          {loading ? (
            <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          onClick={clearSearch}
          title="Limpiar búsqueda"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {trimmedQuery.length >= 3 && !loading ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-slate-600 bg-slate-800/50 text-slate-300">
            {resultCount} {resultCount === 1 ? 'mensaje encontrado' : 'mensajes encontrados'}
          </Badge>
          {hasSearched && resultCount === 0 ? (
            <span className="text-xs text-slate-400">Sin resultados para "{trimmedQuery}"</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type { ConversationSearchProps };
