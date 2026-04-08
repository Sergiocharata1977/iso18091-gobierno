import type { ToolDefinition } from '@/types/ai-tools';

function resolvePath(input: string): string {
  const text = input.toLowerCase();
  if (text.includes('no conform')) return '/no-conformidades';
  if (text.includes('proceso')) return '/procesos';
  if (text.includes('document')) return '/documentos';
  if (text.includes('indicador')) return '/indicadores';
  return '/mi-panel';
}

export const navigateUserToTool: ToolDefinition = {
  name: 'navigateUserTo',
  description: 'Navega al usuario a una pantalla solicitada',
  matches: inputText => /(llevame|ir a|abrir|mostrar)/i.test(inputText),
  score: inputText => {
    let score = 10;
    if (/(llevame|ll[eé]vame|ir a)/i.test(inputText)) score += 50;
    if (/(abrir|mostrar)/i.test(inputText)) score += 20;
    if (/(no conform|proceso|document|indicador)/i.test(inputText)) score += 20;
    return score;
  },
  async execute(ctx) {
    const path = resolvePath(ctx.inputText);
    return {
      success: true,
      text: `Te llevo a ${path}.`,
      data: { path },
      uiCommands: [{ type: 'NAVIGATE', payload: { path } }],
      actionLogAction: 'navigate',
    };
  },
};
