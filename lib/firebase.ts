import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const apiKey = process.env.VITE_FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Changed to let to allow re-assignment if initialization fails
export let isFirebaseConfigured = !!(apiKey && apiKey.length > 5);

let app: FirebaseApp;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch (e) {
    console.warn("Falha ao inicializar Firebase:", e);
    // Fixed: isFirebaseConfigured is now a let, so it can be reassigned here
    isFirebaseConfigured = false;
  }
} else {
  console.info("Firebase não configurado. O sistema operará em Modo Local (LocalStorage).");
}

export { db };