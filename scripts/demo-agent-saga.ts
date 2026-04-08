/**
 * Script de Demostración: Simulación de Saga de Agentes
 * Ejecuta el Caso de Uso 1: Preparación de Auditoría
 *
 * Uso: npx tsx scripts/demo-agent-saga.ts
 */

import { AgentQueueService } from '../src/services/agents/AgentQueueService';
import { AgentSupervisor } from '../src/services/agents/core/AgentSupervisor';

async function runDemo() {
  console.log('🤖 Iniciando Demostración de Agentes Nivel 3...\n');

  // 1. Configurar contexto simulado
  const context = {
    organization_id: 'org_demo_123',
    user_id: 'user_admin_001',
    agent_instance_id: 'agent_quality_bot',
  };

  const goal = 'Preparar auditoría interna para el área de Ventas';

  // 2. Ejecutar Supervisor (Orquestación)
  console.log(`📌 Meta recibida: "${goal}"`);
  console.log('---------------------------------------------------');

  const workflowId = await AgentSupervisor.decomposeAndSchedule(goal, context);

  console.log('---------------------------------------------------');
  console.log(`✅ Saga planificada con ID: ${workflowId}`);

  // 3. Verificar qué se guardó en Firestore (Simulación de Worker)
  console.log(
    '\n🔎 Inspeccionando cola de trabajos (simulando vista del Worker)...'
  );

  // Esperar un momento para asegurar escritura en emulador/cloud
  await new Promise(r => setTimeout(r, 1000));

  const jobs = await AgentQueueService.getQueuedJobs(10);
  const myJobs = jobs.filter(j => j.payload._workflow_context?.goal === goal);

  console.log(`\n📋 Se encontraron ${myJobs.length} sub-tareas generadas:`);

  myJobs.forEach((job, index) => {
    console.log(`\n   [Tarea ${index + 1}] ID: ${job.id}`);
    console.log(`   ➜ Intent: ${job.intent}`);
    console.log(`   ➜ Descripción: ${job.payload._goal_description}`);
    console.log(
      `   ➜ Step: ${job.payload._workflow_context.step_current} de ${job.payload._workflow_context.step_total}`
    );
    if (job.parent_job_id) console.log(`   ➜ Parent: ${job.parent_job_id}`);
  });

  console.log(
    '\n✨ Demostración finalizada. El sistema ha descompuesto una meta vaga en pasos ejecutables.'
  );
}

// Ejecutar
runDemo().catch(console.error);
