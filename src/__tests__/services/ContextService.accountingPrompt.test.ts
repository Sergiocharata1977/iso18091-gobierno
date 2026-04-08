import { ContextService } from '@/features/chat/services/ContextService';
import type { ChatContext } from '@/features/chat/types';

describe('ContextService.generateSystemPrompt accounting context', () => {
  it('incluye resumen contable cuando el tenant tiene contexto financiero', () => {
    const prompt = ContextService.generateSystemPrompt({
      organization: {
        id: 'org-1',
        name: 'Org Demo',
      },
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'admin',
      },
      accounting: {
        currentPeriod: {
          code: '2026-03',
          status: 'abierto',
          totalEntries: 8,
          totalDebe: 2500,
          totalHaber: 2500,
          balanceMatches: true,
          cashBalance: 1200,
          billedThisMonth: 3400,
        },
        recentEntries: [
          {
            id: 'entry-1',
            fecha: '2026-03-25',
            descripcion: 'Factura CRM',
            status: 'posted',
            pluginId: 'crm',
            totalDebe: 1700,
            totalHaber: 1700,
            documentoTipo: 'crm_factura',
            documentoId: 'fac-1',
          },
        ],
        keyBalances: [
          {
            code: '1.1.01',
            name: 'Caja',
            nature: 'activo',
            balance: 1200,
          },
        ],
      },
    } as ChatContext);

    expect(prompt).toContain('## Contexto contable activo');
    expect(prompt).toContain('2026-03 (abierto)');
    expect(prompt).toContain('Saldo de caja y bancos');
    expect(prompt).toContain('Facturación/ingresos del período');
    expect(prompt).toContain('Si el usuario pregunta por saldos');
  });
});
