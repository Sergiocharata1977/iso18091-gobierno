import { ContextBuilder } from '@/ai/services/ContextBuilder';

describe('ContextBuilder', () => {
  it('normaliza contexto chat y mantiene adapter legacy', () => {
    const unified = ContextBuilder.build({
      organizationId: 'org-1',
      profile: 'chat',
      sources: {
        organization: {
          id: 'org-1',
          name: 'Organizacion Demo',
          mission: 'M'.repeat(500),
          vision: 'Vision clara',
          scope: 'Alcance del sistema',
        },
        user: {
          id: 'user-1',
          email: 'qa@example.com',
          organizationId: 'org-1',
          displayName: 'Usuario QA',
          role: 'admin',
        },
        personnel: {
          id: 'per-1',
          fullName: 'Ana Perez',
          position: 'Coordinadora de Calidad',
          department: 'Calidad',
          supervisorName: 'Gerencia General',
        },
        assignments: {
          processes: Array.from({ length: 7 }, (_, i) => ({
            id: `p-${i}`,
            name: `Proceso ${i}`,
          })),
          objectives: [{ id: 'o-1', name: 'Objetivo 1' }],
          indicators: [{ id: 'i-1', name: 'Indicador 1' }],
        },
        compliance: {
          organizationId: 'org-1',
          globalPercentage: 101,
          mandatoryPending: 2,
          highPriorityPending: 1,
        },
        accounting: {
          organizationId: 'org-1',
          currentPeriod: {
            code: '2026-03',
            status: 'abierto',
            totalEntries: 12,
            totalDebe: 1000,
            totalHaber: 1000,
            balanceMatches: true,
            cashBalance: 500,
            billedThisMonth: 1200,
          },
          recentEntries: [
            {
              id: 'entry-1',
              fecha: '2026-03-26',
              descripcion: 'Cobro CRM',
              status: 'posted',
              pluginId: 'crm',
              totalDebe: 500,
              totalHaber: 500,
              documentoTipo: 'crm_cobro',
              documentoId: 'cobro-1',
            },
          ],
          keyBalances: [
            {
              code: '1.1.01',
              name: 'Caja',
              nature: 'activo',
              balance: 500,
            },
          ],
        },
      },
    });

    expect(unified.meta.profile).toBe('chat');
    expect(unified.assignments?.counts.processes).toBe(7);
    expect(unified.assignments?.processes).toHaveLength(5);
    expect(unified.compliance?.globalPercentage).toBe(100);
    expect(unified.meta.sanitization.truncatedLists).toBeGreaterThan(0);
    expect(unified.meta.sanitization.truncatedStrings).toBeGreaterThan(0);

    const legacy = ContextBuilder.toLegacyChatContext(unified);
    expect(legacy.user.id).toBe('user-1');
    expect(legacy.personnel?.position).toBe('Coordinadora de Calidad');
    expect(legacy.assignments?.processes).toHaveLength(5);
    expect(legacy.accounting?.currentPeriod?.code).toBe('2026-03');
    expect(legacy.accounting?.currentPeriod?.cashBalance).toBe(500);
  });

  it('soporta usuario sin personnel, sin assignments y sin compliance', () => {
    const unified = ContextBuilder.build({
      organizationId: 'org-1',
      profile: 'evaluation',
      sources: {
        organization: { id: 'org-1', name: 'Org' },
        user: {
          id: 'user-2',
          email: 'ops@example.com',
          organizationId: 'org-1',
          role: 'operario',
        },
      },
    });

    expect(unified.personnel).toBeUndefined();
    expect(unified.assignments).toBeUndefined();
    expect(unified.compliance).toBeUndefined();

    const legacy = ContextBuilder.toLegacyChatContext(unified);
    expect(legacy.personnel).toBeUndefined();
    expect(legacy.assignments).toBeUndefined();
    expect(legacy.compliance).toBeUndefined();
  });

  it('valida org-scope y evita mezclar tenants', () => {
    expect(() =>
      ContextBuilder.build({
        organizationId: 'org-a',
        profile: 'agent_ops',
        sources: {
          organization: { id: 'org-a', name: 'Org A' },
          user: {
            id: 'user-1',
            email: 'user@example.com',
            organizationId: 'org-b',
            role: 'admin',
          },
        },
      })
    ).toThrow('org-scope mismatch');
  });

  it('trunca payload de implementacion segun perfil', () => {
    const unified = ContextBuilder.build({
      organizationId: 'org-1',
      profile: 'document',
      sources: {
        organization: { id: 'org-1', name: 'Org' },
        implementation: {
          organization_id: 'org-1',
          organization_name: 'Org',
          implementation_stage: 3,
          existing_processes: Array.from({ length: 25 }, (_, i) => ({
            id: `proc-${i}`,
            codigo: `P-${i}`,
            nombre: `Proceso ${i}`,
          })),
          objectives: Array.from({ length: 30 }, (_, i) => `Objetivo ${i}`),
          iso_status_summary: {
            planning: 40,
            hr: 50,
            processes: 60,
            documents: 70,
            quality: 80,
            improvements: 90,
            global_score: 75,
            critical_gaps: Array.from({ length: 20 }, (_, i) => `Gap ${i}`),
          },
        },
      },
    });

    expect(unified.implementation?.existingProcesses).toHaveLength(20);
    expect(unified.implementation?.objectives).toHaveLength(20);
    expect(unified.implementation?.isoStatusSummary?.criticalGaps).toHaveLength(
      10
    );
  });
});
