import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Sécurité : On n'initialise Firebase que si la clé API existe
// Cela évite les plantages brutaux au moment du build sur Vercel
let app;
if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} else {
  console.warn("⚠️ Firebase API Key manquante dans les variables d'environnement !");
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;