import { UserContextService } from '@/services/context/UserContextService';
import type { ToolDefinition } from '@/types/ai-tools';

export const getDashboardDataTool: ToolDefinition = {
  name: 'getDashboardData',
  description:
    'Resume datos reales de contexto/dashboard del usuario (MVP conectado)',
  matches: inputText =>
    /(dashboard|indicador|satisfaccion|satisfacción|grafico|gr[aá]fico|kpi)/i.test(
      inputText
    ),
  score: inputText => {
    let score = 0;
    if (/(dashboard|panel)/i.test(inputText)) score += 40;
    if (/(indicador|kpi)/i.test(inputText)) score += 40;
    if (/(satisfaccion|satisfacción|grafico|gr[aá]fico)/i.test(inputText))
      score += 20;
    return score;
  },
  async execute(ctx) {
    const userCtx = await UserContextService.getUserFullContext(ctx.userId);

    const procesos = userCtx.procesos?.length || 0;
    const objetivos = userCtx.objetivos?.length || 0;
    const indicadores = userCtx.indicadores?.length || 0;
    const processRecords = userCtx.processRecords?.length || 0;
    const compliance = userCtx.complianceData || null;

    const text = [
      `Resumen de tu panel: ${procesos} procesos`,
      `${objetivos} objetivos`,
      `${indicadores} indicadores`,
      `${processRecords} registros de proceso`,
      compliance
        ? `cumplimiento normativo global ${compliance.global_percentage}%`
        : null,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      success: true,
      text: `${text}. Si queres, te explico un indicador puntual o te llevo a la vista correspondiente.`,
      data: {
        procesos,
        objetivos,
        indicadores,
        processRecords,
        compliance,
        source: 'UserContextService',
      },
      actionLogAction: 'read_dashboard_data',
    };
  },
};
