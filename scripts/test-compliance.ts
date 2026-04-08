import { ProcessComplianceEngine } from '../src/lib/iso/ProcessComplianceEngine';
import { ProcessDefinition } from '../src/types/processes-unified';

const mockProcess: ProcessDefinition = {
  id: 'test-proc-1',
  organization_id: 'org-1',
  nombre: 'Proceso de Test',
  descripcion: 'Un proceso de prueba',
  objetivo: 'Probar el motor de cumplimiento',
  alcance: 'Desde el inicio hasta el fin',
  vigente: true,
  version: '1.0',
  created_at: new Date(),
  updated_at: new Date(),
  process_code: 'PROC-TEST-001',
  category_id: 3,
  status: 'active',
  activo: true,
  created_by: 'user-test',
  updated_by: 'user-test',
  // Missing owner
  sipoc: {
    inputs: [], // Missing inputs
    activities: [
      {
        id: '1',
        step: 1,
        name: 'Actividad 1',
        description: 'Desc',
        responsible_position_id: 'pos-1',
      },
    ],
    outputs: [
      {
        id: '1',
        description: 'Salida 1',
        customer: 'Cliente',
        quality_criteria: '',
      }, // Missing criteria
    ],
    controls: [],
    risks: [
      {
        id: '1',
        description: 'Riesgo Alto',
        severity: 'alta',
        probability: 'alta',
        detection: 'baja',
        rpn: 1,
      }, // Risk without control
    ],
    compliance_tracking: { pending_findings_count: 0, ai_suggestions: [] },
  },
};

const report = ProcessComplianceEngine.validate(mockProcess);
console.log(JSON.stringify(report, null, 2));
