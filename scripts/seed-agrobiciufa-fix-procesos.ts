import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs'; import * as path from 'path';

function initAdmin() {
  if (getApps().length > 0) return;
  const sa = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'service-account.json'), 'utf8'));
  initializeApp({ credential: cert(sa) });
  console.log(`📦 Firebase Admin — ${sa.project_id}`);
}

// La API de procesos usa "organizationId" (camelCase) + "createdAt"/"updatedAt"
// Necesitamos agregar esos campos a los docs existentes
async function main() {
  console.log('\n🔧 Fix procesos — agregando organizationId (camelCase)\n');
  initAdmin();
  const db = getFirestore();

  const snap = await db.collection('processDefinitions')
    .where('organization_id', '==', 'org_agrobiciufa').get();

  console.log(`   Encontrados: ${snap.docs.length} procesos con organization_id`);

  const batch = db.batch();
  const now = Timestamp.now();
  snap.docs.forEach(doc => {
    batch.update(doc.ref, {
      organizationId: 'org_agrobiciufa',   // camelCase que usa la API
      createdAt: doc.data().createdAt || now,
      updatedAt: now,
    });
    console.log(`  ✓ [${doc.data().codigo}] ${doc.data().nombre}`);
  });

  await batch.commit();
  console.log(`\n✅ ${snap.docs.length} procesos actualizados con organizationId\n`);
  process.exit(0);
}
main().catch(e => { console.error('❌', e); process.exit(1); });
