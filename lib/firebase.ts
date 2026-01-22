
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Verificação de segurança para garantir que as chaves existem
const apiKey = process.env.VITE_FIREBASE_API_KEY;

if (!apiKey) {
  console.warn("Firebase API Key não encontrada. Verifique as Environment Variables no Vercel.");
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
