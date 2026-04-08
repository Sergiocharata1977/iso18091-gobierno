const admin = require('firebase-admin');
const sa = require('../service-account.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const authAdmin = admin.auth();

async function main() {
  const user = await authAdmin.getUserByEmail('admin@agrobiciufa.com');
  console.log('uid:', user.uid);

  await db.collection('users').doc(user.uid).set({
    email: 'admin@agrobiciufa.com',
    rol: 'admin',
    organization_id: 'org_agrobiciufa',
    activo: true,
    status: 'active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await authAdmin.setCustomUserClaims(user.uid, {
    organization_id: 'org_agrobiciufa',
    rol: 'admin',
  });

  console.log('admin@agrobiciufa.com -> org_agrobiciufa, claims actualizados');
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
