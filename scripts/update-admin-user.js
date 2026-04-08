const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(
  path.join(__dirname, '..', 'service-account.json')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function updateUser() {
  try {
    await db.collection('users').doc('OfDgp89MN4UPfUdzTNqeoMyqh0I3').update({
      organization_id: 'org_los_senores_del_agro',
      rol: 'admin',
      activo: true,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Usuario admin@empresa.com actualizado correctamente!');
    console.log('   - organization_id: org_los_senores_del_agro');
    console.log('   - rol: admin');
    console.log('   - activo: true');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateUser();
