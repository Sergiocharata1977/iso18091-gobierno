/**
 * Script temporal: setea organization_id + rol en custom claims de Firebase Auth,
 * leyendo los datos del doc users/{uid} en Firestore.
 * Uso: node scripts/fix-user-claims.js
 */
const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const auth = admin.auth();
const db = admin.firestore();

const USERS_TO_FIX = [
  'cristian@empresa.com',
  'admin@empresa.com',
  'david@empresa.com',
  'gustavo@empresa.com',
  'romina@empresa.com',
  'fernando@empresa.com',
  'carlos@empresa.com',
  'pablo@empresa.com',
  'superadmin@doncandidoia.com',
  'admin@agrobiciufa.com',
];

async function main() {
  console.log('Sincronizando custom claims desde Firestore...\n');

  for (const email of USERS_TO_FIX) {
    try {
      const user = await auth.getUserByEmail(email);
      const userDoc = await db.collection('users').doc(user.uid).get();

      if (!userDoc.exists) {
        console.log(`⚠️  ${email} — sin doc en Firestore, saltando`);
        continue;
      }

      const data = userDoc.data();
      const orgId = data.organization_id || null;
      const role = data.rol || data.role || 'operario';
      const personnelId = data.personnel_id || data.personnelId || null;

      const claims = {};
      if (orgId) claims.organization_id = orgId;
      if (role) claims.rol = role;
      if (personnelId) claims.personnelId = personnelId;

      await auth.setCustomUserClaims(user.uid, claims);
      console.log(`✅ ${email} → org: ${orgId || 'ninguna'}, rol: ${role}`);
    } catch (e) {
      console.log(`❌ ${email} — error: ${e.message}`);
    }
  }

  console.log('\nListo. Los tokens existentes expiran en ~1h; forzar re-login para ver los nuevos claims.');
  process.exit(0);
}

main();
