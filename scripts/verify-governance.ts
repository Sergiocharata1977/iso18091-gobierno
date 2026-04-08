import { ProcessGovernanceService } from '../src/services/processes/ProcessGovernanceService';
import { ProcessDefinitionServiceAdmin } from '../src/services/processRecords/ProcessDefinitionServiceAdmin';
import {
  createEmptySIPOC,
  ProcessDefinition,
} from '../src/types/processes-unified';

// Mock getById (usado internamente por ComplianceEngine)
const mockGetById = async (id: string): Promise<ProcessDefinition | null> => {
  // Reutilizamos la lógica del mock anterior si es necesario,
  // pero GovernanceService usa getAllActive, así que mockeamos ese.
  return null;
};

// Mock getAllActive
const mockGetAllActive = async (
  orgId: string
): Promise<ProcessDefinition[]> => {
  console.log(`[MOCK] Getting all active processes for ${orgId}`);
  return [
    {
      id: 'proc-mature',
      organization_id: orgId,
      nombre: 'Proceso Maduro',
      sipoc: {
        ...createEmptySIPOC(),
        inputs: [
          { id: 'i1', description: 'Input', required: true, supplier: 'Prov' },
        ],
        activities: [{ id: 'a1', step: 1, name: 'Act', description: 'Desc' }],
        outputs: [{ id: 'o1', description: 'Output', customer: 'Cli' }],
        controls: [
          {
            id: 'c1',
            description: 'Control',
            type: 'indicator',
            frequency: 'Mensual',
          },
        ],
        risks: [
          {
            id: 'r1',
            description: 'Riesgo',
            severity: 'media',
            probability: 'media',
            detection: 'media',
            rpn: 25,
          },
        ],
      },
    } as ProcessDefinition,
    {
      id: 'proc-immature',
      organization_id: orgId,
      nombre: 'Proceso Inmaduro',
      sipoc: createEmptySIPOC(), // Vacío -> Nivel 1
    } as ProcessDefinition,
    {
      id: 'proc-risky',
      organization_id: orgId,
      nombre: 'Proceso Riesgoso',
      sipoc: {
        ...createEmptySIPOC(),
        inputs: [
          { id: 'i1', description: 'Input', required: true, supplier: 'Prov' },
        ],
        activities: [{ id: 'a1', step: 1, name: 'Act', description: 'Desc' }],
        outputs: [{ id: 'o1', description: 'Output', customer: 'Cli' }],
        // Sin controles -> Inconsistencia
        controls: [],
        risks: [
          {
            id: 'r1',
            description: 'Riesgo Alto',
            severity: 'alta',
            probability: 'alta',
            detection: 'alta',
            rpn: 0,
          },
        ], // RPN 0 -> Missing Evidence
      } as ProcessDefinition,
    },
  ];
};

// Mock Compliance Engine para evitar doble cálculo complejo en test unitario
// Opcional: Podríamos dejar que corra el real si queremos test de integración.
// Vamos a dejar que corra el real, pero necesitamos mockear getById porque ComplianceEngine lo llama internamente
// AUNQUE: ProcessGovernanceService llama a ProcessComplianceEngine.generateReport(id, orgId).
// Y ProcessComplianceEngine llama a ProcessDefinitionServiceAdmin.getByIdWithRelations(id).
// Así que debemos mockear getByIdWithRelations para que devuelva lo mismo que getAllActive.

const mockGetByIdWithRelations = async (
  id: string
): Promise<ProcessDefinition | null> => {
  const processes = await mockGetAllActive('org-test');
  return processes.find(p => p.id === id) || null;
};

// Monkey patch
ProcessDefinitionServiceAdmin.getAllActive = mockGetAllActive;
ProcessDefinitionServiceAdmin.getByIdWithRelations = mockGetByIdWithRelations;

async function runTests() {
  console.log('🚀 Iniciando verificación de ProcessGovernanceService...\n');

  try {
    const orgId = 'org-test';
    const scanResult = await ProcessGovernanceService.runComplianceScan(orgId);

    console.log(`Scan ID: ${scanResult.scan_id}`);
    console.log(`Processes Scanned: ${scanResult.processes_scanned}`);
    console.log(`Average Maturity: ${scanResult.average_maturity}`);
    console.log(`Alerts Generated: ${scanResult.alerts_generated.length}`);
    console.log('');

    // Validaciones

    // 1. Proceso Inmaduro debe generar alerta 'low_maturity'
    const maturityAlert = scanResult.alerts_generated.find(
      a => a.process_id === 'proc-immature' && a.type === 'low_maturity'
    );
    if (maturityAlert) {
      console.log('✅ Alertas de Madurez: OK');
      console.log(`   - ${maturityAlert.message}`);
    } else {
      console.error(
        '❌ Alertas de Madurez: FAIL (No se generó alerta para proceso inmaduro)'
      );
    }

    // 2. Proceso Riesgoso debe generar alerta 'missing_controls'
    const controlsAlert = scanResult.alerts_generated.find(
      a => a.process_id === 'proc-risky' && a.type === 'missing_controls'
    );
    if (controlsAlert) {
      console.log('✅ Alertas de Controles: OK');
      console.log(`   - ${controlsAlert.message}`);
    } else {
      console.error(
        '❌ Alertas de Controles: FAIL (No se generó alerta para controles faltantes)'
      );
    }

    // 3. Proceso Riesgoso debe generar alerta 'risk_exposure'
    const riskAlert = scanResult.alerts_generated.find(
      a => a.process_id === 'proc-risky' && a.type === 'risk_exposure'
    );
    if (riskAlert) {
      console.log('✅ Alertas de Riesgo: OK');
      console.log(`   - ${riskAlert.message}`);
      if (riskAlert.suggested_agent_action === 'iso.risk.assess')
        console.log('   - Acción sugerida correcta: iso.risk.assess');
    } else {
      console.error(
        '❌ Alertas de Riesgo: FAIL (No se generó alerta para riesgo sin mitigar)'
      );
    }
  } catch (error) {
    console.error('❌ Error general en pruebas:', error);
  }
}

runTests();
