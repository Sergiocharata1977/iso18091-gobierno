/**
 * Script para sincronizar trainings existentes a la colección events
 * Ejecutar: npx tsx scripts/sync-trainings-to-events.ts
 */
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../src/firebase/admin';

const TRAININGS_COLLECTION = 'trainings';
const EVENTS_COLLECTION = 'events';

async function syncTrainingsToEvents() {
  console.log('🔄 Sincronizando trainings a events...\n');

  try {
    // 1. Obtener todas las capacitaciones
    const trainingsSnapshot = await adminDb
      .collection(TRAININGS_COLLECTION)
      .get();
    console.log(`📚 Encontradas ${trainingsSnapshot.size} capacitaciones\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const doc of trainingsSnapshot.docs) {
      const training = doc.data();
      const trainingId = doc.id;

      // 2. Verificar si ya existe un evento para esta capacitación
      const existingEventQuery = await adminDb
        .collection(EVENTS_COLLECTION)
        .where('origen.modulo', '==', 'trainings')
        .where('origen.documento_id', '==', trainingId)
        .limit(1)
        .get();

      // Preparar datos del evento
      const eventData = {
        organization_id: training.organization_id || 'org_los_senores_del_agro',
        titulo: `📚 Capacitación: ${training.tema || 'Sin tema'}`,
        descripcion: training.descripcion || null,
        tipo_evento: 'capacitacion',
        fecha_inicio: training.fecha_inicio,
        fecha_fin: training.fecha_fin || null,
        todo_el_dia: false,
        responsable_id: training.responsable_id || null,
        responsable_nombre: training.responsable_nombre || null,
        participantes_ids: training.participantes || [],
        estado: mapEstado(training.estado),
        prioridad: 'media',
        origen: {
          modulo: 'trainings',
          coleccion: 'trainings',
          documento_id: trainingId,
          numero_referencia: training.tema,
        },
        meta: {
          modalidad: training.modalidad,
          horas: training.horas,
          proveedor: training.proveedor,
          costo: training.costo,
          competenciasDesarrolladas: training.competenciasDesarrolladas,
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

        // 3b. Actualizar training con referencia al evento
        await adminDb.collection(TRAININGS_COLLECTION).doc(trainingId).update({
          event_id: newEventRef.id,
        });

        console.log(`  ✓ CREADO: ${training.tema} -> ${newEventRef.id}`);
        created++;
      } else {
        // 4. Actualizar evento existente
        const existingEventId = existingEventQuery.docs[0].id;
        await adminDb
          .collection(EVENTS_COLLECTION)
          .doc(existingEventId)
          .update(eventData);

        console.log(`  ↻ ACTUALIZADO: ${training.tema}`);
        updated++;
      }
    }

    console.log('\n✅ Sincronización completada:');
    console.log(`   • ${created} eventos creados`);
    console.log(`   • ${updated} eventos actualizados`);
    console.log(`   • ${skipped} omitidos`);
    console.log('\n📅 Recarga el calendario para ver los cambios\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function mapEstado(estado: string): string {
  const mapping: Record<string, string> = {
    planificada: 'programado',
    en_curso: 'en_progreso',
    completada: 'completado',
    cancelada: 'cancelado',
  };
  return mapping[estado] || 'programado';
}

syncTrainingsToEvents();
