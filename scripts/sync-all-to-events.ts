/**
 * Script para sincronizar datos existentes de trainings, evaluations y audits a la colección events
 * Ejecutar: npx tsx scripts/sync-all-to-events.ts
 */

import { adminDb } from '../src/firebase/admin';
import { EventService } from '../src/services/events/EventService';

async function syncTrainings() {
  console.log('🔄 Sincronizando capacitaciones...');
  const snapshot = await adminDb.collection('trainings').get();
  let synced = 0;

  for (const doc of snapshot.docs) {
    const training = doc.data();
    if (training.event_id) {
      console.log(`  ⏭️  ${training.tema} - ya tiene event_id`);
      continue;
    }

    try {
      const eventId = await EventService.syncFromSource({
        organization_id: training.organization_id || 'org_los_senores_del_agro',
        titulo: `📚 Capacitación: ${training.tema}`,
        descripcion: training.descripcion,
        tipo_evento: 'capacitacion',
        fecha_inicio:
          training.fecha_inicio?.toDate?.() || new Date(training.fecha_inicio),
        fecha_fin:
          training.fecha_fin?.toDate?.() || new Date(training.fecha_fin),
        responsable_id: training.responsable_id,
        responsable_nombre: training.responsable_nombre,
        estado: 'programado',
        prioridad: 'media',
        source_collection: 'trainings',
        source_id: doc.id,
        created_by: 'system',
      });

      await adminDb
        .collection('trainings')
        .doc(doc.id)
        .update({ event_id: eventId });
      console.log(`  ✅ ${training.tema} -> ${eventId}`);
      synced++;
    } catch (error) {
      console.error(`  ❌ Error con ${training.tema}:`, error);
    }
  }

  console.log(`📚 Capacitaciones sincronizadas: ${synced}/${snapshot.size}`);
}

async function syncEvaluations() {
  console.log('🔄 Sincronizando evaluaciones...');
  const snapshot = await adminDb.collection('evaluations').get();
  let synced = 0;

  for (const doc of snapshot.docs) {
    const evaluation = doc.data();
    if (evaluation.event_id) {
      console.log(
        `  ⏭️  ${evaluation.titulo || evaluation.id} - ya tiene event_id`
      );
      continue;
    }

    try {
      const fechaInicio =
        evaluation.fecha_evaluacion?.toDate?.() ||
        evaluation.fechaProximaEvaluacion?.toDate?.() ||
        new Date(evaluation.fecha_evaluacion) ||
        new Date();

      const eventId = await EventService.syncFromSource({
        organization_id:
          evaluation.organization_id || 'org_los_senores_del_agro',
        titulo: `📋 Evaluación: ${evaluation.titulo || 'Evaluación de desempeño'}`,
        descripcion:
          evaluation.comentarios_generales || evaluation.observaciones,
        tipo_evento: 'evaluacion',
        fecha_inicio: fechaInicio,
        responsable_id: evaluation.responsable_id,
        responsable_nombre: evaluation.responsable_nombre,
        estado: 'programado',
        prioridad: 'alta',
        source_collection: 'evaluations',
        source_id: doc.id,
        created_by: 'system',
      });

      await adminDb
        .collection('evaluations')
        .doc(doc.id)
        .update({ event_id: eventId });
      console.log(`  ✅ ${evaluation.titulo || doc.id} -> ${eventId}`);
      synced++;
    } catch (error) {
      console.error(`  ❌ Error con ${evaluation.titulo || doc.id}:`, error);
    }
  }

  console.log(`📋 Evaluaciones sincronizadas: ${synced}/${snapshot.size}`);
}

async function syncAudits() {
  console.log('🔄 Sincronizando auditorías...');
  const snapshot = await adminDb.collection('audits').get();
  let synced = 0;

  for (const doc of snapshot.docs) {
    const audit = doc.data();
    if (audit.event_id) {
      console.log(`  ⏭️  ${audit.title || audit.code} - ya tiene event_id`);
      continue;
    }

    try {
      const fechaInicio =
        audit.plannedDate?.toDate?.() ||
        new Date(audit.plannedDate) ||
        new Date();

      const eventId = await EventService.syncFromSource({
        organization_id: audit.organization_id || 'org_los_senores_del_agro',
        titulo: `🔍 Auditoría: ${audit.title || audit.code || 'Auditoría interna'}`,
        descripcion: audit.scope || audit.objectives,
        tipo_evento: 'auditoria',
        fecha_inicio: fechaInicio,
        responsable_id: audit.leadAuditorId,
        responsable_nombre: audit.leadAuditorName,
        estado: 'programado',
        prioridad: 'alta',
        source_collection: 'audits',
        source_id: doc.id,
        created_by: 'system',
      });

      await adminDb
        .collection('audits')
        .doc(doc.id)
        .update({ event_id: eventId });
      console.log(`  ✅ ${audit.title || audit.code || doc.id} -> ${eventId}`);
      synced++;
    } catch (error) {
      console.error(`  ❌ Error con ${audit.title || doc.id}:`, error);
    }
  }

  console.log(`🔍 Auditorías sincronizadas: ${synced}/${snapshot.size}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 SINCRONIZACIÓN DE DATOS EXISTENTES A EVENTOS');
  console.log('='.repeat(60));

  await syncTrainings();
  console.log('');
  await syncEvaluations();
  console.log('');
  await syncAudits();

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ SINCRONIZACIÓN COMPLETADA');
  console.log('='.repeat(60));

  process.exit(0);
}

main().catch(console.error);
