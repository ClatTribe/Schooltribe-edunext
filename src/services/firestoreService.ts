import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Generic Firestore helpers — ALL Firebase SDK calls go through here

export async function getDocument<T extends DocumentData>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as unknown as T;
  }
  return null;
}

export async function queryDocuments<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[]
): Promise<T[]> {
  const q = query(collection(db, collectionName), ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as unknown as T
  );
}

export async function createDocument(
  collectionName: string,
  data: DocumentData
): Promise<string> {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function setDocument(
  collectionName: string,
  docId: string,
  data: DocumentData,
  merge = true
): Promise<void> {
  await setDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge });
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: DocumentData
): Promise<void> {
  await updateDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Atomic XP update using Firestore transaction
export async function atomicXPUpdate(
  userId: string,
  xpToAdd: number
): Promise<{ newXp: number; newLevel: number }> {
  const userRef = doc(db, 'gamification', userId);

  return runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const currentXp = userDoc.exists() ? (userDoc.data().xp as number) : 0;
    const newXp = currentXp + xpToAdd;
    const newLevel = Math.floor(newXp / 100) + 1;

    transaction.set(
      userRef,
      { xp: newXp, level: newLevel, updatedAt: serverTimestamp() },
      { merge: true }
    );

    return { newXp, newLevel };
  });
}

// Re-export commonly used Firestore utilities
export { where, orderBy, limit, serverTimestamp, runTransaction };
