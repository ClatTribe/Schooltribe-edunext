/**
 * Teacher Analytics Page
 * Shows class-wide chapter heatmap + individual student breakdowns.
 * Data source: testAttempts collection via testAttemptService.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  getAllStudentAttempts,
  computeChapterPerformance,
  computeStudentSummary,
} from '@/services/testAttemptService';
import type { TestAttemptRecord, ChapterPerformance } from '@/services/testAttemptService';
import { getChapters } from '@/constants';

interface StudentInfo {
  uid: string;
  name: string;
  email: string;
}

export default function TeacherAnalyticsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [attempts, setAttempts] = useState<TestAttemptRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<'science' | 'maths'>('science');

  const board = profile?.board || 'CBSE';
  const classLevel = profile?.class || 10;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch students and attempts in parallel
        const [studentsSnap, allAttempts] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
          getAllStudentAttempts(),
        ]);

        const studentsList: StudentInfo[] = studentsSnap.docs.map((d) => ({
          uid: d.id,
          name: d.data().displayName || d.data().name || 'Unknown',
          email: d.data().email || '',
        }));

        setStudents(studentsList);
        setAttempts(allAttempts);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute class-wide chapter heatmap
  const chapters = getChapters(board, classLevel, selectedSubject);
  const classChapterPerf = computeChapterPerformance(
    attempts.filter((a) => a.subject === selectedSubject)
  );
  const chapterPerfMap = new Map<string, ChapterPerformance>();
  classChapterPerf.forEach((cp) => chapterPerfMap.set(cp.chapter, cp));

  // Per-student data
  const studentAttempts = selectedStudent
    ? attempts.filter((a) => a.userId === selectedStudent)
    : [];
  const studentSummary = selectedStudent ? computeStudentSummary(studentAttempts) : null;
  const studentChapterPerf = selectedStudent
    ? computeChapterPerformance(studentAttempts.filter((a) => a.subject === selectedSubject))
    : [];
  const studentChapterMap = new Map<string, ChapterPerformance>();
  studentChapterPerf.forEach((cp) => studentChapterMap.set(cp.chapter, cp));

  const selectedStudentInfo = students.find((s) => s.uid === selectedStudent);

  // Find class-wide weak chapters (accuracy < 50%)
  const weakChapters = classChapterPerf
    .filter((c) => c.accuracy < 50 && c.totalQuestions >= 3)
    .sort((a, b) => a.accuracy - b.accuracy);

  const getHeatColor = (accuracy: number | undefined): string => {
    if (accuracy === undefined) return 'bg-gray-200 text-gray-600';
    if (accuracy >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    if (accuracy >= 60) return 'bg-orange-100 text-orange-700 border-orange-300';
    if (accuracy >= 40) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-20 lg:pb-0">
        <h1 className="text-4xl font-bold text-gray-900">Class Analytics</h1>
        <div className="glass-card flex items-center justify-center py-20 bg-white border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
            <p className="text-gray-600 text-lg">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      {/* Header */}
      <header className="animate-fade-in-up space-y-3">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <Link to="/teacher" className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors mb-2 inline-block">← Back to Dashboard</Link>
            <h1 className="text-4xl font-bold text-gray-900">Class Analytics</h1>
            <p className="text-gray-600 mt-1">Chapter-wise performance heatmap across all students</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{attempts.length} test attempts</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">{students.length} students</span>
          </div>
        </div>
      </header>

      {/* Subject Toggle */}
      <div className="flex gap-3">
        {(['science', 'maths'] as const).map((s) => (
          <button key={s} onClick={() => setSelectedSubject(s)}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${selectedSubject === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
            {s === 'science' ? '🔬 Science' : '📐 Maths'}
          </button>
        ))}
      </div>

      {/* ===== CLASS HEATMAP ===== */}
      <section className="space-y-4 animate-fade-in-up">
        <h2 className="text-lg font-bold text-gray-900">🔥 Chapter Heatmap — {selectedSubject === 'science' ? 'Science' : 'Maths'}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((ch) => {
            const perf = chapterPerfMap.get(ch.name);
            const accuracy = perf?.accuracy;
            const colorClass = getHeatColor(accuracy);
            return (
              <div key={ch.number} className={`rounded-xl border p-4 space-y-2 transition-all ${colorClass}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold opacity-70">Ch {ch.number}</span>
                  <span className="text-lg font-black">{accuracy !== undefined ? `${accuracy}%` : '—'}</span>
                </div>
                <p className="font-semibold text-sm">{ch.name}</p>
                <div className="flex items-center gap-3 text-xs opacity-70">
                  <span>{perf?.totalQuestions ?? 0} Qs attempted</span>
                  <span>{perf?.correctAnswers ?? 0} correct</span>
                </div>
                {accuracy !== undefined && (
                  <div className="h-1.5 w-full rounded-full bg-black/20 overflow-hidden">
                    <div className="h-full rounded-full bg-current opacity-60" style={{ width: `${accuracy}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== WEAK CHAPTERS ALERT ===== */}
      {weakChapters.length > 0 && (
        <section className="space-y-4 animate-fade-in-up">
          <h2 className="text-lg font-bold text-red-600">⚠️ Class-Wide Weak Chapters</h2>
          <div className="glass-card p-0 overflow-hidden bg-white border border-gray-200">
            {weakChapters.map((ch) => (
              <div key={ch.chapter} className="flex items-center justify-between px-6 py-4 border-b border-gray-200 last:border-b-0">
                <div>
                  <p className="font-semibold text-gray-900">{ch.chapter}</p>
                  <p className="text-xs text-gray-500">{ch.subject} • {ch.totalQuestions} questions attempted</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-black text-red-600">{ch.accuracy}%</span>
                  <Link
                    to={`/teacher/create-test?chapters=${encodeURIComponent(ch.chapter)}&subject=${ch.subject}`}
                    className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-600 text-xs font-bold hover:bg-orange-200 transition-colors"
                  >
                    Reassign →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== STUDENT DRILL-DOWN ===== */}
      <section className="space-y-4 animate-fade-in-up">
        <h2 className="text-lg font-bold text-gray-900">👨‍🎓 Student Drill-Down</h2>

        {/* Student Picker */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSelectedStudent(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!selectedStudent ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-orange-400'}`}>
            All Students
          </button>
          {students.map((s) => (
            <button key={s.uid} onClick={() => setSelectedStudent(s.uid)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStudent === s.uid ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-orange-400'}`}>
              {s.name}
            </button>
          ))}
        </div>

        {/* Individual Student Summary */}
        {selectedStudent && selectedStudentInfo && studentSummary && (
          <div className="space-y-4">
            <div className="glass-card p-6 border border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedStudentInfo.name}</h3>
                  <p className="text-xs text-gray-500">{selectedStudentInfo.email}</p>
                </div>
                <Link to="/teacher/reports" className="text-xs text-orange-600 hover:text-orange-700">Full Report →</Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-black text-orange-500">{studentSummary.testsCompleted}</p>
                  <p className="text-xs text-gray-500">Tests</p>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-black ${studentSummary.avgAccuracy >= 70 ? 'text-emerald-600' : studentSummary.avgAccuracy >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
                    {studentSummary.avgAccuracy}%
                  </p>
                  <p className="text-xs text-gray-500">Accuracy</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-emerald-600 font-semibold">{studentSummary.strongChapters.join(', ') || '—'}</p>
                  <p className="text-xs text-gray-500">Strong</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-red-600 font-semibold">{studentSummary.weakChapters.join(', ') || '—'}</p>
                  <p className="text-xs text-gray-500">Weak</p>
                </div>
              </div>
            </div>

            {/* Student's Chapter Heatmap */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {chapters.map((ch) => {
                const perf = studentChapterMap.get(ch.name);
                const accuracy = perf?.accuracy;
                const colorClass = getHeatColor(accuracy);
                return (
                  <div key={ch.number} className={`rounded-xl border p-3 space-y-1 transition-all ${colorClass}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold opacity-70">Ch {ch.number}</span>
                      <span className="font-black">{accuracy !== undefined ? `${accuracy}%` : '—'}</span>
                    </div>
                    <p className="font-medium text-sm">{ch.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
