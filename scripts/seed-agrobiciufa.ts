/**
 * Seed: Organización Agro Biciuffa + capability dealer_solicitudes
 * Uso: npx ts-node --project tsconfig.scripts.json scripts/seed-agrobiciufa.ts
 *   o: npx ts-node -e "require('./scripts/seed-agrobiciufa.ts')"
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

// ─── Configuración ────────────────────────────────────────────────────
const ORG_ID = 'org_agrobiciufa';
const ORG_SLUG = 'agrobiciufa';
const ORG_NAME = 'Agro Biciuffa SRL';

// Usuario admin local para la org
const ADMIN_EMAIL = 'admin@agrobiciufa.com.ar';
const ADMIN_PASSWORD = 'Agro2026!';

// ──────────────────────────────────────────────────────────────────────

function initAdmin() {
  if (getApps().length > 0) return;

  const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ No se encontró service-account.json en la raíz del proyecto');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  console.log(`📦 Firebase Admin inicializado — proyecto: ${serviceAccount.project_id}`);
}

async function createOrUpdateOrg(db: ReturnType<typeof getFirestore>) {
  const now = Timestamp.now();
  const orgData = {
    id: ORG_ID,
    name: ORG_NAME,
    nombre: ORG_NAME,          // usado en mensajes WhatsApp
    slug: ORG_SLUG,             // usado por resolveOrgIdBySlug
    activo: true,               // requerido por resolveOrgIdBySlug
    plan: 'premium',
    settings: {
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      language: 'es',
    },
    features: {
      private_sections: true,
      ai_assistant: true,
      max_users: 50,
    },
    // Dealer config
    whatsapp_notificaciones_dealer: null, // completar con número real cuando esté disponible
    created_at: now,
    updated_at: now,
  };

  await db.collection('organizations').doc(ORG_ID).set(orgData, { merge: true });
  console.log(`✅ Organización creada/actualizada: ${ORG_ID} (slug="${ORG_SLUG}")`);
}

async function enableDealerCapability(db: ReturnType<typeof getFirestore>) {
  const now = Timestamp.now();
  const capData = {
    capability_id: 'dealer_solicitudes',
    system_id: 'iso9001',
    version_installed: '1.0.0',
    status: 'enabled',
    enabled: true,
    industry_type: 'agro',
    submodules_enabled: [],
    settings: {},
    installed_by: 'seed-script',
    installed_at: now,
    enabled_at: now,
    disabled_at: null,
    updated_at: now,
  };

  await db
    .collection('organizations')
    .doc(ORG_ID)
    .collection('installed_capabilities')
    .doc('dealer_solicitudes')
    .set(capData, { merge: true });

  console.log(`✅ Capability "dealer_solicitudes" habilitada para ${ORG_ID}`);
}

async function createAdminUser(db: ReturnType<typeof getFirestore>) {
  const auth = getAuth();
  let uid: string;

  try {
    const existing = await auth.getUserByEmail(ADMIN_EMAIL);
    uid = existing.uid;
    console.log(`ℹ️  Usuario ya existe: ${uid} (${ADMIN_EMAIL})`);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: 'Admin Agrobiciufa',
        emailVerified: true,
      });
      uid = created.uid;
      console.log(`✅ Usuario Firebase Auth creado: ${uid}`);
    } else {
      throw err;
    }
  }

  const now = Timestamp.now();
  await db.collection('users').doc(uid).set(
    {
      email: ADMIN_EMAIL,
      rol: 'admin',
      activo: true,
      status: 'active',
      organization_id: ORG_ID,
      first_login: false,
      is_first_login: false,
      planType: 'premium',
      created_at: now,
      updated_at: now,
    },
    { merge: true }
  );

  console.log(`✅ Documento Firestore para usuario admin guardado`);
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   UID: ${uid}`);
}

async function main() {
  console.log('\n🚀 Seed — Agro Biciuffa\n');
  initAdmin();
  const db = getFirestore();

  await createOrUpdateOrg(db);
  await enableDealerCapability(db);
  await createAdminUser(db);

  console.log('\n🎉 Seed completado!\n');
  console.log('  Organización: ' + ORG_ID);
  console.log('  Slug:         ' + ORG_SLUG);
  console.log('  Admin:        ' + ADMIN_EMAIL + ' / ' + ADMIN_PASSWORD);
  console.log('\n  Landing URL: http://localhost:3000');
  console.log('  Panel admin:  http://localhost:3000/dashboard\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
