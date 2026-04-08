import fs from 'node:fs';
import path from 'node:path';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function resolveStorageBucket(projectId: string, storageBucket?: string) {
  return storageBucket || `${projectId}.appspot.com`;
}

function readServiceAccountFromFile() {
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    return null;
  }

  const raw = fs.readFileSync(serviceAccountPath, 'utf8');
  const parsed = JSON.parse(raw) as {
    client_email?: string;
    private_key?: string;
    project_id?: string;
  };

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error(
      'service-account.json is missing project_id, client_email, or private_key'
    );
  }

  return {
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
    projectId: parsed.project_id,
    storageBucket: resolveStorageBucket(parsed.project_id),
  };
}

function readServiceAccountFromEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY'
    );
  }

  return {
    clientEmail,
    privateKey,
    projectId,
    storageBucket: resolveStorageBucket(projectId, storageBucket),
  };
}

function getFirebaseAdminApp(): App {
  if (getApps().length === 0) {
    const credentials = readServiceAccountFromFile() ?? readServiceAccountFromEnv();

    initializeApp({
      credential: cert({
        projectId: credentials.projectId,
        clientEmail: credentials.clientEmail,
        privateKey: credentials.privateKey,
      }),
      storageBucket: credentials.storageBucket,
    });
  }

  return getApp();
}

const adminApp = getFirebaseAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);
const adminStorage = getStorage(adminApp);

export { adminApp, adminAuth, adminDb, adminStorage };

export const getAdminFirestore = () => adminDb;

export const auth = {
  getUser: (uid: string) => adminAuth.getUser(uid),
  verifyIdToken: (token: string) => adminAuth.verifyIdToken(token),
  verifySessionCookie: (cookie: string, checkRevoked = true) =>
    adminAuth.verifySessionCookie(cookie, checkRevoked),
};
