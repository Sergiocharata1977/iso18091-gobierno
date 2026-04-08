const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const sa = JSON.parse(fs.readFileSync(path.join(__dirname, '../service-account.json'), 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

async function fix() {
  const uid = 'IJbHRkd5oQgV5KMZ07FEx0w703p1';

  // Resetear password y habilitar usuario
  await admin.auth().updateUser(uid, {
    password: 'Kempe123',
    emailVerified: true,
    disabled: false,
  });
  console.log('✅ Password seteado: Kempe123');

  // Verificar estado
  const u = await admin.auth().getUser(uid);
  console.log('  email:', u.email);
  console.log('  disabled:', u.disabled);
  console.log('  emailVerified:', u.emailVerified);
  console.log('  uid:', u.uid);

  // Verificar y corregir el doc de Firestore
  const ref = admin.firestore().collection('users').doc(uid);
  const snap = await ref.get();
  const data = snap.data();
  console.log('\nFirestore doc actual:', JSON.stringify(data, null, 2));

  // Asegurarse de que el currentOrganizationId sea correcto
  await ref.update({
    currentOrganizationId: 'org_agrobiciufa',
    email: 'kempes@gmail.com',
    displayName: 'Juan Kempes',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('\n✅ Firestore doc actualizado: currentOrganizationId=org_agrobiciufa');
}

fix().catch(console.error);
