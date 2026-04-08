import type { AIChannel, UICommand } from '@/types/ai-core';

export type UICommandType = UICommand['type'];

export interface ToolExecutionContext {
  userId: string;
  organizationId: string;
  channel: AIChannel;
  inputText: string;
}

export interface ToolExecutionResult {
  success: boolean;
  text: string;
  data?: Record<string, unknown>;
  uiCommands?: UICommand[];
  actionLogAction?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  matches: (inputText: string) => boolean;
  score?: (inputText: string) => number;
  execute: (ctx: ToolExecutionContext) => Promise<ToolExecutionResult>;
}
