/**
 * Script de Verificación: Governance Agent Bridge
 *
 * Simula la ejecución del ciclo de gobernanza para una organización de prueba.
 * Verifica que se generen trabajos (Jobs) en la cola de agentes.
 *
 * Uso: npx ts-node scripts/test-governance-bridge.ts <OrganizationID>
 */

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GovernanceAgentBridge } from '../src/services/agents/GovernanceAgentBridge';

// Configuración básica de Firebase (Asume credenciales en variable de entorno o default)
const serviceAccount = require('../../serviceAccountKey.json'); // Ajustar path según entorno

if (!process.env.FIREBASE_PROJECT_ID) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function main() {
  const args = process.argv.slice(2);
  const organizationId = args[0];

  if (!organizationId) {
    console.error('Por favor, proporcione un Organization ID.');
    console.error(
      'Uso: npx ts-node scripts/test-governance-bridge.ts <ORG_ID>'
    );
    process.exit(1);
  }

  console.log(`=== TEST: Governance Agent Bridge ===`);
  console.log(`Organización: ${organizationId}`);

  try {
    // 1. Ejecutar el puente
    const jobsCount =
      await GovernanceAgentBridge.runGovernanceCycle(organizationId);

    console.log(`\nResultado: ${jobsCount} trabajos encolados.`);

    if (jobsCount > 0) {
      console.log('✅ Prueba exitosa: Se generaron trabajos de agente.');

      // Verificación extra: Leer el último job creado
      const jobsSnapshot = await db
        .collection('agent_jobs')
        .where('organization_id', '==', organizationId)
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();

      if (!jobsSnapshot.empty) {
        const job = jobsSnapshot.docs[0].data();
        console.log('\nÚltimo Job creado:');
        console.log(`- ID: ${jobsSnapshot.docs[0].id}`);
        console.log(`- Intent: ${job.intent}`);
        console.log(`- User: ${job.user_id}`);
        console.log(`- Payload:`, JSON.stringify(job.payload, null, 2));
      }
    } else {
      console.log(
        '⚠️ No se generaron trabajos. Verifique que existan procesos con alertas activas.'
      );
    }
  } catch (error) {
    console.error('❌ Error ejecutando el puente:', error);
  }
}

main().catch(console.error);
