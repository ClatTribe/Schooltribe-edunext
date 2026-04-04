/**
 * Seed script — generates 10 demo students in Firestore
 * Run this ONCE from a browser page (e.g., a hidden admin route)
 */
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

const DEMO_STUDENTS = [
  { name: 'Aarav Sharma', xp: 1850, streak: 14, tests: 22, accuracy: 82, videosWatched: 35, subjects: ['science', 'maths'] },
  { name: 'Priya Patel', xp: 2340, streak: 21, tests: 31, accuracy: 91, videosWatched: 48, subjects: ['science', 'maths'] },
  { name: 'Rohan Verma', xp: 920, streak: 3, tests: 10, accuracy: 58, videosWatched: 12, subjects: ['science', 'maths'] },
  { name: 'Ananya Singh', xp: 1560, streak: 9, tests: 18, accuracy: 76, videosWatched: 27, subjects: ['science', 'maths'] },
  { name: 'Karan Gupta', xp: 3100, streak: 30, tests: 45, accuracy: 94, videosWatched: 62, subjects: ['science', 'maths'] },
  { name: 'Neha Reddy', xp: 580, streak: 1, tests: 5, accuracy: 42, videosWatched: 6, subjects: ['science'] },
  { name: 'Arjun Kumar', xp: 1200, streak: 7, tests: 15, accuracy: 71, videosWatched: 20, subjects: ['maths'] },
  { name: 'Diya Joshi', xp: 2780, streak: 18, tests: 38, accuracy: 88, videosWatched: 55, subjects: ['science', 'maths'] },
  { name: 'Vivek Mishra', xp: 440, streak: 0, tests: 3, accuracy: 35, videosWatched: 4, subjects: ['science', 'maths'] },
  { name: 'Ishita Nair', xp: 1980, streak: 12, tests: 26, accuracy: 85, videosWatched: 40, subjects: ['science', 'maths'] },
];

const SCIENCE_CHAPTERS = [
  'Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Metals and Non-metals',
  'Carbon and its Compounds', 'Life Processes', 'Control and Coordination',
];

const MATHS_CHAPTERS = [
  'Real Numbers', 'Polynomials', 'Quadratic Equations',
  'Triangles', 'Coordinate Geometry', 'Statistics',
];

function generateDemoId(index: number): string {
  return `demo_student_${String(index + 1).padStart(3, '0')}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysAgo));
  return d;
}

function getLastActiveDate(streak: number): string {
  if (streak === 0) {
    const d = new Date();
    d.setDate(d.getDate() - randomInt(2, 10));
    return d.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

export async function seedDemoData(): Promise<string> {
  const results: string[] = [];

  for (let i = 0; i < DEMO_STUDENTS.length; i++) {
    const student = DEMO_STUDENTS[i];
    const uid = generateDemoId(i);
    const now = Timestamp.now();

    try {
      // 1. Create user profile in 'users' collection
      await setDoc(doc(db, 'users', uid), {
        uid,
        role: 'student',
        displayName: student.name,
        phone: `+91${9000000000 + i}`,
        email: `${student.name.toLowerCase().replace(/\s/g, '.')}@demo.vidyaa.in`,
        board: 'CBSE',
        class: 10,
        subjects: student.subjects,
        onboardingComplete: true,
        createdAt: Timestamp.fromDate(randomDate(60)),
        updatedAt: now,
      });

      // 2. Create gamification profile
      await setDoc(doc(db, 'gamification', uid), {
        userId: uid,
        xp: student.xp,
        level: Math.floor(student.xp / 100) + 1,
        streak: student.streak,
        lastActiveDate: getLastActiveDate(student.streak),
        shieldActive: student.streak >= 7,
        testsCompleted: student.tests,
        videosWatched: student.videosWatched,
        accuracy: student.accuracy,
        badges: student.xp >= 2000
          ? [{ id: 'xp_master', name: 'XP Master', description: 'Earned 2000+ XP', icon: '⭐', earnedAt: now }]
          : [],
      });

      // 3. Create 3-5 test attempts per student
      const numTests = Math.min(student.tests, randomInt(3, 5));
      for (let t = 0; t < numTests; t++) {
        const isScienceTest = Math.random() > 0.4;
        const subject = isScienceTest ? 'science' : 'maths';
        const chapters = isScienceTest ? SCIENCE_CHAPTERS : MATHS_CHAPTERS;
        const chapter = chapters[randomInt(0, chapters.length - 1)];
        const totalQuestions = randomInt(10, 20);
        const correctAnswers = Math.round(totalQuestions * (student.accuracy / 100) * (0.8 + Math.random() * 0.4));
        const scored = Math.min(totalQuestions, Math.max(0, correctAnswers));

        const answers = Array.from({ length: totalQuestions }, (_, qi) => ({
          questionId: `q_${uid}_${t}_${qi}`,
          selectedAnswer: qi < scored ? 'a' : 'b',
          isCorrect: qi < scored,
          timeTaken: randomInt(15, 120),
          markedForReview: Math.random() > 0.8,
        }));

        const testId = `test_${uid}_${t}`;
        const testDate = randomDate(30);
        await setDoc(doc(db, 'testAttempts', testId), {
          id: testId,
          userId: uid,
          subject,
          chapters: [chapter],
          totalMarks: totalQuestions,
          scoredMarks: scored,
          totalQuestions,
          answers,
          timeSpent: randomInt(300, 1800),
          startedAt: Timestamp.fromDate(testDate),
          completedAt: Timestamp.fromDate(new Date(testDate.getTime() + randomInt(300, 1800) * 1000)),
        });
      }

      // 4. Create sudden death attempts
      if (student.tests > 5) {
        const sdId = `sd_${uid}_today`;
        const sdCorrect = Math.round(15 * (student.accuracy / 100));
        await setDoc(doc(db, 'suddenDeathAttempts', sdId), {
          userId: uid,
          date: new Date().toISOString().split('T')[0],
          questionsAnswered: randomInt(5, 15),
          correctAnswers: sdCorrect,
          streak: Math.min(sdCorrect, randomInt(3, 12)),
          xpEarned: sdCorrect * 5,
          livesRemaining: student.accuracy > 70 ? randomInt(1, 3) : 0,
          completedAt: Timestamp.now(),
        });
      }

      results.push(`✓ ${student.name} (${uid})`);
    } catch (error) {
      results.push(`✗ ${student.name}: ${error}`);
    }
  }

  return `Seeded ${results.filter(r => r.startsWith('✓')).length}/10 students:\n${results.join('\n')}`;
}
