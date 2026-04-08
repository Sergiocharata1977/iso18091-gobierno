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
const auth = admin.auth();

async function createSuperAdmin() {
  const email = 'superadmin@doncandidoia.com';
  const password = 'SuperAdmin';

  try {
    // 1. Create user in Firebase Auth
    console.log('Creando usuario en Firebase Auth...');
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: true,
      displayName: 'Super Administrador',
    });

    console.log('✅ Usuario creado en Auth:', userRecord.uid);

    // 2. Create document in Firestore users collection
    console.log('Creando documento en Firestore...');
    await db
      .collection('users')
      .doc(userRecord.uid)
      .set({
        email: email,
        rol: 'super_admin',
        activo: true,
        organization_id: null, // Super admin can see all orgs
        personnel_id: null,
        planType: 'enterprise',
        status: 'active',
        modulos_habilitados: ['all'],
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log('✅ Documento creado en Firestore');
    console.log('');
    console.log('========================================');
    console.log('🎉 SUPER ADMIN CREADO EXITOSAMENTE');
    console.log('========================================');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('UID:', userRecord.uid);
    console.log('Rol: super_admin');
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log(
        '⚠️ El email ya existe en Auth. Actualizando documento en Firestore...'
      );

      // Get existing user
      const existingUser = await auth.getUserByEmail(email);

      // Update or create Firestore document
      await db
        .collection('users')
        .doc(existingUser.uid)
        .set(
          {
            email: email,
            rol: 'super_admin',
            activo: true,
            organization_id: null,
            personnel_id: null,
            planType: 'enterprise',
            status: 'active',
            modulos_habilitados: ['all'],
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      console.log('✅ Usuario existente actualizado a super_admin');
      console.log('UID:', existingUser.uid);
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

createSuperAdmin();
