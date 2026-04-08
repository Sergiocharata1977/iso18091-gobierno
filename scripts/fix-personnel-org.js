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

async function fixPersonnelOrganization() {
  const personnelId = '4e7vQuYhSK0czVE2kmit';
  const organizationId = 'org_los_senores_del_agro';

  try {
    await db.collection('personnel').doc(personnelId).update({
      organization_id: organizationId,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Personnel record fixed!');
    console.log('   - ID:', personnelId);
    console.log('   - organization_id:', organizationId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixPersonnelOrganization();
