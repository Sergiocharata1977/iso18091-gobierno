import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs'; import * as path from 'path';
function initAdmin() { if (getApps().length > 0) return; const sa = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'service-account.json'), 'utf8')); initializeApp({ credential: cert(sa) }); }
async function main() {
  initAdmin(); const db = getFirestore();
  const snap = await db.collection('processDefinitions').where('organization_id', '==', 'org_agrobiciufa').get();
  console.log(`\n✅ processDefinitions para org_agrobiciufa: ${snap.docs.length} docs`);
  snap.docs.forEach(d => console.log(`  [${d.data().codigo}] ${d.data().nombre}`));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
