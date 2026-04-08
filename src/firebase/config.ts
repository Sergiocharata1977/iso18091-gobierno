import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const missingFirebaseClientConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const hasFirebaseClientConfig =
  missingFirebaseClientConfig.length === 0;

let didWarnAboutMissingFirebaseConfig = false;

function warnAboutMissingFirebaseConfig() {
  if (
    typeof window === 'undefined' ||
    didWarnAboutMissingFirebaseConfig ||
    hasFirebaseClientConfig
  ) {
    return;
  }

  didWarnAboutMissingFirebaseConfig = true;
  console.error(
    `Missing Firebase client config: ${missingFirebaseClientConfig.join(', ')}`
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = (() => {
  if (typeof window === 'undefined') {
    return null;
  }

  warnAboutMissingFirebaseConfig();
  return getAnalytics(app);
})();

export default app;
