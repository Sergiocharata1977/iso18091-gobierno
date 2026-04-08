/**
 * Script de Verificación: Agent Worker Service
 *
 * Simula la ejecución del worker para procesar trabajos pendientes.
 * Se debe ejecutar DESPUÉS de test-governance-bridge.ts (o tener un job encolado).
 *
 * Uso: npx ts-node scripts/test-agent-worker.ts
 */

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { AgentWorkerService } from '../src/services/agents/AgentWorkerService';

// Configuración básica de Firebase
const serviceAccount = require('../../serviceAccountKey.json');

if (!process.env.FIREBASE_PROJECT_ID) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

async function main() {
  console.log(`=== TEST: Agent Worker Service ===`);
  console.log('Iniciando procesamiento de cola...');

  try {
    // 1. Ejecutar el worker (procesar hasta 5 jobs)
    const processedCount = await AgentWorkerService.processPendingJobs(5);

    console.log(`\nResultado: ${processedCount} trabajos procesados.`);

    if (processedCount > 0) {
      console.log('✅ Prueba exitosa: El worker procesó trabajos.');

      // Verificación: Chequear si hay mensajes de WhatsApp creados recientemente
      const db = getFirestore();
      const messagesSnapshot = await db
        .collection('whatsapp_messages')
        .where('organization_id', '!=', '') // Hack para filtrar, mejor ordenar por fecha
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();

      if (!messagesSnapshot.empty) {
        const msg = messagesSnapshot.docs[0].data();
        console.log('\nÚltimo Mensaje WhatsApp enviado:');
        console.log(`- To: ${msg.to}`);
        console.log(`- Body: "${msg.body.substring(0, 50)}..."`);
        console.log(`- Status: ${msg.status}`);
      }
    } else {
      console.log(
        '⚠️ No se procesaron trabajos. Asegúrese de que haya jobs en estado "queued".'
      );
      console.log(
        '   (Puede correr scripts/test-governance-bridge.ts primero)'
      );
    }
  } catch (error) {
    console.error('❌ Error ejecutando el worker:', error);
  }
}

main().catch(console.error);
