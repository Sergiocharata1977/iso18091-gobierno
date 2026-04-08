import { ProcessComplianceEngine } from '../src/services/processes/ProcessComplianceEngine';
import { ProcessDefinitionServiceAdmin } from '../src/services/processRecords/ProcessDefinitionServiceAdmin';
import {
  createEmptySIPOC,
  ProcessDefinition,
} from '../src/types/processes-unified';

// Mock simple para reemplazar la llamada a DB
const mockGetById = async (id: string): Promise<ProcessDefinition | null> => {
  console.log(`[MOCK] Getting process ${id}`);
  if (id === 'proc-empty') {
    return {
      id: 'proc-empty',
      organization_id: 'org-abc',
      process_code: 'PROC-001',
      nombre: 'Proceso Vacío',
      category_id: 3,
      status: 'active',
      version: '1.0',
      activo: true,
      created_by: 'system',
      created_at: new Date() as any,
      updated_by: 'system',
      updated_at: new Date() as any,
      sipoc: createEmptySIPOC(),
    } as ProcessDefinition;
  }

  if (id === 'proc-level-2') {
    return {
      id: 'proc-level-2',
      organization_id: 'org-abc',
      process_code: 'PROC-002',
      nombre: 'Proceso Nivel 2',
      category_id: 3,
      status: 'active',
      version: '1.0',
      activo: true,
      created_by: 'system',
      created_at: new Date() as any,
      updated_by: 'system',
      updated_at: new Date() as any,
      sipoc: {
        ...createEmptySIPOC(),
        inputs: [
          {
            id: 'i1',
            description: 'Input 1',
            required: true,
            supplier: 'Prov',
          },
        ],
        activities: [
          { id: 'a1', step: 1, name: 'Act 1', description: 'Desc 1' },
        ],
        outputs: [{ id: 'o1', description: 'Output 1', customer: 'Cli' }],
      },
    } as ProcessDefinition;
  }

  if (id === 'proc-level-3') {
    return {
      id: 'proc-level-3',
      organization_id: 'org-abc',
      process_code: 'PROC-003',
      nombre: 'Proceso Nivel 3',
      category_id: 3,
      status: 'active',
      version: '1.0',
      activo: true,
      created_by: 'system',
      created_at: new Date() as any,
      updated_by: 'system',
      updated_at: new Date() as any,
      sipoc: {
        ...createEmptySIPOC(),
        inputs: [
          {
            id: 'i1',
            description: 'Input 1',
            required: true,
            supplier: 'Prov',
          },
        ],
        activities: [
          { id: 'a1', step: 1, name: 'Act 1', description: 'Desc 1' },
        ],
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
      },
    } as ProcessDefinition;
  }

  return null;
};

// Monkey patch del método estático para el test
ProcessDefinitionServiceAdmin.getByIdWithRelations = mockGetById;

async function runTests() {
  console.log('🚀 Iniciando verificación de ProcessComplianceEngine...\n');

  try {
    // Test 1: Proceso Vacío
    console.log('Test 1: Proceso Vacío (Esperado: Nivel 1)');
    const report1 = await ProcessComplianceEngine.generateReport(
      'proc-empty',
      'org-abc'
    );
    console.log(
      `  Resultado: Nivel ${report1.maturity.level} (${report1.maturity.label})`
    );
    console.log(`  Score: ${report1.maturity.score}`);
    if (report1.maturity.level === 1) console.log('  ✅ PASS');
    else console.error('  ❌ FAIL');
    console.log('');

    // Test 2: Nivel 2
    console.log('Test 2: SIPOC Completo (Esperado: Nivel 2)');
    const report2 = await ProcessComplianceEngine.generateReport(
      'proc-level-2',
      'org-abc'
    );
    console.log(
      `  Resultado: Nivel ${report2.maturity.level} (${report2.maturity.label})`
    );
    console.log(`  Next Steps: ${report2.maturity.next_steps.join(', ')}`);
    if (
      report2.maturity.level === 2 &&
      report2.inconsistencies.some(i => i.type === 'missing_control')
    )
      console.log('  ✅ PASS');
    else console.error('  ❌ FAIL');
    console.log('');

    // Test 3: Nivel 3
    console.log('Test 3: Controles y Riesgos (Esperado: Nivel 3)');
    const report3 = await ProcessComplianceEngine.generateReport(
      'proc-level-3',
      'org-abc'
    );
    console.log(
      `  Resultado: Nivel ${report3.maturity.level} (${report3.maturity.label})`
    );
    if (report3.maturity.level === 3) console.log('  ✅ PASS');
    else console.error('  ❌ FAIL');
    console.log('');

    // Test 4: Auth Fail
    console.log('Test 4: Validación de Organización (Esperado: Error)');
    try {
      await ProcessComplianceEngine.generateReport('proc-empty', 'WRONG-ORG');
      console.error('  ❌ FAIL (No lanzó error)');
    } catch (e: any) {
      if (e.message.includes('Acceso denegado'))
        console.log('  ✅ PASS (Error capturado correctamente)');
      else console.error(`  ❌ FAIL (Error incorrecto: ${e.message})`);
    }
  } catch (error) {
    console.error('❌ Error general en pruebas:', error);
  }
}

runTests();
