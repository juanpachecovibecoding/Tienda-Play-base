import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let firebaseConfig = {};

try {
  // Using import.meta.glob to synchronously load the config file
  const configFiles = (import.meta as any).glob('/firebase-applet-config.json', { eager: true });
  if (configFiles['/firebase-applet-config.json']) {
    firebaseConfig = (configFiles['/firebase-applet-config.json'] as any).default;
  }
} catch (error) {
  console.error("Error loading Firebase configuration:", error);
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logout = () => signOut(auth);
