// src/components/crm/whatsapp/WhatsAppPanel.tsx
// Panel principal de WhatsApp para CRM (combina lista y chat)

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChatMessage, ChatWindow } from './ChatWindow';
import { ConversationItem, ConversationList } from './ConversationList';

interface WhatsAppPanelProps {
  vendedorId?: string; // Si se pasa, filtra por vendedor (para App)
  clienteId?: string; // Si se pasa, filtra por cliente
  className?: string;
}

export function WhatsAppPanel({
  vendedorId,
  clienteId,
  className,
}: WhatsAppPanelProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id;

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!organizationId) return;

    try {
      setLoadingConversations(true);
      const params = new URLSearchParams({
        organization_id: organizationId,
      });
      if (vendedorId) params.append('vendedor_id', vendedorId);
      if (clienteId) params.append('cliente_id', clienteId);

      const res = await fetch(`/api/whatsapp/conversations?${params}`);
      const data = await res.json();

      if (data.success) {
        setConversations(data.data || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [organizationId, vendedorId, clienteId]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(
        `/api/whatsapp/messages/${conversationId}?limit=100`
      );
      const data = await res.json();

      if (data.success) {
        // Reverse to show oldest first
        setMessages((data.data || []).reverse());
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    } else {
      setMessages([]);
    }
  }, [selectedConversation, loadMessages]);

  // Send message
  const handleSendMessage = async (body: string) => {
    if (!selectedConversation || !organizationId || !user) return;

    try {
      setSending(true);

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          conversation_id: selectedConversation.id,
          to: selectedConversation.phone,
          body,
          sender_user_id: user.id,
          sender_name: user.email?.split('@')[0] || 'Usuario',
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Add message to local state
        const newMessage: ChatMessage = {
          id: data.data.message_id,
          direction: 'OUTBOUND',
          body,
          status: 'sent',
          sender_name: user.email?.split('@')[0],
          created_at: new Date(),
        };
        setMessages(prev => [...prev, newMessage]);

        // Update conversation preview
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedConversation.id
              ? {
                  ...c,
                  ultimo_mensaje: body.substring(0, 50),
                  ultimo_mensaje_at: new Date(),
                }
              : c
          )
        );

        toast.success('Mensaje enviado');
      } else {
        toast.error(data.error || 'Error enviando mensaje');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  // Select conversation
  const handleSelectConversation = (conv: ConversationItem) => {
    setSelectedConversation(conv);
    // Mark as read (optional API call could be added)
  };

  return (
    <div className={`flex h-full ${className || ''}`}>
      {/* Conversations sidebar */}
      <Card className="w-80 flex-shrink-0 rounded-r-none border-r-0">
        <CardContent className="p-0 h-full">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            loading={loadingConversations}
          />
        </CardContent>
      </Card>

      {/* Chat area */}
      <Card className="flex-1 rounded-l-none">
        <CardContent className="p-0 h-full">
          {selectedConversation ? (
            <ChatWindow
              messages={messages}
              contactName={
                selectedConversation.cliente_nombre ||
                selectedConversation.phone
              }
              contactPhone={selectedConversation.phone}
              onSendMessage={handleSendMessage}
              loading={loadingMessages}
              sending={sending}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">WhatsApp CRM</h3>
              <p className="text-sm">
                Selecciona una conversación para ver los mensajes
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
