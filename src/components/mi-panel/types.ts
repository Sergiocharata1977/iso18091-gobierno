'use client';

import type { ChatSession } from '@/features/chat/types';
import type { UserPrivateTask } from '@/types/private-sections';

export type MiPanelUnifiedMessage = {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  channel: 'voice' | 'chat' | 'whatsapp';
  content: string;
  traceId?: string;
  timestamp?: string | Date;
};

export type MiPanelSession = ChatSession & {
  conversationId?: string | null;
  messages?: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string | Date;
    metadata?: {
      conversationId?: string;
      traceId?: string;
      [key: string]: unknown;
    };
  }>;
  unifiedMessages?: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string | Date;
    source: 'ai';
    channel?: 'voice' | 'chat' | 'whatsapp';
    traceId?: string;
  }>;
};

export type ConsolidationItem = {
  label: string;
  detail: string;
  ready: boolean;
};

export type TasksCardTask = UserPrivateTask;
