import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBjjaRQEC1HBnucITzXMTJkysvHy9qy30g",
  authDomain: "graxbet.firebaseapp.com",
  projectId: "graxbet",
  storageBucket: "graxbet.firebasestorage.app",
  messagingSenderId: "1025889856382",
  appId: "1:1025889856382:web:421e04a0ee80e2a0a7612f",
  measurementId: "G-W7SDSZYV7B"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { app, db };
