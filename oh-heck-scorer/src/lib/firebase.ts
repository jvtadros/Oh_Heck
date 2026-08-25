import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth } from 'firebase/auth';

/**
 * All values come from Vite env vars (see .env.example). Never commit real
 * keys — Firebase web config is not secret, but keeping it in env vars makes
 * it easy to point different builds (dev/staging/prod) at different projects.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function getOrCreateApp(): FirebaseApp {
  const existing = getApps();
  if (existing.length > 0) return existing[0];
  if (!firebaseConfig.projectId) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env.local and fill in your ' +
        'Firebase project settings (see README for setup steps).',
    );
  }
  return initializeApp(firebaseConfig);
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!cachedApp) cachedApp = getOrCreateApp();
  return cachedApp;
}

export function getDb(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(getFirebaseApp());
  return cachedDb;
}

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(getFirebaseApp());
  return cachedAuth;
}

let anonymousAuthPromise: Promise<string> | null = null;

/**
 * Ensures the browser has a signed-in (anonymous) Firebase user and resolves
 * with a stable uid for this device. Firebase persists the session in
 * IndexedDB, so the same uid survives reloads — we use it as the player's
 * identity instead of a hand-rolled localStorage id, which lets Firestore
 * security rules check `request.auth.uid` against room membership.
 */
export function ensureAnonymousAuth(): Promise<string> {
  if (anonymousAuthPromise) return anonymousAuthPromise;

  anonymousAuthPromise = new Promise<string>((resolve, reject) => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve(user.uid);
        }
      },
      (error) => {
        unsubscribe();
        reject(error);
      },
    );
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((error) => {
        unsubscribe();
        reject(error);
      });
    }
  });

  return anonymousAuthPromise;
}
