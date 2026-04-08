import iso9001PointsData from '@/data/iso-9001-points.json';
import { ISO9001_DETAILED_REQUIREMENTS } from '@/data/iso9001-requirements-detailed';
import { db } from '@/firebase/config';
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import {
  isSeedExecutionBlockedInProduction,
  logSeedExecution,
  SEED_ALLOWED_ROLES,
} from '@/lib/api/seedSecurity';

async function postInternal() {
  try {
    console.log('Iniciando carga de puntos ISO 9001:2015...');

    // Paso 1: Limpiar duplicados
    console.log('Paso 1: Limpiando duplicados...');
    const allPointsQuery = query(
      collection(db, 'normPoints'),
      where('tipo_norma', '==', 'iso_9001')
    );
    const allPoints = await getDocs(allPointsQuery);

    const pointsByCode = new Map<string, string[]>();
    allPoints.docs.forEach(docSnap => {
      const code = docSnap.data().code;
      if (!pointsByCode.has(code)) {
        pointsByCode.set(code, []);
      }
      pointsByCode.get(code)!.push(docSnap.id);
    });

    // Eliminar duplicados
    let deletedCount = 0;
    const deleteBatch = writeBatch(db);

    pointsByCode.forEach((ids, code) => {
      if (ids.length > 1) {
        // Mantener el primero, eliminar el resto
        ids.slice(1).forEach(id => {
          deleteBatch.delete(doc(db, 'normPoints', id));
          deletedCount++;
        });
      }
    });

    if (deletedCount > 0) {
      await deleteBatch.commit();
      console.log(`✓ Eliminados ${deletedCount} duplicados`);
    }

    // Paso 2: Cargar puntos completos
    console.log('Paso 2: Cargando puntos completos...');
    console.log(`Total de puntos a cargar: ${iso9001PointsData.length}`);

    let created = 0;
    let skipped = 0;
    let updated = 0;

    const batch = writeBatch(db);
    let batchCount = 0;

    for (const point of iso9001PointsData) {
      console.log(`Procesando punto: ${point.code}`);

      // Verificar si ya existe
      const existingQuery = query(
        collection(db, 'normPoints'),
        where('code', '==', point.code),
        where('tipo_norma', '==', 'iso_9001')
      );

      const existing = await getDocs(existingQuery);

      if (existing.empty) {
        // Crear nuevo
        const newPoint = {
          code: point.code,
          title: point.title,
          chapter: point.chapter,
          category: point.category,
          tipo_norma: 'iso_9001',
          nombre_norma: 'ISO 9001:2015',
          descripcion: ISO9001_DETAILED_REQUIREMENTS[point.code] || point.title,
          es_obligatorio: point.is_mandatory,
          prioridad: point.priority,
          organization_id: 'default',
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
          is_active: true,
        };

        const docRef = doc(collection(db, 'normPoints'));
        batch.set(docRef, newPoint);
        batchCount++;
        created++;

        // Commit batch cada 500 operaciones
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      } else {
        // Actualizar existente si es necesario
        const existingDoc = existing.docs[0];
        const existingData = existingDoc.data();

        // Verificar si necesita actualización
        const newDescription =
          ISO9001_DETAILED_REQUIREMENTS[point.code] || point.title;
        if (
          existingData.title !== point.title ||
          existingData.descripcion !== newDescription
        ) {
          batch.update(doc(db, 'normPoints', existingDoc.id), {
            title: point.title,
            descripcion: newDescription,
            es_obligatorio: point.is_mandatory,
            prioridad: point.priority,
            updated_at: Timestamp.now(),
          });
          batchCount++;
          updated++;

          if (batchCount >= 500) {
            await batch.commit();
            batchCount = 0;
          }
        } else {
          skipped++;
        }
      }
    }

    // Commit final
    if (batchCount > 0) {
      await batch.commit();
    }

    // Obtener estadísticas
    const stats = {
      total: iso9001PointsData.length,
      mandatory: iso9001PointsData.filter(p => p.is_mandatory).length,
      optional: iso9001PointsData.filter(p => !p.is_mandatory).length,
      byChapter: [4, 5, 6, 7, 8, 9, 10].map(chapter => ({
        chapter,
        count: iso9001PointsData.filter(p => p.chapter === chapter).length,
      })),
      byCategory: Array.from(
        new Set(iso9001PointsData.map(p => p.category))
      ).map(category => ({
        category,
        count: iso9001PointsData.filter(p => p.category === category).length,
      })),
      byPriority: {
        alta: iso9001PointsData.filter(p => p.priority === 'alta').length,
        media: iso9001PointsData.filter(p => p.priority === 'media').length,
        baja: iso9001PointsData.filter(p => p.priority === 'baja').length,
      },
    };

    console.log('✓ Carga completada');
    console.log(`  - Creados: ${created}`);
    console.log(`  - Actualizados: ${updated}`);
    console.log(`  - Omitidos: ${skipped}`);
    console.log(`  - Duplicados eliminados: ${deletedCount}`);

    return NextResponse.json({
      success: true,
      message: 'Puntos ISO 9001:2015 cargados exitosamente',
      created,
      updated,
      skipped,
      deletedDuplicates: deletedCount,
      stats,
    });
  } catch (error) {
    console.error('Error cargando puntos ISO 9001:', error);
    return NextResponse.json(
      {
        error: 'Error al cargar puntos ISO 9001',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(
  async (request, _context, auth) => {
    if (isSeedExecutionBlockedInProduction()) {
      await logSeedExecution({
        request,
        auth,
        route: '/api/seed/iso-9001',
        method: 'POST',
        status: 'blocked',
      });
      return NextResponse.json(
        { error: 'Endpoint de seed bloqueado en produccion' },
        { status: 403 }
      );
    }

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/iso-9001',
      method: 'POST',
      status: 'attempt',
    });

    const response = await postInternal();

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/iso-9001',
      method: 'POST',
      status: response.ok ? 'success' : 'error',
      details: { status: response.status },
    });

    return response;
  },
  { roles: SEED_ALLOWED_ROLES }
);
