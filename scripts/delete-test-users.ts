// Script para eliminar usuarios de test creados por los E2E tests
// Ejecutar con: npx tsx scripts/delete-test-users.ts

// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require('firebase-admin');

// Inicializar si no está inicializado
if (!admin.apps.length) {
  // Usar credenciales del archivo de servicio si existe
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Usar Application Default Credentials
    admin.initializeApp({
      projectId: 'app-4b05c',
    });
  }
}

const auth = admin.auth();
const db = admin.firestore();

async function deleteTestUsers() {
  console.log('🔍 Buscando usuarios de test...\n');

  try {
    // Listar todos los usuarios
    const listUsersResult = await auth.listUsers(1000);

    // Filtrar usuarios que empiecen con "test-"
    const testUsers = listUsersResult.users.filter((user: { email?: string }) =>
      user.email?.startsWith('test-')
    );

    console.log(`📋 Encontrados ${testUsers.length} usuarios de test:\n`);

    if (testUsers.length === 0) {
      console.log('✅ No hay usuarios de test para eliminar.');
      return;
    }

    // Mostrar usuarios a eliminar
    testUsers.forEach(
      (user: { email?: string; uid: string }, index: number) => {
        console.log(`  ${index + 1}. ${user.email} (${user.uid})`);
      }
    );

    console.log('\n🗑️  Eliminando usuarios...\n');

    // Eliminar cada usuario
    for (const user of testUsers) {
      try {
        // Eliminar de Firestore primero
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          await db.collection('users').doc(user.uid).delete();
          console.log(`  ✓ Firestore: ${user.email}`);
        }

        // Eliminar de Firebase Auth
        await auth.deleteUser(user.uid);
        console.log(`  ✓ Auth: ${user.email}`);
      } catch (error) {
        console.error(`  ✗ Error eliminando ${user.email}:`, error);
      }
    }

    console.log(
      `\n✅ Proceso completado. ${testUsers.length} usuarios eliminados.`
    );
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteTestUsers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
