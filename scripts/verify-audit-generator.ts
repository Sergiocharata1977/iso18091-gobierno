import { ProcessAuditGenerator } from '../src/services/processes/ProcessAuditGenerator';
import {
  createEmptySIPOC,
  ProcessDefinition,
  ProcessSIPOC,
} from '../src/types/processes-unified';

// Mock de un proceso completo
const mockProcess: ProcessDefinition = {
  id: 'proc-check-test',
  organization_id: 'org-test',
  process_code: 'PROC-001',
  nombre: 'Gestión de Compras',
  description: 'Proceso de compras',
  category_id: 'SUPPORT',
  status: 'active',
  version: '1.0',
  created_at: new Date(),
  updated_at: new Date(),
  created_by: 'user-admin',
  updated_by: 'user-admin',
  sipoc: {
    ...createEmptySIPOC(),
    activities: [
      {
        id: 'act-1',
        step: 1,
        name: 'Solicitar Cotización',
        description: 'Pedir 3 presupuestos',
        responsible_position_id: 'compras-lead',
      },
      {
        id: 'act-2',
        step: 2,
        name: 'Aprobar Orden',
        description: 'Gerente aprueba si > $1000',
      },
    ],
    controls: [
      {
        id: 'ctrl-1',
        description: 'Comparativa de Precios',
        type: 'review',
        frequency: 'Por cada compra',
      },
    ],
    outputs: [
      {
        id: 'out-1',
        description: 'Orden de Compra Aprobada',
        customer: 'Proveedor',
      },
    ],
  } as ProcessSIPOC,
};

async function runTests() {
  console.log('🚀 Iniciando verificación de ProcessAuditGenerator...\n');

  try {
    const checklist = ProcessAuditGenerator.generateChecklist(mockProcess);

    console.log(`Checklist Title: ${checklist.title}`);
    console.log(`Questions Generated: ${checklist.questions.length}`);
    console.log('');

    // Validaciones
    const hasObjQuestion = checklist.questions.some(q =>
      q.text.includes('objetivo del proceso')
    );
    if (hasObjQuestion) console.log('✅ Pregunta de Objetivo: OK');
    else console.error('❌ Pregunta de Objetivo: FAIL');

    const hasActQuestion = checklist.questions.some(
      q => q.linked_activity_id === 'act-1'
    );
    if (hasActQuestion) console.log('✅ Pregunta de Actividad 1: OK');
    else console.error('❌ Pregunta de Actividad 1: FAIL');

    const hasRespQuestion = checklist.questions.some(q =>
      q.text.includes('competencia necesaria')
    );
    if (hasRespQuestion) console.log('✅ Pregunta de Competencia: OK');
    else console.error('❌ Pregunta de Competencia: FAIL');

    const hasCtrlQuestion = checklist.questions.some(
      q => q.linked_control_id === 'ctrl-1'
    );
    if (hasCtrlQuestion) {
      console.log('✅ Pregunta de Control: OK');
      const q = checklist.questions.find(q => q.linked_control_id === 'ctrl-1');
      if (q?.type === 'evidence_upload')
        console.log('   - Tipo correcto: evidence_upload');
    } else console.error('❌ Pregunta de Control: FAIL');

    const hasOutQuestion = checklist.questions.some(q =>
      q.text.includes('Orden de Compra Aprobada')
    );
    if (hasOutQuestion) console.log('✅ Pregunta de Salida/Cliente: OK');
    else console.error('❌ Pregunta de Salida/Cliente: FAIL');
  } catch (error) {
    console.error('❌ Error general en pruebas:', error);
  }
}

runTests();
