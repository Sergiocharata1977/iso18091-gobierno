/**
 * seed-whatsapp-config.ts
 *
 * Crea o reemplaza el documento de configuracion WhatsApp para una organizacion.
 * Uso:
 *   ORG_ID=<orgId> npx ts-node --project tsconfig.json scripts/seed-whatsapp-config.ts
 *   node scripts/seed-whatsapp-config.ts <orgId>
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

if (fs.existsSync('service-account.json')) {
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH = 'service-account.json';
}

import { getAdminFirestore } from '../src/lib/firebase/admin';
import type { OrganizationWhatsAppConfig } from '../src/types/whatsapp';

const SETTINGS_DOC = 'channels_whatsapp';

async function main() {
  const orgId = process.env.ORG_ID || process.argv[2];

  if (!orgId) {
    console.error(
      'ERROR: Debes proporcionar el ORG_ID como variable de entorno o argumento.\n' +
      '  ORG_ID=mi-org-id npx ts-node scripts/seed-whatsapp-config.ts\n' +
      '  npx ts-node scripts/seed-whatsapp-config.ts mi-org-id'
    );
    process.exit(1);
  }

  console.log(`[seed-whatsapp-config] Configurando WhatsApp para org: ${orgId}`);

  const devConfig: OrganizationWhatsAppConfig = {
    enabled: true,
    provider: 'meta',
    mode: 'notifications_only',

    // Valores de desarrollo — reemplazar con reales en produccion
    whatsapp_phone_number_id: 'DEV_PHONE_NUMBER_ID',
    whatsapp_business_account_id: 'DEV_BUSINESS_ACCOUNT_ID',

    outbound_number_label: 'WhatsApp Dev',
    whatsapp_notificaciones_dealer: '+5491100000000',
    default_assigned_user_id: undefined,

    welcome_message: 'Hola! Gracias por contactarnos. En breve te atendemos.',
    out_of_hours_message: 'Nuestro horario de atencion es de lunes a viernes de 9 a 18hs.',
    auto_reply_enabled: false,

    auto_link_client_by_phone: true,
    auto_create_lead_if_unknown: false,

    webhook_status: 'pending',
    last_webhook_check: undefined,

    updated_by: 'seed-script',
    updated_at: undefined,
  };

  const db = getAdminFirestore();
  const docRef = db
    .collection('organizations')
    .doc(orgId)
    .collection('settings')
    .doc(SETTINGS_DOC);

  // Remove undefined fields before writing to Firestore
  const cleanConfig = Object.fromEntries(
    Object.entries(devConfig).filter(([, v]) => v !== undefined)
  );

  await docRef.set(cleanConfig, { merge: false });

  console.log(
    `[seed-whatsapp-config] OK — organizations/${orgId}/settings/${SETTINGS_DOC} creado/actualizado.`
  );
  console.log('[seed-whatsapp-config] Config guardada:', cleanConfig);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-whatsapp-config] Error fatal:', err);
  process.exit(1);
});
