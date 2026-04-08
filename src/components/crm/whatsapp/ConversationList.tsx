// src/components/crm/whatsapp/ConversationList.tsx
// Lista de conversaciones WhatsApp para CRM

'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, Search, User } from 'lucide-react';
import { useState } from 'react';

export interface ConversationItem {
  id: string;
  cliente_nombre: string;
  phone: string;
  ultimo_mensaje: string;
  ultimo_mensaje_at: Date | string;
  mensajes_no_leidos: number;
  vendedor_nombre?: string;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  selectedId?: string;
  onSelect: (conversation: ConversationItem) => void;
  loading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter(
    conv =>
      conv.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.phone?.includes(searchTerm)
  );

  const formatTime = (dateInput: Date | string) => {
    const date =
      typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversación..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">No hay conversaciones</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  'w-full p-3 text-left hover:bg-accent transition-colors',
                  selectedId === conv.id && 'bg-accent'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      conv.mensajes_no_leidos > 0
                        ? 'bg-green-500 text-white'
                        : 'bg-muted'
                    )}
                  >
                    <User className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate">
                        {conv.cliente_nombre || conv.phone}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conv.ultimo_mensaje_at)}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground truncate">
                      {conv.ultimo_mensaje || 'Sin mensajes'}
                    </p>

                    <div className="flex items-center justify-between mt-1">
                      {conv.vendedor_nombre && (
                        <span className="text-xs text-muted-foreground">
                          {conv.vendedor_nombre}
                        </span>
                      )}
                      {conv.mensajes_no_leidos > 0 && (
                        <Badge
                          variant="default"
                          className="bg-green-500 hover:bg-green-600"
                        >
                          {conv.mensajes_no_leidos}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
