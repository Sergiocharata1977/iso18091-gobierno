import { createNCTool } from '@/services/ai-core/tools/createNC';
import { getDashboardDataTool } from '@/services/ai-core/tools/getDashboardData';
import { getPendingTasksTool } from '@/services/ai-core/tools/getPendingTasks';
import { navigateUserToTool } from '@/services/ai-core/tools/navigateUserTo';
import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
} from '@/types/ai-tools';

const TOOLS: ToolDefinition[] = [
  createNCTool,
  navigateUserToTool,
  getPendingTasksTool,
  getDashboardDataTool,
];

export class AIToolRegistry {
  static list(): ToolDefinition[] {
    return TOOLS;
  }

  static pick(inputText: string): ToolDefinition | null {
    let best: { tool: ToolDefinition; score: number } | null = null;
    for (const tool of TOOLS) {
      if (!tool.matches(inputText)) continue;
      const score =
        typeof tool.score === 'function' ? tool.score(inputText) : 1;
      if (!best || score > best.score) {
        best = { tool, score };
      }
    }
    return best?.tool || null;
  }

  static async executeFirstMatch(
    inputText: string,
    ctx: ToolExecutionContext
  ): Promise<
    | { matched: false; result: null }
    | { matched: true; tool: ToolDefinition; result: ToolExecutionResult }
  > {
    const tool = this.pick(inputText);
    if (!tool) return { matched: false, result: null };
    const result = await tool.execute(ctx);
    return { matched: true, tool, result };
  }
}
