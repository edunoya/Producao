
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const getEnv = (key: string) => {
  // Tenta obter do process.env (Vite define) ou de constantes globais
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  return "";
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

export const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5);

let db: any = null;

if (isFirebaseConfigured) {
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch (e) {
    console.error("Erro ao inicializar Firebase:", e);
  }
} else {
  console.warn("Firebase não configurado. Verifique as variáveis de ambiente no Vercel.");
}

export { db };
