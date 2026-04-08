/**
 * Script para sincronizar evaluations existentes a la colección events
 * Ejecutar: npx tsx scripts/sync-evaluations-to-events.ts
 */
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../src/firebase/admin';

const EVALUATIONS_COLLECTION = 'evaluations';
const EVENTS_COLLECTION = 'events';

async function syncEvaluationsToEvents() {
  console.log('🔄 Sincronizando evaluaciones a events...\n');

  try {
    // 1. Obtener todas las evaluaciones
    const evaluationsSnapshot = await adminDb
      .collection(EVALUATIONS_COLLECTION)
      .get();
    console.log(`📋 Encontradas ${evaluationsSnapshot.size} evaluaciones\n`);

    let created = 0;
    let updated = 0;

    for (const doc of evaluationsSnapshot.docs) {
      const evaluation = doc.data();
      const evaluationId = doc.id;

      // 2. Verificar si ya existe un evento para esta evaluación
      const existingEventQuery = await adminDb
        .collection(EVENTS_COLLECTION)
        .where('origen.modulo', '==', 'evaluations')
        .where('origen.documento_id', '==', evaluationId)
        .limit(1)
        .get();

      // Preparar datos del evento
      const eventData = {
        organization_id:
          evaluation.organization_id || 'org_los_senores_del_agro',
        titulo: `📋 Evaluación: ${evaluation.titulo || 'Evaluación de desempeño'}`,
        descripcion: evaluation.comentarios_generales || null,
        tipo_evento: 'evaluacion',
        fecha_inicio: evaluation.fecha_evaluacion,
        fecha_fin: evaluation.fechaProximaEvaluacion || null,
        todo_el_dia: false,
        responsable_id:
          evaluation.responsable_id || evaluation.evaluador_id || null,
        responsable_nombre: evaluation.responsable_nombre || null,
        participantes_ids:
          evaluation.empleados_evaluados?.map((e: any) => e.personnelId) || [],
        estado: mapEstado(evaluation.estado),
        prioridad: 'alta',
        origen: {
          modulo: 'evaluations',
          coleccion: 'evaluations',
          documento_id: evaluationId,
          numero_referencia: evaluation.titulo || evaluation.periodo,
        },
        meta: {
          tipo: evaluation.tipo,
          periodo: evaluation.periodo,
          resultado_global: evaluation.resultado_global,
          totalEmpleados: evaluation.empleados_evaluados?.length || 0,
          totalCompetencias: evaluation.competencias_a_evaluar?.length || 0,
        },
        activo: true,
        recurrente: false,
        updated_at: FieldValue.serverTimestamp(),
      };

      if (existingEventQuery.empty) {
        // 3a. Crear nuevo evento
        const newEventRef = await adminDb.collection(EVENTS_COLLECTION).add({
          ...eventData,
          created_at: FieldValue.serverTimestamp(),
          created_by: 'migration',
          created_by_nombre: 'Migración Automática',
        });

        // 3b. Actualizar evaluation con referencia al evento
        await adminDb
          .collection(EVALUATIONS_COLLECTION)
          .doc(evaluationId)
          .update({
            event_id: newEventRef.id,
          });

        console.log(
          `  ✓ CREADO: ${evaluation.titulo || 'Evaluación'} -> ${newEventRef.id}`
        );
        created++;
      } else {
        // 4. Actualizar evento existente
        const existingEventId = existingEventQuery.docs[0].id;
        await adminDb
          .collection(EVENTS_COLLECTION)
          .doc(existingEventId)
          .update(eventData);

        console.log(`  ↻ ACTUALIZADO: ${evaluation.titulo || 'Evaluación'}`);
        updated++;
      }
    }

    console.log('\n✅ Sincronización completada:');
    console.log(`   • ${created} eventos creados`);
    console.log(`   • ${updated} eventos actualizados`);
    console.log('\n📅 Recarga el calendario para ver los cambios\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function mapEstado(estado: string): string {
  const mapping: Record<string, string> = {
    borrador: 'programado',
    en_proceso: 'en_progreso',
    completada: 'completado',
    aprobada: 'completado',
    cancelada: 'cancelado',
  };
  return mapping[estado] || 'programado';
}

syncEvaluationsToEvents();
