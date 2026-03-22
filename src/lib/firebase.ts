import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBjjaRQEC1HBnucITzXMTJkysvHy9qy30g",
  authDomain: "graxbet.firebaseapp.com",
  projectId: "graxbet",
  storageBucket: "graxbet.firebasestorage.app",
  messagingSenderId: "1025889856382",
  appId: "1:1025889856382:web:421e04a0ee80e2a0a7612f",
  measurementId: "G-W7SDSZYV7B"
};

// Lazy singletons — never initialized at module-eval time so SSR stays clean.
let _db: Firestore | undefined;

export function getDb(): Firestore {
  if (_db) return _db;
  const app: FirebaseApp =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  _db = getFirestore(app);
  return _db;
}
