import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env.local' });

// Use service-account.json if it exists to avoid env var parsing issues
if (fs.existsSync('service-account.json')) {
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH = 'service-account.json';
}

import { getAdminFirestore } from '../src/lib/firebase/admin';

async function activatePosts() {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('news_posts')
    .where('isActive', '==', false)
    .get();

  console.log(`Encontrados ${snapshot.size} posts inactivos.`);

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    console.log(`Activando post: ${doc.id}`);
    batch.update(doc.ref, { isActive: true });
  });

  await batch.commit();
  console.log('Posts activados correctamente.');
}

activatePosts().catch(console.error);
