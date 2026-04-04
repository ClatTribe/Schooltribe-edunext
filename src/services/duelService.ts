import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  getDoc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type DuelStatus =
  | 'waiting'
  | 'ready'
  | 'countdown'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface DuelQuestion {
  id: number;
  question: string;
  options: string[];
  answer: string;
}

export interface Duel {
  id: string;
  challengerId: string;
  challengerName: string;
  joinerId?: string;
  joinerName?: string;
  subject: string;
  status: DuelStatus;
  questions?: DuelQuestion[];
  challengerAnswers?: Record<number, string>;
  joinerAnswers?: Record<number, string>;
  challengerScore?: number;
  joinerScore?: number;
  createdAt: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

// Create a new challenge — returns the duel ID
export async function createDuelChallenge(
  challengerId: string,
  challengerName: string,
  subject: string,
  questions: DuelQuestion[],
): Promise<string> {
  const ref = await addDoc(collection(db, 'duels'), {
    challengerId,
    challengerName,
    subject,
    status: 'waiting',
    questions,
    challengerAnswers: {},
    joinerAnswers: {},
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Friend joins the challenge
export async function joinDuelChallenge(
  duelId: string,
  joinerId: string,
  joinerName: string,
): Promise<void> {
  await updateDoc(doc(db, 'duels', duelId), {
    joinerId,
    joinerName,
    status: 'ready',
  });
}

// Both players confirmed ready → set to countdown
export async function startDuelCountdown(duelId: string): Promise<void> {
  await updateDoc(doc(db, 'duels', duelId), {
    status: 'countdown',
    startedAt: serverTimestamp(),
  });
}

// Save answers and score for a player
export async function submitDuelAnswers(
  duelId: string,
  role: 'challenger' | 'joiner',
  answers: Record<number, string>,
  score: number,
): Promise<void> {
  const field = role === 'challenger' ? 'challengerAnswers' : 'joinerAnswers';
  const scoreField = role === 'challenger' ? 'challengerScore' : 'joinerScore';
  await updateDoc(doc(db, 'duels', duelId), {
    [field]: answers,
    [scoreField]: score,
  });
}

// Mark duel complete
export async function completeDuel(duelId: string): Promise<void> {
  await updateDoc(doc(db, 'duels', duelId), {
    status: 'completed',
    completedAt: serverTimestamp(),
  });
}

// Cancel a duel
export async function cancelDuel(duelId: string): Promise<void> {
  await updateDoc(doc(db, 'duels', duelId), { status: 'cancelled' });
}

// Fetch a single duel snapshot once
export async function getDuel(duelId: string): Promise<Duel | null> {
  const snap = await getDoc(doc(db, 'duels', duelId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    challengerId: d.challengerId,
    challengerName: d.challengerName,
    joinerId: d.joinerId,
    joinerName: d.joinerName,
    subject: d.subject,
    status: d.status,
    questions: d.questions,
    challengerAnswers: d.challengerAnswers,
    joinerAnswers: d.joinerAnswers,
    challengerScore: d.challengerScore,
    joinerScore: d.joinerScore,
    createdAt: d.createdAt?.toDate?.() ?? null,
    startedAt: d.startedAt?.toDate?.() ?? null,
    completedAt: d.completedAt?.toDate?.() ?? null,
  };
}

// Real-time listener on a duel
export function subscribeToDuel(
  duelId: string,
  callback: (duel: Duel) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'duels', duelId), (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    callback({
      id: snap.id,
      challengerId: d.challengerId,
      challengerName: d.challengerName,
      joinerId: d.joinerId,
      joinerName: d.joinerName,
      subject: d.subject,
      status: d.status,
      questions: d.questions,
      challengerAnswers: d.challengerAnswers,
      joinerAnswers: d.joinerAnswers,
      challengerScore: d.challengerScore,
      joinerScore: d.joinerScore,
      createdAt: d.createdAt?.toDate?.() ?? null,
      startedAt: d.startedAt?.toDate?.() ?? null,
      completedAt: d.completedAt?.toDate?.() ?? null,
    });
  });
}
