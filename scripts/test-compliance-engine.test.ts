import { ProcessComplianceEngine } from '../src/services/processes/ProcessComplianceEngine';
import {
  createEmptySIPOC,
  ProcessDefinition,
  ProcessSIPOC,
} from '../src/types/processes-unified';

// Mock del servicio administrativo para evitar dependencias de Firebase en el test local
jest.mock(
  '../src/services/processRecords/ProcessDefinitionServiceAdmin',
  () => ({
    ProcessDefinitionServiceAdmin: {
      getByIdWithRelations: jest.fn(),
    },
  })
);

import { ProcessDefinitionServiceAdmin } from '../src/services/processRecords/ProcessDefinitionServiceAdmin';

describe('Process Compliance Engine', () => {
  const mockProcessId = 'proc-123';
  const mockOrgId = 'org-abc';

  const baseProcess: ProcessDefinition = {
    id: mockProcessId,
    organization_id: mockOrgId,
    process_code: 'PROC-001',
    nombre: 'Proceso de Prueba',
    category_id: 3,
    status: 'active',
    version: '1.0',
    activo: true,
    created_by: 'system',
    created_at: new Date() as any,
    updated_by: 'system',
    updated_at: new Date() as any,
    sipoc: createEmptySIPOC(),
    // otros campos requeridos...
  } as ProcessDefinition;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Nivel 1: Proceso vacío debería tener madurez 1', async () => {
    (
      ProcessDefinitionServiceAdmin.getByIdWithRelations as jest.Mock
    ).mockResolvedValue(baseProcess);

    const report = await ProcessComplianceEngine.generateReport(
      mockProcessId,
      mockOrgId
    );

    expect(report.maturity.level).toBe(1);
    expect(report.maturity.score).toBe(20);
    expect(report.missing_controls_count).toBe(0); // No activities -> no controls needed yet
  });

  test('Nivel 2: Estructura SIPOC completa', async () => {
    const sipocLevel2: ProcessSIPOC = {
      ...createEmptySIPOC(),
      inputs: [
        { id: 'i1', description: 'Input 1', required: true, supplier: 'Prov' },
      ],
      activities: [{ id: 'a1', step: 1, name: 'Act 1', description: 'Desc 1' }],
      outputs: [{ id: 'o1', description: 'Output 1', customer: 'Cli' }],
    };

    (
      ProcessDefinitionServiceAdmin.getByIdWithRelations as jest.Mock
    ).mockResolvedValue({
      ...baseProcess,
      sipoc: sipocLevel2,
    });

    const report = await ProcessComplianceEngine.generateReport(
      mockProcessId,
      mockOrgId
    );

    // Debe ser nivel 2, pero sin controles tendrá warnings/next steps
    expect(report.maturity.level).toBe(2);
    expect(report.maturity.next_steps).toContain(
      'Definir controles para las actividades'
    );
    expect(report.inconsistencies.some(i => i.type === 'missing_control')).toBe(
      true
    );
  });

  test('Nivel 3: Controles y Riesgos', async () => {
    const sipocLevel3: ProcessSIPOC = {
      ...createEmptySIPOC(),
      inputs: [
        { id: 'i1', description: 'Input 1', required: true, supplier: 'Prov' },
      ],
      activities: [{ id: 'a1', step: 1, name: 'Act 1', description: 'Desc 1' }],
      outputs: [{ id: 'o1', description: 'Output 1', customer: 'Cli' }],
      controls: [
        {
          id: 'c1',
          description: 'Control 1',
          type: 'review',
          frequency: 'Mensual',
        },
      ],
      risks: [
        {
          id: 'r1',
          description: 'Riesgo 1',
          severity: 'media',
          probability: 'media',
          detection: 'media',
          rpn: 25,
        },
      ],
    };

    (
      ProcessDefinitionServiceAdmin.getByIdWithRelations as jest.Mock
    ).mockResolvedValue({
      ...baseProcess,
      sipoc: sipocLevel3,
    });

    const report = await ProcessComplianceEngine.generateReport(
      mockProcessId,
      mockOrgId
    );

    expect(report.maturity.level).toBe(3);
    // Next step: Indicators
    expect(report.maturity.next_steps).toContain(
      'Definir indicadores de gestión para los controles'
    );
  });

  test('Validación de Organización', async () => {
    (
      ProcessDefinitionServiceAdmin.getByIdWithRelations as jest.Mock
    ).mockResolvedValue(baseProcess);

    await expect(
      ProcessComplianceEngine.generateReport(mockProcessId, 'OTRA_ORG')
    ).rejects.toThrow('Acceso denegado');
  });
});
