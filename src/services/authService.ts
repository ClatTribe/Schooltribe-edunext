import {
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type RecaptchaVerifier,
  type User,
  type ConfirmationResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, UserRole, Subject, Board, ClassLevel } from '@/types';

const googleProvider = new GoogleAuthProvider();

// Phone OTP sign-in
export async function sendOTP(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
}

export async function verifyOTP(
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<User> {
  const credential = await confirmationResult.confirm(otp);
  return credential.user;
}

// Google sign-in
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Sign out
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

// Auth state listener
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// User profile CRUD
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { uid, ...docSnap.data() } as UserProfile;
  }
  return null;
}

export async function createUserProfile(
  uid: string,
  data: {
    role: UserRole;
    displayName: string;
    phone: string;
    email?: string;
    board?: Board;
    class?: ClassLevel;
    subjects: Subject[];
  }
): Promise<UserProfile> {
  const profile: Omit<UserProfile, 'uid'> = {
    role: data.role,
    displayName: data.displayName,
    phone: data.phone,
    email: data.email,
    board: data.board || 'CBSE',
    class: data.class || 10,
    subjects: data.subjects, 
    onboardingComplete: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
 
  await setDoc(doc(db, 'users', uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Initialize gamification profile for students
  if (data.role === 'student') {
    await setDoc(doc(db, 'gamification', uid), {
      userId: uid,
      xp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: '',
      shieldActive: false,
      badges: [],
      testsCompleted: 0,
      accuracy: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      videosWatched: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  return { uid, ...profile };
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
