/**
 * Script para crear usuario Super Admin
 * Ejecutar con: npx ts-node scripts/create-super-admin.ts
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

// Configuración del Super Admin
const SUPER_ADMIN_EMAIL = 'sergio@empresa.com';
const SUPER_ADMIN_PASSWORD = 'Sergio123';

async function createSuperAdmin() {
  console.log('🚀 Iniciando creación de Super Admin...\n');

  // Inicializar Firebase Admin si no está inicializado
  if (getApps().length === 0) {
    const serviceAccountPath = path.resolve(
      process.cwd(),
      'service-account.json'
    );

    if (!fs.existsSync(serviceAccountPath)) {
      console.error(
        '❌ No se encontró service-account.json en la raíz del proyecto'
      );
      process.exit(1);
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, 'utf8')
    );

    initializeApp({
      credential: cert(serviceAccount),
    });

    console.log(
      `📦 Firebase Admin inicializado para proyecto: ${serviceAccount.project_id}`
    );
  }

  const auth = getAuth();

  try {
    // Intentar obtener usuario existente
    let user;
    try {
      user = await auth.getUserByEmail(SUPER_ADMIN_EMAIL);
      console.log(`✅ Usuario existente encontrado: ${user.uid}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Crear usuario si no existe
        user = await auth.createUser({
          email: SUPER_ADMIN_EMAIL,
          password: SUPER_ADMIN_PASSWORD,
          displayName: 'Super Admin',
          emailVerified: true,
        });
        console.log(`✅ Usuario creado: ${user.uid}`);
      } else {
        throw error;
      }
    }

    // Obtener instancia de Firestore
    const { getFirestore } = require('firebase-admin/firestore');
    const db = getFirestore();

    // Actualizar o crear documento de usuario en Firestore
    const userRef = db.collection('users').doc(user.uid);
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 100); // Expiración en 100 años

    await userRef.set(
      {
        email: SUPER_ADMIN_EMAIL,
        rol: 'super_admin',
        activo: true, // Legacy field
        status: 'active',
        planType: 'premium',
        trialStartDate: now,
        expirationDate: expiryDate,
        organization_id: null,
        created_at: now,
        updated_at: now,
      },
      { merge: true }
    );

    console.log(`✅ Documento Firestore actualizado para Super Admin`);

    // Asignar custom claims de Super Admin
    await auth.setCustomUserClaims(user.uid, {
      superAdmin: true,
      role: 'super_admin',
    });

    console.log(`✅ Claims de Super Admin asignados a ${SUPER_ADMIN_EMAIL}`);
    console.log('\n🎉 ¡Super Admin configurado exitosamente!');
    console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Status: active, Plan: premium`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

createSuperAdmin();
