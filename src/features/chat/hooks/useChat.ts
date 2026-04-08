// Hook principal para el sistema de chat
// Gestiona estado, sesiones y mensajes

'use client';

import { EVENTS, trackEvent } from '@/lib/analytics/events';
import {
  getStoredAIConversationId,
  normalizeConverseMessages,
  sendConverseRequest,
  setStoredAIConversationId,
  setStoredActiveAISessionId,
} from '@/lib/ai/converseClient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AIMode,
  ChatConfig,
  ChatMessage,
  ChatSession,
  ChatState,
  DEFAULT_CHAT_CONFIG,
} from '../types';

interface UseChatOptions {
  userId: string;
  module?: string;
  screen?: string;
  autoCreateSession?: boolean;
}

interface UseChatReturn {
  state: ChatState;
  config: ChatConfig;
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  loadSessions: () => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  createSession: () => Promise<ChatSession | null>;
  deleteSession: (sessionId: string) => Promise<void>;
  messages: ChatMessage[];
  sendMessage: (content: string, inputType?: 'text' | 'voice') => Promise<void>;
  setAIMode: (mode: AIMode) => void;
  setAutoPlayVoice: (enabled: boolean) => void;
  setContinuousMode: (enabled: boolean) => void;
  setDarkMode: (enabled: boolean) => void;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  clearError: () => void;
}

type MinimalUnifiedMessage = {
  id?: string;
  role?: 'user' | 'assistant' | 'system';
  content?: string;
  traceId?: string;
  timestamp?: string | Date;
};

export function useChat(options: UseChatOptions): UseChatReturn {
  const { userId, module, screen, autoCreateSession = true } = options;

  const [state, setState] = useState<ChatState>({
    status: 'idle',
    currentSession: null,
    messages: [],
    error: null,
  });
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CHAT_CONFIG);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  const isInitialized = useRef(false);
  const abortController = useRef<AbortController | null>(null);
  const startedConversationSessionsRef = useRef<Set<string>>(new Set());

  const mapUnifiedMessageToChatMessage = useCallback(
    (sessionId: string, message: MinimalUnifiedMessage): ChatMessage => ({
      id: message.id || `ai-${message.role || 'message'}-${Date.now()}`,
      sessionId,
      organizationId: state.currentSession?.organizationId || '',
      role:
        message.role === 'assistant' || message.role === 'system'
          ? message.role
          : 'user',
      content: message.content || '',
      inputType: 'text',
      metadata: {
        provider: 'unified-ai-core',
        traceId: message.traceId,
      },
      createdAt: message.timestamp ? new Date(message.timestamp) : new Date(),
    }),
    [state.currentSession?.organizationId]
  );

  const loadSessions = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/chat/sessions?userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('[useChat] Error loading sessions:', error);
    }
  }, [userId]);

  const createSession = useCallback(async (): Promise<ChatSession | null> => {
    if (!userId) return null;

    setState(prev => ({ ...prev, status: 'connecting' }));

    try {
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: 'advisor',
          module,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();
      const session = data.session as ChatSession;
      setStoredActiveAISessionId(userId, session.id);

      setState(prev => ({
        ...prev,
        status: 'ready',
        currentSession: session,
        messages: [],
        error: null,
      }));

      setSessions(prev => [session, ...prev]);

      console.log('[useChat] Session created:', session.id);
      return session;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error creating session';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      return null;
    }
  }, [userId, module]);

  const selectSession = useCallback(
    async (sessionId: string) => {
      if (!userId) return;

      setState(prev => ({ ...prev, status: 'connecting' }));

      try {
        const response = await fetch(
          `/api/chat/sessions/${sessionId}?userId=${userId}`
        );

        if (!response.ok) {
          throw new Error('Failed to load session');
        }

        const data = await response.json();
        let nextMessages = data.messages || [];
        const mappedConversationId = getStoredAIConversationId(sessionId);

        if (mappedConversationId) {
          try {
            const historyResponse = await fetch(
              `/api/ai/conversations/${mappedConversationId}/history?limit=100`
            );

            if (historyResponse.ok) {
              const historyData = await historyResponse.json();
              nextMessages = normalizeConverseMessages(historyData).map(
                message =>
                  mapUnifiedMessageToChatMessage(
                    sessionId,
                    message as MinimalUnifiedMessage
                  )
              );
            }
          } catch (historyError) {
            console.warn(
              '[useChat] Error loading unified conversation history:',
              historyError
            );
          }
        }

        setStoredActiveAISessionId(userId, sessionId);

        setState(prev => ({
          ...prev,
          status: 'ready',
          currentSession: data.session,
          messages: nextMessages,
          error: null,
        }));

        console.log('[useChat] Session selected:', sessionId);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error loading session';
        setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      }
    },
    [mapUnifiedMessageToChatMessage, userId]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!userId) return;

      try {
        const response = await fetch(
          `/api/chat/sessions/${sessionId}?userId=${userId}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          throw new Error('Failed to delete session');
        }

        if (state.currentSession?.id === sessionId) {
          setStoredActiveAISessionId(userId, null);
        }

        setSessions(prev => prev.filter(session => session.id !== sessionId));

        if (state.currentSession?.id === sessionId) {
          setState(prev => ({
            ...prev,
            currentSession: null,
            messages: [],
          }));
        }

        console.log('[useChat] Session deleted:', sessionId);
      } catch (error) {
        console.error('[useChat] Error deleting session:', error);
      }
    },
    [state.currentSession?.id, userId]
  );

  const sendMessage = useCallback(
    async (content: string, inputType: 'text' | 'voice' = 'text') => {
      if (!userId || !content.trim()) return;

      let activeSession = state.currentSession;
      if (!activeSession) {
        const newSession = await createSession();
        if (!newSession) return;
        activeSession = newSession;
      }
      const sessionId = activeSession.id;
      const organizationId = activeSession.organizationId;

      if (!startedConversationSessionsRef.current.has(sessionId)) {
        startedConversationSessionsRef.current.add(sessionId);
        trackEvent(EVENTS.AI_CONVERSATION_STARTED, {
          channel: 'chat',
          module: module || null,
          screen: screen || null,
          orgId: organizationId || null,
        });
      }

      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      setState(prev => ({ ...prev, status: 'sending' }));

      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        sessionId,
        organizationId,
        role: 'user',
        content,
        inputType,
        createdAt: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, tempUserMessage],
      }));

      try {
        setStoredActiveAISessionId(userId, sessionId);

        const response = await sendConverseRequest({
          channel: 'chat',
          message: content,
          organizationId,
          sessionId,
          pathname: screen,
          signal: abortController.current.signal,
        });

        if (response.conversationId) {
          setStoredAIConversationId(sessionId, response.conversationId);
        }

        const normalizedMessages = normalizeConverseMessages(response);
        const userMessage =
          normalizedMessages.find(message => message.role === 'user') ||
          ({ role: 'user', content } as const);
        const assistantMessage =
          normalizedMessages.find(message => message.role === 'assistant') ||
          ({ role: 'assistant', content: response.reply } as const);

        setState(prev => ({
          ...prev,
          status: 'ready',
          messages: [
            ...prev.messages.filter(
              message => message.id !== tempUserMessage.id
            ),
            mapUnifiedMessageToChatMessage(
              sessionId,
              userMessage as MinimalUnifiedMessage
            ),
            mapUnifiedMessageToChatMessage(
              sessionId,
              assistantMessage as MinimalUnifiedMessage
            ),
          ],
          error: null,
        }));

        console.log('[useChat] Message sent via /api/ai/converse');
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          console.log('[useChat] Request aborted');
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Error sending message';

        setState(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));
      }
    },
    [
      createSession,
      mapUnifiedMessageToChatMessage,
      module,
      screen,
      state.currentSession,
      userId,
    ]
  );

  const setAIMode = useCallback((mode: AIMode) => {
    setConfig(prev => ({ ...prev, aiMode: mode }));
  }, []);

  const setAutoPlayVoice = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, autoPlayVoice: enabled }));
  }, []);

  const setContinuousMode = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, continuousMode: enabled }));
  }, []);

  const setDarkMode = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, darkMode: enabled }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, status: 'ready' }));
  }, []);

  useEffect(() => {
    if (!userId || isInitialized.current) return;

    isInitialized.current = true;

    const initialize = async () => {
      await loadSessions();

      if (autoCreateSession) {
        await createSession();
      }
    };

    void initialize();

    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [userId, autoCreateSession, loadSessions, createSession]);

  return {
    state,
    config,
    sessions,
    currentSession: state.currentSession,
    loadSessions,
    selectSession,
    createSession,
    deleteSession,
    messages: state.messages,
    sendMessage,
    setAIMode,
    setAutoPlayVoice,
    setContinuousMode,
    setDarkMode,
    isLoading: state.status === 'connecting',
    isSending: state.status === 'sending',
    error: state.error,
    clearError,
  };
}
