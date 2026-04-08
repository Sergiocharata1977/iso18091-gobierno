// src/components/crm/whatsapp/ChatWindow.tsx
// Ventana de chat WhatsApp para CRM

'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, CheckCheck, Loader2, Send, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface ChatMessage {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  status?: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  sender_name?: string;
  created_at: Date | string;
  media_url?: string;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  contactName: string;
  contactPhone: string;
  onSendMessage: (message: string) => Promise<void>;
  loading?: boolean;
  sending?: boolean;
}

export function ChatWindow({
  messages,
  contactName,
  contactPhone,
  onSendMessage,
  loading,
  sending,
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    const message = newMessage;
    setNewMessage('');
    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateInput: Date | string) => {
    const date =
      typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return format(date, 'HH:mm', { locale: es });
  };

  const formatDate = (dateInput: Date | string) => {
    const date =
      typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return format(date, "d 'de' MMMM", { locale: es });
  };

  const renderStatusIcon = (status?: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'failed':
        return <span className="text-xs text-red-500">Error</span>;
      default:
        return <Check className="h-3 w-3 text-muted-foreground" />;
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = formatDate(message.created_at);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, ChatMessage[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">{contactName}</h3>
          <p className="text-sm text-muted-foreground">{contactPhone}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex justify-center mb-4">
                <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                  {date}
                </span>
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {dateMessages.map(message => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.direction === 'OUTBOUND'
                        ? 'justify-end'
                        : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg px-3 py-2',
                        message.direction === 'OUTBOUND'
                          ? 'bg-green-500 text-white'
                          : 'bg-muted'
                      )}
                    >
                      {/* Media if exists */}
                      {message.media_url && (
                        <img
                          src={message.media_url}
                          alt="Media"
                          className="max-w-full rounded mb-2"
                        />
                      )}

                      {/* Message body */}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.body}
                      </p>

                      {/* Time and status */}
                      <div
                        className={cn(
                          'flex items-center justify-end gap-1 mt-1',
                          message.direction === 'OUTBOUND'
                            ? 'text-white/70'
                            : 'text-muted-foreground'
                        )}
                      >
                        <span className="text-xs">
                          {formatTime(message.created_at)}
                        </span>
                        {message.direction === 'OUTBOUND' &&
                          renderStatusIcon(message.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>No hay mensajes en esta conversación</p>
              <p className="text-sm">Envía el primer mensaje</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="bg-green-500 hover:bg-green-600 h-11 w-11"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
