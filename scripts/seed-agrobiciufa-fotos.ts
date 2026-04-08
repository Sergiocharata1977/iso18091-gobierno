/**
 * Agrega foto_url simulada a los 20 empleados de Agro Bicufa.
 * Usa https://i.pravatar.cc — genera avatares consistentes por seed.
 *
 * Uso:
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-agrobiciufa-fotos.ts
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const ORG_ID = 'org_agrobiciufa';

function initAdmin() {
  if (getApps().length > 0) return;
  const sa = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'service-account.json'), 'utf8'));
  initializeApp({ credential: cert(sa) });
  console.log(`📦 Firebase Admin — proyecto: ${sa.project_id}`);
}

// pravatar.cc genera avatares consistentes y reales a partir de un número
// Hombres: IDs 1–70, Mujeres: IDs 1–70 (con ?img=N)
// Usamos img= fijo para que no cambien entre recargas

const FOTOS: Record<string, { foto_url: string; genero: string }> = {
  per_agro_001: { foto_url: 'https://i.pravatar.cc/150?img=57', genero: 'M' },  // Héctor
  per_agro_002: { foto_url: 'https://i.pravatar.cc/150?img=52', genero: 'M' },  // Gustavo
  per_agro_003: { foto_url: 'https://i.pravatar.cc/150?img=11', genero: 'M' },  // Marcelo
  per_agro_004: { foto_url: 'https://i.pravatar.cc/150?img=15', genero: 'M' },  // Nicolás
  per_agro_005: { foto_url: 'https://i.pravatar.cc/150?img=44', genero: 'F' },  // Florencia
  per_agro_006: { foto_url: 'https://i.pravatar.cc/150?img=47', genero: 'F' },  // Valeria
  per_agro_007: { foto_url: 'https://i.pravatar.cc/150?img=60', genero: 'M' },  // Roberto
  per_agro_008: { foto_url: 'https://i.pravatar.cc/150?img=13', genero: 'M' },  // Diego
  per_agro_009: { foto_url: 'https://i.pravatar.cc/150?img=8',  genero: 'M' },  // Lautaro
  per_agro_010: { foto_url: 'https://i.pravatar.cc/150?img=56', genero: 'M' },  // Jorge
  per_agro_011: { foto_url: 'https://i.pravatar.cc/150?img=59', genero: 'M' },  // Pablo
  per_agro_012: { foto_url: 'https://i.pravatar.cc/150?img=7',  genero: 'M' },  // Fernando
  per_agro_013: { foto_url: 'https://i.pravatar.cc/150?img=3',  genero: 'M' },  // Mauro
  per_agro_014: { foto_url: 'https://i.pravatar.cc/150?img=45', genero: 'F' },  // Brenda
  per_agro_015: { foto_url: 'https://i.pravatar.cc/150?img=48', genero: 'F' },  // Claudia
  per_agro_016: { foto_url: 'https://i.pravatar.cc/150?img=62', genero: 'M' },  // Ariel
  per_agro_017: { foto_url: 'https://i.pravatar.cc/150?img=49', genero: 'F' },  // Jimena
  per_agro_018: { foto_url: 'https://i.pravatar.cc/150?img=51', genero: 'M' },  // Luis
  per_agro_019: { foto_url: 'https://i.pravatar.cc/150?img=5',  genero: 'M' },  // Agustín
  per_agro_020: { foto_url: 'https://i.pravatar.cc/150?img=43', genero: 'F' },  // María Cristina
};

async function main() {
  console.log('\n🖼️  Agro Bicufa — agregando fotos al personal\n');
  initAdmin();
  const db = getFirestore();

  const batch = db.batch();
  for (const [id, data] of Object.entries(FOTOS)) {
    const ref = db.collection('personnel').doc(id);
    batch.update(ref, {
      foto_url: data.foto_url,
      genero: data.genero,
      updated_at: Timestamp.now(),
    });
    console.log(`  → ${id}: ${data.foto_url}`);
  }

  await batch.commit();
  console.log(`\n✅ Fotos actualizadas en ${Object.keys(FOTOS).length} empleados`);
  console.log('   Recargá Personal en el panel.\n');
  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
