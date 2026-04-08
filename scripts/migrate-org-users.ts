/**
 * Migración: mueve todos los usuarios de org_los_senores_del_agro → org_agrobiciufa
 * Uso: npx ts-node --project tsconfig.scripts.json scripts/migrate-org-users.ts
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const FROM_ORG = 'org_los_senores_del_agro';
const TO_ORG = 'org_agrobiciufa';

function initAdmin() {
  if (getApps().length > 0) return;
  const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ No se encontró service-account.json');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  initializeApp({ credential: cert(serviceAccount) });
}

async function main() {
  initAdmin();
  const db = getFirestore();

  // 1. Migrar usuarios
  const usersSnap = await db
    .collection('users')
    .where('organization_id', '==', FROM_ORG)
    .get();

  console.log(`\nUsuarios a migrar: ${usersSnap.size}`);
  const batch = db.batch();
  for (const doc of usersSnap.docs) {
    console.log(`  → ${doc.data().email || doc.id}`);
    batch.update(doc.ref, { organization_id: TO_ORG });
  }
  if (usersSnap.size > 0) {
    await batch.commit();
    console.log(`✅ ${usersSnap.size} usuario(s) migrado(s) a ${TO_ORG}`);
  } else {
    console.log('  (ninguno encontrado)');
  }

  // 2. Actualizar nombre de la org destino por si acaso
  await db.collection('organizations').doc(TO_ORG).update({
    nombre: 'Agro Biciuffa SRL',
    slug: 'agrobiciufa',
  });
  console.log(`✅ Nombre de ${TO_ORG} confirmado: "Agro Biciuffa SRL"`);

  console.log('\n🎉 Migración completa. Pedile al usuario que recargue la app.');
}

main().catch((e) => { console.error(e); process.exit(1); });
