import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDR0cIDqam7SzqBTo7eZ3tKe460UIWWIaY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'leave-tracker-1c6ac.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'leave-tracker-1c6ac',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'leave-tracker-1c6ac.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '924273648814',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:924273648814:web:9be290290a3ebb01aa393f',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not available in this browser');
  }
});

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}

export default app;
