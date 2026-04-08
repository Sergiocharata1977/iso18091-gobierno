/**
 * Script temporal: setea contraseña a usuarios de prueba que no tienen proveedor email/password.
 * Uso: node scripts/set-test-passwords.js
 */
const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const TEST_PASSWORD = 'Candido2024!';

// Usuarios que vamos a activar para testing
const USERS_TO_FIX = [
  'cristian@empresa.com',
  'admin@empresa.com',
  'david@empresa.com',
  'superadmin@doncandidoia.com',
  'admin@agrobiciufa.com',
];

async function main() {
  console.log('Seteando contraseñas para usuarios de prueba...\n');

  for (const email of USERS_TO_FIX) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(user.uid, {
        password: TEST_PASSWORD,
        emailVerified: true,
      });
      console.log(`✅ ${email} — contraseña seteada`);
    } catch (e) {
      console.log(`❌ ${email} — error: ${e.message}`);
    }
  }

  console.log(`\nContraseña: ${TEST_PASSWORD}`);
  console.log('Listo. Ya podés loguearte con cualquiera de estos emails.');
  process.exit(0);
}

main();
