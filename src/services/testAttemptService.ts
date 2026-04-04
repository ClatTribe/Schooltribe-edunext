/**
 * Test Attempt Service
 * Handles saving test results to Firestore and updating gamification data.
 * Used by both AI practice tests and teacher-assigned tests.
 */

import {
  createDocument,
  queryDocuments,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from '@/services/firestoreService';
import { doc, runTransaction, serverTimestamp as fsServerTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Subject } from '@/types';

// ===== Types =====

export interface TestAttemptRecord {
  id?: string;
  userId: string;
  testType: 'practice' | 'assigned';      // AI practice vs teacher-assigned
  teacherTestId?: string;                   // only for assigned tests
  subject: Subject;
  chapters: string[];
  board: string;
  classLevel: number;
  totalQuestions: number;
  correctAnswers: number;
  score: number;                            // percentage (0-100)
  answers: AttemptAnswer[];
  timeSpent: number;                        // seconds
  completedAt: ReturnType<typeof serverTimestamp> | Date;
}

export interface AttemptAnswer {
  questionId: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  chapter: string;
  difficulty: string;
}

export interface ChapterPerformance {
  chapter: string;
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

// ===== Save Test Attempt =====

export async function saveTestAttempt(
  attempt: Omit<TestAttemptRecord, 'id' | 'completedAt'>
): Promise<string> {
  // Save the attempt document
  const docId = await createDocument('testAttempts', {
    ...attempt,
    completedAt: serverTimestamp(),
  });

  // Update gamification atomically (XP + stats in single transaction)
  const xpEarned = calculateXP(attempt.correctAnswers, attempt.totalQuestions, attempt.testType);
  await updateGamificationAtomic(attempt.userId, xpEarned, attempt);

  return docId;
}

// ===== Calculate XP =====

function calculateXP(correct: number, total: number, testType: 'practice' | 'assigned'): number {
  const baseXP = 50; // test_completed XP
  const bonusXP = correct * 5; // correct_answer XP
  const perfectBonus = correct === total ? 25 : 0;
  const assignedBonus = testType === 'assigned' ? 20 : 0; // extra reward for teacher tests
  return baseXP + bonusXP + perfectBonus + assignedBonus;
}

// ===== Update Gamification Atomically (XP + stats in one transaction) =====

async function updateGamificationAtomic(
  userId: string,
  xpEarned: number,
  attempt: Omit<TestAttemptRecord, 'id' | 'completedAt'>
): Promise<void> {
  const gamRef = doc(db, 'gamification', userId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(gamRef);
    const existing = snap.exists() ? snap.data() : {};

    // XP + Level
    const currentXp = (existing.xp as number) ?? 0;
    const newXp = currentXp + xpEarned;
    const newLevel = Math.floor(newXp / 100) + 1;

    // Tests + accuracy
    const prevTests = (existing.testsCompleted as number) ?? 0;
    const prevTotal = (existing.totalQuestions as number) ?? 0;
    const prevCorrect = (existing.totalCorrect as number) ?? 0;
    const newTotalQuestions = prevTotal + attempt.totalQuestions;
    const newTotalCorrect = prevCorrect + attempt.correctAnswers;
    const newAccuracy = newTotalQuestions > 0
      ? Math.round((newTotalCorrect / newTotalQuestions) * 100 * 10) / 10
      : 0;

    // Streak
    const today = new Date().toISOString().split('T')[0];
    const lastActiveDate = (existing.lastActiveDate as string) ?? '';
    let streak = (existing.streak as number) ?? 0;

    if (lastActiveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      streak = lastActiveDate === yesterdayStr ? streak + 1 : 1;
    }

    transaction.set(gamRef, {
      ...existing,
      userId,
      xp: newXp,
      level: newLevel,
      testsCompleted: prevTests + 1,
      accuracy: newAccuracy,
      totalQuestions: newTotalQuestions,
      totalCorrect: newTotalCorrect,
      streak,
      lastActiveDate: today,
      updatedAt: fsServerTimestamp(),
    }, { merge: true });
  });
}

// ===== Query Test Attempts =====

export async function getStudentAttempts(
  userId: string,
  limitCount = 20
): Promise<TestAttemptRecord[]> {
  return queryDocuments<TestAttemptRecord>('testAttempts', [
    where('userId', '==', userId),
    orderBy('completedAt', 'desc'),
    limit(limitCount),
  ]);
}

export async function getAttemptsByTest(
  teacherTestId: string
): Promise<TestAttemptRecord[]> {
  return queryDocuments<TestAttemptRecord>('testAttempts', [
    where('teacherTestId', '==', teacherTestId),
  ]);
}

export async function getAllStudentAttempts(): Promise<TestAttemptRecord[]> {
  return queryDocuments<TestAttemptRecord>('testAttempts', [
    orderBy('completedAt', 'desc'),
    limit(500),
  ]);
}

// ===== Analytics Helpers =====

export function computeChapterPerformance(
  attempts: TestAttemptRecord[]
): ChapterPerformance[] {
  const chapterMap = new Map<string, { subject: string; total: number; correct: number }>();

  for (const attempt of attempts) {
    for (const answer of attempt.answers) {
      const key = answer.chapter;
      const existing = chapterMap.get(key) || { subject: attempt.subject, total: 0, correct: 0 };
      existing.total += 1;
      if (answer.isCorrect) existing.correct += 1;
      chapterMap.set(key, existing);
    }
  }

  return Array.from(chapterMap.entries()).map(([chapter, data]) => ({
    chapter,
    subject: data.subject,
    totalQuestions: data.total,
    correctAnswers: data.correct,
    accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
  }));
}

export function computeStudentSummary(attempts: TestAttemptRecord[]) {
  if (attempts.length === 0) {
    return {
      testsCompleted: 0,
      avgAccuracy: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      strongChapters: [] as string[],
      weakChapters: [] as string[],
    };
  }

  const totalQ = attempts.reduce((s, a) => s + a.totalQuestions, 0);
  const totalC = attempts.reduce((s, a) => s + a.correctAnswers, 0);
  const chapterPerf = computeChapterPerformance(attempts);
  const sorted = [...chapterPerf].sort((a, b) => b.accuracy - a.accuracy);

  return {
    testsCompleted: attempts.length,
    avgAccuracy: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
    totalQuestions: totalQ,
    totalCorrect: totalC,
    strongChapters: sorted.filter(c => c.accuracy >= 70).slice(0, 3).map(c => c.chapter),
    weakChapters: sorted.filter(c => c.accuracy < 50).slice(0, 3).map(c => c.chapter),
  };
}
