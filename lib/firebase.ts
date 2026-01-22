import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const apiKey = process.env.VITE_FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Inicializa apenas se tiver as chaves mínimas e não estiver já inicializado
let app;
if (apiKey && apiKey.length > 5) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} else {
  console.error("Firebase API Key ausente. Verifique Settings > Environment Variables no Vercel.");
  // Mock ou app vazio para evitar crashes em cadeia
  app = !getApps().length ? initializeApp({apiKey: "dummy", projectId: "dummy"}) : getApp();
}

export const db = getFirestore(app);
