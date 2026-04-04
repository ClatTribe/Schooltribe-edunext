import { useState, useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { getChapters, SUBJECT_LABELS, CBSE_SECTIONS } from '@/constants';
import { getChapterQuestions } from '@/services/questionService';
import type { CachedQuestion } from '@/services/questionService';
import { saveTestAttempt } from '@/services/testAttemptService';
import type { AttemptAnswer } from '@/services/testAttemptService';
import { getDocument } from '@/services/firestoreService';
import type { GamificationProfile } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Subject } from '@/types';

type ViewMode = 'chapters' | 'test';

interface AssignedTest {
  id: string;
  testName: string;
  subject: string;
  chapters: string[];
  difficulty: string;
  questionCount: number;
  timeLimit: number;
  testCode: string;
  questions: CachedQuestion[];
  teacherId: string;
  createdAt: { seconds: number } | null;
}

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function CircleProgress({ percentage }: { percentage: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={72} height={72} className="transform -rotate-90">
      <circle
        cx={36}
        cy={36}
        r={radius}
        fill="none"
        stroke="rgb(226, 232, 240)"
        strokeWidth={4}
      />
      <circle
        cx={36}
        cy={36}
        r={radius}
        fill="none"
        stroke="rgb(249, 115, 22)"
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-gray-900 font-bold text-xl"
        transform="rotate(90 36 36)"
      >
        {percentage}%
      </text>
    </svg>
  );
}

export default function TestsPage() {
  const { user, profile } = useAuth();
  const [view, setView] = useState<ViewMode>('chapters');
  const [selectedSubject, setSelectedSubject] = useState<Subject>('science');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [questions, setQuestions] = useState<CachedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  // Assigned tests state
  const [assignedTests, setAssignedTests] = useState<AssignedTest[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);
  const [currentTestType, setCurrentTestType] = useState<'practice' | 'assigned'>('practice');
  const [currentTeacherTestId, setCurrentTeacherTestId] = useState<string | null>(null);

  // Gamification state
  const [gamification, setGamification] = useState<GamificationProfile | null>(null);
  const [loadingGamification, setLoadingGamification] = useState(true);

  // Topic filter state
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  const board = profile?.board || 'CBSE';
  const classLevel = profile?.class || 10;
  const subjects = profile?.subjects || ['science', 'maths', 'ai'];

  // Fetch gamification profile on mount
  useEffect(() => {
    if (!user) return;
    const fetchGamification = async () => {
      try {
        setLoadingGamification(true);
        const gProfile = await getDocument<GamificationProfile>(
          'gamification',
          user.uid
        );
        setGamification(gProfile || null);
      } catch (err) {
        console.error('Error fetching gamification:', err);
      } finally {
        setLoadingGamification(false);
      }
    };
    fetchGamification();
  }, [user]);

  // Fetch assigned tests on mount
  useEffect(() => {
    if (!user) return;
    const fetchAssigned = async () => {
      try {
        setLoadingAssigned(true);
        const snap = await getDocs(
          query(
            collection(db, 'teacherTests'),
            where('assignedStudents', 'array-contains', user.uid),
            where('status', '==', 'active')
          )
        );
        const tests: AssignedTest[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as AssignedTest));
        setAssignedTests(tests);
      } catch (err) {
        console.error('Error fetching assigned tests:', err);
      } finally {
        setLoadingAssigned(false);
      }
    };
    fetchAssigned();
  }, [user]);

  // Start an AI practice test
  async function startPracticeTest(subject: Subject, chapterName: string, chapterNumber: number) {
    setSelectedSubject(subject);
    setSelectedChapter(chapterName);
    setAnswers({});
    setSubmitted(false);
    setCurrentQ(0);
    setError(null);
    setSaving(false);
    setXpEarned(0);
    setCurrentTestType('practice');
    setCurrentTeacherTestId(null);
    setLoading(true);
    setView('test');

    try {
      const qs = await getChapterQuestions(subject, chapterNumber, chapterName, board, classLevel);
      if (!qs || qs.length === 0) throw new Error('No questions were generated. Please try again.');
      const shuffled = [...qs].sort(() => Math.random() - 0.5).slice(0, 10);
      setQuestions(shuffled);
    } catch (err) {
      console.error('Error loading questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load questions.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  // Start a teacher-assigned test
  function startAssignedTest(test: AssignedTest) {
    setSelectedSubject(test.subject as Subject);
    setSelectedChapter(test.testName);
    setAnswers({});
    setSubmitted(false);
    setCurrentQ(0);
    setError(null);
    setSaving(false);
    setXpEarned(0);
    setCurrentTestType('assigned');
    setCurrentTeacherTestId(test.id);

    // Normalize teacher test questions to CachedQuestion format
    const qs: CachedQuestion[] = (test.questions || []).map((q: CachedQuestion, i: number) => ({
      id: `assigned_${test.id}_${i}`,
      question: (q.question as string) || '',
      options: (q.options as { a: string; b: string; c: string; d: string }) || { a: '', b: '', c: '', d: '' },
      correctAnswer: (q.correctAnswer as 'a' | 'b' | 'c' | 'd') || 'a',
      explanation: (q.explanation as string) || '',
      difficulty: (q.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
      chapter: (q.chapter as string) || test.chapters?.[0] || '',
      subject: test.subject || 'science',
      topic: (q.topic as string) || '',
    }));

    setQuestions(qs);
    setView('test');
  }

  // Submit test and save to Firestore
  async function handleSubmit() {
    setSubmitted(true);

    if (!user) return;
    setSaving(true);

    try {
      const attemptAnswers: AttemptAnswer[] = questions.map((q) => ({
        questionId: q.id,
        question: q.question,
        selectedAnswer: answers[q.id] || '',
        correctAnswer: q.correctAnswer,
        isCorrect: answers[q.id] === q.correctAnswer,
        chapter: q.chapter,
        difficulty: q.difficulty,
      }));

      const correctCount = attemptAnswers.filter((a) => a.isCorrect).length;
      const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

      await saveTestAttempt({
        userId: user.uid,
        testType: currentTestType,
        teacherTestId: currentTeacherTestId || undefined,
        subject: selectedSubject,
        chapters: [...new Set(questions.map((q) => q.chapter))],
        board,
        classLevel,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        score: scorePercent,
        answers: attemptAnswers,
        timeSpent: 0, // TODO: add timer
      });

      // Calculate XP earned for display
      const baseXP = 50;
      const bonusXP = correctCount * 5;
      const perfectBonus = correctCount === questions.length ? 25 : 0;
      const assignedBonus = currentTestType === 'assigned' ? 20 : 0;
      setXpEarned(baseXP + bonusXP + perfectBonus + assignedBonus);
    } catch (err) {
      console.error('Error saving test attempt:', err);
      // Don't block the user — they can still see results
    } finally {
      setSaving(false);
    }
  }

  const score = submitted
    ? questions.filter((q) => answers[q.id] === q.correctAnswer).length
    : 0;

  // ====== TEST VIEW ======
  if (view === 'test') {
    if (loading) {
      return (
        <div className="space-y-8 pb-20 lg:pb-0">
          <header className="space-y-2">
            <button onClick={() => setView('chapters')} className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1">
              ← Back to Chapters
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{selectedChapter}</h1>
          </header>
          <div className="bg-white rounded-2xl border border-gray-200 p-20 flex flex-col items-center justify-center space-y-4 shadow-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-gray-200 border-t-orange-500" />
            <p className="text-gray-600 text-lg">Generating questions with AI...</p>
            <p className="text-gray-500 text-sm">This may take a few seconds the first time</p>
          </div>
        </div>
      );
    }

    if (error || questions.length === 0) {
      return (
        <div className="space-y-8 pb-20 lg:pb-0">
          <header className="space-y-2">
            <button onClick={() => setView('chapters')} className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1">
              ← Back to Chapters
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{selectedChapter}</h1>
          </header>
          <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center space-y-4 shadow-sm">
            <p className="text-3xl">😔</p>
            <p className="text-gray-700 text-lg font-medium">Couldn't load questions</p>
            <p className="text-gray-600 text-sm max-w-md text-center">{error || 'No questions available.'}</p>
            <button onClick={() => setView('chapters')} className="btn-ghost px-6 py-2 font-semibold">Back</button>
          </div>
        </div>
      );
    }

    const q = questions[currentQ];
    const answered = Object.keys(answers).length;

    return (
      <div className="space-y-8 pb-20 lg:pb-0">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <button onClick={() => setView('chapters')} className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1">
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{selectedChapter}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-600 text-sm">
                {selectedSubject === 'science' ? '🔬 Science' : '📐 Maths'} • {answered}/{questions.length} answered
              </p>
              {currentTestType === 'assigned' && (
                <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs font-bold border border-orange-200">
                  ASSIGNED
                </span>
              )}
              {q.difficulty && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  q.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700' :
                  q.difficulty === 'medium' ? 'bg-orange-50 text-orange-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {q.difficulty.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          {!submitted && (
            <button onClick={handleSubmit} className="btn-glow px-6 py-3 font-semibold whitespace-nowrap">
              Submit Test
            </button>
          )}
        </header>

        {/* Score Card */}
        {submitted && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 bg-gradient-to-br from-orange-50 to-white shadow-sm">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <p className="text-5xl font-bold text-gradient">{score}/{questions.length}</p>
                <div className="h-1 w-24 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mx-auto" />
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {score === questions.length ? '🎉 Perfect Score!' : score >= questions.length * 0.7 ? '👍 Great Job!' : '💪 Keep Practicing'}
              </p>
              <p className="text-gray-600 text-sm">{score} out of {questions.length} correct</p>
              {xpEarned > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 border border-orange-200">
                  <span className="text-orange-600 font-bold">+{xpEarned} XP earned!</span>
                </div>
              )}
              {saving && <p className="text-xs text-gray-500">Saving results...</p>}
              <button onClick={() => setView('chapters')} className="btn-ghost px-6 py-2 mt-4 font-medium">
                Try Another
              </button>
            </div>
          </div>
        )}

        {/* Question Navigation Pills */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((qItem, i) => {
              const isAnswered = answers[qItem.id] !== undefined;
              const isCorrect = submitted && answers[qItem.id] === qItem.correctAnswer;
              const isWrong = submitted && isAnswered && answers[qItem.id] !== qItem.correctAnswer;
              const isCurrent = currentQ === i;

              let bgClass = 'bg-gray-100 text-gray-500';
              if (isCorrect) bgClass = 'bg-green-100 text-green-700 border-green-300';
              else if (isWrong) bgClass = 'bg-red-100 text-red-700 border-red-300';
              else if (isCurrent) bgClass = 'bg-orange-100 text-orange-700 border-orange-500';
              else if (isAnswered) bgClass = 'bg-orange-50 text-orange-700 border-orange-200';

              return (
                <button key={qItem.id} onClick={() => setCurrentQ(i)}
                  className={`h-10 w-10 rounded-lg text-sm font-bold transition-all flex items-center justify-center border ${bgClass} ${isCurrent ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-white' : ''}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Question */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 space-y-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold">Question {currentQ + 1} of {questions.length}</span>
              <div className="h-2 flex-1 mx-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-300" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-relaxed">{q.question}</p>
          </div>

          <div className="space-y-3">
            {(['a', 'b', 'c', 'd'] as const).map((key) => {
              const optText = q.options[key];
              const isSelected = answers[q.id] === key;
              const isCorrectOpt = submitted && key === q.correctAnswer;
              const isWrongOpt = submitted && isSelected && key !== q.correctAnswer;

              let borderCl = 'border-gray-300 hover:border-gray-400';
              let bgCl = 'bg-gray-50 hover:bg-gray-100';
              if (isCorrectOpt) { borderCl = 'border-green-300 bg-green-50'; bgCl = ''; }
              else if (isWrongOpt) { borderCl = 'border-red-300 bg-red-50'; bgCl = ''; }
              else if (isSelected) { borderCl = 'border-orange-400 bg-orange-50'; bgCl = ''; }

              return (
                <button key={key}
                  onClick={() => { if (!submitted) setAnswers((p) => ({ ...p, [q.id]: key })); }}
                  disabled={submitted}
                  className={`w-full ${bgCl} rounded-xl border-2 px-5 py-4 text-left transition-all cursor-pointer group ${borderCl} ${submitted ? 'cursor-not-allowed opacity-90' : ''} ${isCorrectOpt ? 'ring-2 ring-green-300' : ''} ${isWrongOpt ? 'ring-2 ring-red-300' : ''} ${isSelected && !submitted ? 'ring-2 ring-orange-300' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-sm transition-all ${
                      isCorrectOpt ? 'bg-green-100 text-green-700 border border-green-300' :
                      isWrongOpt ? 'bg-red-100 text-red-700 border border-red-300' :
                      isSelected ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                      'bg-gray-200 text-gray-600 group-hover:bg-gray-300'
                    }`}>
                      {key.toUpperCase()}
                    </div>
                    <span className="flex-1 text-base font-medium text-gray-900">{optText}</span>
                    {isCorrectOpt && <span className="text-green-600 text-lg">✓</span>}
                    {isWrongOpt && <span className="text-red-600 text-lg">✗</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {submitted && q.explanation && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Explanation</p>
              <p className="text-sm text-blue-900">{q.explanation}</p>
            </div>
          )}
        </div>

        {!submitted && (
          <div className="flex gap-4 justify-between">
            <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
              className="btn-ghost px-6 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">← Previous</button>
            <button onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))} disabled={currentQ === questions.length - 1}
              className="btn-ghost px-6 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Next →</button>
          </div>
        )}
      </div>
    );
  }

  // ====== CHAPTERS VIEW ======
  const chapters = getChapters(board, classLevel, selectedSubject);
  const testsCompleted = 3; // TODO: fetch from testAttempts for actual count
  const topicOptions = ['all', ...subjects];

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      {/* Active Mission Banner */}
      <div className="animate-fade-in-up rounded-2xl overflow-hidden">
        <div className="relative p-6 md:p-8 border border-orange-200 bg-gradient-to-br from-white to-orange-50 shadow-sm">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl" />
            <div className="absolute -bottom-8 left-20 w-40 h-40 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-bold text-gradient">Active Mission</h2>
              <p className="text-gray-700">Complete 3 Chapter Tests Today</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="transform -rotate-90 w-20 h-20" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="rgba(249, 115, 22, 0.15)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="6"
                      strokeDasharray={`${(testsCompleted / 3) * 282.7} 282.7`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-orange-600">{testsCompleted}/3</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Tests Completed</p>
                <p className="text-2xl font-bold text-gray-900">{3 - testsCompleted} more to go</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {!loadingGamification && gamification && (
        <div className="animate-fade-in-up grid gap-4 sm:grid-cols-3" style={{ animationDelay: '50ms' }}>
          {/* Daily Streak */}
          <div className="rounded-xl p-4 border border-gray-200 space-y-3 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Daily Streak</span>
              <span className="text-lg">🔥</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{gamification.streak}</div>
            <div className="flex gap-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <div
                  key={day + i}
                  className={`h-6 w-6 rounded text-xs font-bold flex items-center justify-center ${
                    i < gamification.streak
                      ? 'bg-orange-100 text-orange-700 border border-orange-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Points to Next Level */}
          <div className="rounded-xl p-4 border border-gray-200 space-y-3 bg-white shadow-sm">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Points to Next Level</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{gamification.xp % 100}</span>
              <span className="text-xs text-gray-600">/ 100</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-gray-200">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500"
                style={{ width: `${(gamification.xp % 100) / 100 * 100}%` }}
              />
            </div>
          </div>

          {/* Accuracy Rate */}
          <div className="rounded-xl p-4 border border-gray-200 space-y-3 bg-white shadow-sm">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Accuracy Rate</span>
            <div className="text-3xl font-bold text-gray-900">
              {gamification.level}
              <span className="text-sm text-gray-600 ml-1">Lvl</span>
            </div>
            <p className="text-xs text-gray-600">
              {gamification.badges?.length || 0} badges earned
            </p>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="animate-fade-in-up space-y-4" style={{ animationDelay: '100ms' }}>
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl font-bold text-gradient">Question Bank & Mock Tests</h1>
            <div className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1">
              <span className="live-dot" />
              <span className="text-xs font-bold text-orange-600">AI-POWERED</span>
            </div>
          </div>
          <p className="text-gray-600 text-lg">Master your subjects with AI-generated practice tests</p>
        </div>
      </div>

      {/* ===== ASSIGNED TESTS SECTION ===== */}
      {assignedTests.length > 0 && (
        <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">📋 Assigned by Teacher</h2>
            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs font-bold border border-orange-200">
              {assignedTests.length} {assignedTests.length === 1 ? 'test' : 'tests'}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignedTests.map((test) => (
              <button
                key={test.id}
                onClick={() => startAssignedTest(test)}
                className="bg-white rounded-2xl p-6 border border-gray-200 text-left group overflow-hidden relative hover:border-orange-200 transition-all shadow-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-600/0 group-hover:from-orange-500/3 group-hover:to-orange-600/3 transition-all duration-300" />
                <div className="relative space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs font-bold">ASSIGNED</span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium capitalize">{test.difficulty}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-700 transition-colors">{test.testName}</h3>
                    <p className="text-xs text-gray-600">{test.chapters?.join(', ')}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 group-hover:border-orange-200 transition-colors">
                    <p className="text-xs text-gray-600">{test.questionCount} Qs • {test.timeLimit}m limit</p>
                    <svg className="h-5 w-5 text-orange-500 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {loadingAssigned && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 flex items-center justify-center gap-3 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-orange-500" />
          <p className="text-gray-600 text-sm">Checking for assigned tests...</p>
        </div>
      )}

      {/* CBSE Exam Format */}
      {board === 'CBSE' && (
        <div className="animate-fade-in-up bg-white rounded-2xl p-6 border border-gray-200 shadow-sm" style={{ animationDelay: '200ms' }}>
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <span className="text-orange-500">📋</span> CBSE Exam Format
            </h3>
            <div className="stagger-children grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(CBSE_SECTIONS).map(([key, sec]) => (
                <div key={key} className="stagger-item animate-scale-in bg-white rounded-lg p-3 border border-gray-200 space-y-1 hover:border-orange-200 transition-colors">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">{sec.name}</p>
                  <p className="text-gray-900 font-bold text-2xl animate-count-up">{sec.count}</p>
                  <p className="text-gray-600 text-xs">{sec.marksEach} marks each</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Topic Filter Pills */}
      <div className="animate-fade-in-up overflow-x-auto pb-2" style={{ animationDelay: '250ms' }}>
        <div className="flex gap-2">
          {topicOptions.map((topic) => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
                selectedTopic === topic
                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {topic === 'all' ? 'All Topics' : SUBJECT_LABELS[topic as Subject]?.label || topic}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Tabs */}
      <div className="animate-fade-in flex gap-3" style={{ animationDelay: '250ms' }}>
        <h2 className="text-lg font-bold text-gray-900 self-center mr-2">📝 Practice Tests</h2>
        {subjects.map((s) => (
          <button key={s} onClick={() => setSelectedSubject(s)}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${selectedSubject === s ? 'btn-glow animate-pulse-glow' : 'btn-ghost border border-gray-200'}`}>
            {SUBJECT_LABELS[s]?.icon} {SUBJECT_LABELS[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Chapters Grid */}
      <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ animationDelay: '300ms' }}>
        {chapters.map((ch, idx) => {
          const isLocked = false; // All chapters unlocked
          const difficulty = DIFFICULTIES[idx % DIFFICULTIES.length];

          return (
            <button
              key={ch.number}
              onClick={() => !isLocked && startPracticeTest(selectedSubject, ch.name, ch.number)}
              disabled={isLocked}
              className={`stagger-item animate-fade-in-up rounded-2xl p-6 border transition-all duration-300 text-left group overflow-hidden relative bg-white shadow-sm hover:shadow-md ${
                isLocked
                  ? 'border-gray-200/50 opacity-60 cursor-not-allowed'
                  : 'border-gray-200 hover:border-orange-200'
              }`}
            >
              {/* Gradient background */}
              {!isLocked && (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-600/0 group-hover:from-orange-500/3 group-hover:to-orange-600/3 transition-all duration-300" />
              )}

              {/* Lock overlay for premium chapters */}
              {isLocked && (
                <div className="absolute inset-0 bg-gray-900/10 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                  <div className="text-center space-y-2">
                    <span className="text-2xl">🔒</span>
                    <p className="text-xs font-bold text-gray-700">Premium Chapter</p>
                  </div>
                </div>
              )}

              <div className="relative space-y-4">
                {/* Circular Progress + Chapter Badge */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs font-bold border border-orange-200">
                        Chapter {ch.number}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        difficulty === 'Easy'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : difficulty === 'Medium'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {difficulty}
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold transition-colors ${!isLocked ? 'text-gray-900 group-hover:text-orange-700' : 'text-gray-500'}`}>
                      {ch.name}
                    </h3>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <CircleProgress percentage={0} />
                  </div>
                </div>

                {/* Subtitle */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 group-hover:border-orange-200 transition-colors">
                  <p className={`text-xs transition-colors ${!isLocked ? 'text-gray-600 group-hover:text-gray-700' : 'text-gray-500'}`}>
                    10 Questions • AI Generated
                  </p>
                  {!isLocked && (
                    <svg className="h-5 w-5 text-orange-500 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
