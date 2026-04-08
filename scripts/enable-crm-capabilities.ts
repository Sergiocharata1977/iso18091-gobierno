/**
 * Habilita capabilities de CRM (scoring + nosis) para org_agrobiciufa
 * Uso: npx ts-node --project tsconfig.scripts.json scripts/enable-crm-capabilities.ts
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const ORG_ID = 'org_agrobiciufa';

function initAdmin() {
  if (getApps().length > 0) return;
  const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ No se encontró service-account.json');
    process.exit(1);
  }
  const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  initializeApp({ credential: cert(sa) });
}

async function main() {
  initAdmin();
  const db = getFirestore();
  const now = Timestamp.now();

  const caps = [
    'crm-risk-scoring',
    'crm',
    'nosis',
  ];

  for (const capId of caps) {
    await db
      .collection('organizations').doc(ORG_ID)
      .collection('installed_capabilities').doc(capId)
      .set({
        capability_id: capId,
        system_id: 'iso9001',
        version_installed: '1.0.0',
        status: 'enabled',
        enabled: true,
        industry_type: 'general',
        submodules_enabled: [],
        settings: {},
        installed_by: 'seed-script',
        installed_at: now,
        enabled_at: now,
        disabled_at: null,
        updated_at: now,
      }, { merge: true });

    console.log(`✅ Capability "${capId}" habilitada para ${ORG_ID}`);
  }

  console.log('\n🎉 Listo. Recargá la app para ver los cambios.');
}

main().catch(e => { console.error(e); process.exit(1); });
