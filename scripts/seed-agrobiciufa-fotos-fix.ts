import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

function initAdmin() {
  if (getApps().length > 0) return;
  const sa = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'service-account.json'), 'utf8'));
  initializeApp({ credential: cert(sa) });
  console.log(`📦 Firebase Admin — proyecto: ${sa.project_id}`);
}

// Campo correcto en el modelo: "foto" (no foto_url)
const FOTOS: Record<string, string> = {
  per_agro_001: 'https://i.pravatar.cc/150?img=57',
  per_agro_002: 'https://i.pravatar.cc/150?img=52',
  per_agro_003: 'https://i.pravatar.cc/150?img=11',
  per_agro_004: 'https://i.pravatar.cc/150?img=15',
  per_agro_005: 'https://i.pravatar.cc/150?img=44',
  per_agro_006: 'https://i.pravatar.cc/150?img=47',
  per_agro_007: 'https://i.pravatar.cc/150?img=60',
  per_agro_008: 'https://i.pravatar.cc/150?img=13',
  per_agro_009: 'https://i.pravatar.cc/150?img=8',
  per_agro_010: 'https://i.pravatar.cc/150?img=56',
  per_agro_011: 'https://i.pravatar.cc/150?img=59',
  per_agro_012: 'https://i.pravatar.cc/150?img=7',
  per_agro_013: 'https://i.pravatar.cc/150?img=3',
  per_agro_014: 'https://i.pravatar.cc/150?img=45',
  per_agro_015: 'https://i.pravatar.cc/150?img=48',
  per_agro_016: 'https://i.pravatar.cc/150?img=62',
  per_agro_017: 'https://i.pravatar.cc/150?img=49',
  per_agro_018: 'https://i.pravatar.cc/150?img=51',
  per_agro_019: 'https://i.pravatar.cc/150?img=5',
  per_agro_020: 'https://i.pravatar.cc/150?img=43',
};

async function main() {
  console.log('\n🖼️  Fix fotos — campo "foto"\n');
  initAdmin();
  const db = getFirestore();
  const batch = db.batch();
  for (const [id, url] of Object.entries(FOTOS)) {
    batch.update(db.collection('personnel').doc(id), {
      foto: url,
      updated_at: Timestamp.now(),
    });
    console.log(`  ✓ ${id}`);
  }
  await batch.commit();
  console.log(`\n✅ Fotos actualizadas (campo "foto") en ${Object.keys(FOTOS).length} empleados\n`);
  process.exit(0);
}
main().catch(e => { console.error('❌', e); process.exit(1); });
