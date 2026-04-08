import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin (using local service account or default)
if (!admin.apps.length) {
  try {
    // Try getting credentials from env var if set
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (serviceAccountPath) {
      console.log(`Using service account from env: ${serviceAccountPath}`);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require(
        path.resolve(process.cwd(), serviceAccountPath)
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      const localKeyPath = path.resolve(process.cwd(), 'service-account.json');
      const fs = require('fs');
      if (fs.existsSync(localKeyPath)) {
        console.log(`Using local service account: ${localKeyPath}`);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require(localKeyPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        console.log('Using default credentials (projectId: app-4b05c)');
        // Default to application default credentials (useful in cloud or with gcloud auth)
        admin.initializeApp({
          projectId: 'app-4b05c', // Hardcoded project ID from deleting script
        });
      }
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();
const COLLECTION_NAME = 'processDefinitions';

// Helper to generate IDs (simplified version of src/types/processes-unified)
function generateSIPOCElementId(
  type: 'input' | 'activity' | 'output' | 'control' | 'risk'
): string {
  return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Simplified types for migration
interface ProcessSIPOC {
  inputs: any[];
  activities: any[];
  outputs: any[];
  controls: any[];
  risks: any[];
  compliance_tracking: {
    pending_findings_count: number;
    linked_indicators: any[];
    ai_suggestions: any[];
  };
}

function createEmptySIPOC(): ProcessSIPOC {
  return {
    inputs: [],
    activities: [],
    outputs: [],
    controls: [],
    risks: [],
    compliance_tracking: {
      pending_findings_count: 0,
      linked_indicators: [],
      ai_suggestions: [],
    },
  };
}

async function migrateProcessDefinitions() {
  console.log('🚀 Iniciando migración de definiciones de proceso...');

  try {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    console.log(`📄 Encontrados ${snapshot.size} procesos.`);

    let updatedCount = 0;

    // Batch updates (max 500 per batch)
    const batchSize = 400;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let needsUpdate = false;
      const updates: any = {};

      console.log(`Processing: ${doc.id}`);

      // 1. Check Versioning
      if (!data.version || !data.version_number) {
        console.log(`  - [${doc.id}] Agregando versionamiento inicial (1.0)`);
        updates.version = '1.0';
        updates.version_number = 1;
        updates.vigente = true;
        updates.version_anterior_id = null;
        if (!data.status) updates.status = 'active';
        needsUpdate = true;
      }

      // 2. Check SIPOC Structure
      if (!data.sipoc || Array.isArray(data.sipoc)) {
        // Note: Array check handles cases where "sipoc" might have been initialized as [] by mistake
        console.log(`  - [${doc.id}] Creando estructura SIPOC`);

        let sipoc: ProcessSIPOC = createEmptySIPOC();
        let activitiesMapped = false;

        // Migrate legacy "etapas_default" to Activities
        if (
          data.etapas_default &&
          Array.isArray(data.etapas_default) &&
          data.etapas_default.length > 0
        ) {
          console.log(
            `    -> Migrando ${data.etapas_default.length} etapas (etapas_default) a actividades`
          );
          sipoc.activities = data.etapas_default.map(
            (etapa: string, index: number) => ({
              id: generateSIPOCElementId('activity'),
              step: index + 1,
              name: etapa,
              description: `Actividad generada desde etapa default: ${etapa}`,
            })
          );
          activitiesMapped = true;
        }

        // Migrate "etapas" if "etapas_default" didn't map activities but "etapas" exists
        if (!activitiesMapped && data.etapas && Array.isArray(data.etapas)) {
          console.log(
            `    -> Migrando ${data.etapas.length} etapas (legacy object) a actividades`
          );
          sipoc.activities = data.etapas.map((etapa: any, index: number) => ({
            id: generateSIPOCElementId('activity'),
            step: index + 1,
            name:
              typeof etapa === 'object'
                ? etapa.nombre || `Etapa ${index + 1}`
                : etapa,
            description:
              typeof etapa === 'object' ? etapa.descripcion || '' : '',
          }));
        }

        updates.sipoc = sipoc;
        needsUpdate = true;
      }

      // 3. Migrate Responsibles (puesto -> owner)
      if (data.puesto_responsable_id && !data.owner_position_id) {
        console.log(
          `  - [${doc.id}] Migrando puesto_responsable_id -> owner_position_id`
        );
        updates.owner_position_id = data.puesto_responsable_id;
        needsUpdate = true;
      }

      // Apply Updates
      if (needsUpdate) {
        updates.migrated_at = new Date(); // Using native Date for now, Firestore handles conversion
        updates.migration_version = 'v2_sipoc';

        batch.update(doc.ref, updates);
        batchCount++;
        updatedCount++;
      }

      if (batchCount >= batchSize) {
        await batch.commit();
        console.log(`💾 Lote guardado (${batchCount} documentos)`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Lote final guardado (${batchCount} documentos)`);
    }

    console.log(`\n✅ Migración completada.`);
    console.log(`   - Procesados: ${snapshot.size}`);
    console.log(`   - Actualizados: ${updatedCount}`);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

migrateProcessDefinitions()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
