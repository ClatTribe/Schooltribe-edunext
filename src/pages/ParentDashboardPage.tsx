/**
 * Parent Dashboard — Live child performance data from Firestore.
 * Reads linked student's gamification, test attempts, and chapter performance.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import {
  computeChapterPerformance,
  computeStudentSummary,
} from '@/services/testAttemptService';
import type { TestAttemptRecord } from '@/services/testAttemptService';

interface ChildData {
  name: string;
  board: string;
  classLevel: number;
  xp: number;
  level: number;
  streak: number;
  accuracy: number;
  testsCompleted: number;
  videosWatched: number;
  lastActiveDate: string;
}

export default function ParentDashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [childData, setChildData] = useState<ChildData | null>(null);
  const [attempts, setAttempts] = useState<TestAttemptRecord[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'subjects' | 'activity'>('overview');
  const [noChild, setNoChild] = useState(false);

  const linkedStudentUids = profile?.linkedStudentUids || [];

  useEffect(() => {
    if (linkedStudentUids.length === 0) {
      setNoChild(true);
      setLoading(false);
      return;
    }

    const fetchChildData = async () => {
      setLoading(true);
      try {
        const studentUid = linkedStudentUids[0];

        const [profileSnap, gamSnap, attemptsSnap] = await Promise.all([
          getDoc(doc(db, 'users', studentUid)),
          getDoc(doc(db, 'gamification', studentUid)),
          getDocs(query(
            collection(db, 'testAttempts'),
            where('userId', '==', studentUid),
            orderBy('completedAt', 'desc'),
            limit(50)
          )),
        ]);

        const profileData = profileSnap.data();
        const gamData = gamSnap.data();

        setChildData({
          name: profileData?.displayName || profileData?.name || 'Your Child',
          board: profileData?.board || 'CBSE',
          classLevel: profileData?.class || 10,
          xp: gamData?.xp || 0,
          level: gamData?.level || 1,
          streak: gamData?.streak || gamData?.currentStreak || 0,
          accuracy: gamData?.accuracy || 0,
          testsCompleted: gamData?.testsCompleted || 0,
          videosWatched: gamData?.videosWatched || 0,
          lastActiveDate: gamData?.lastActiveDate || '',
        });

        const attemptsList: TestAttemptRecord[] = attemptsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as TestAttemptRecord));
        setAttempts(attemptsList);
      } catch (err) {
        console.error('Error fetching child data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChildData();
  }, [linkedStudentUids.length > 0 ? linkedStudentUids[0] : '']);

  const summary = computeStudentSummary(attempts);
  const chapterPerf = computeChapterPerformance(attempts);
  const sortedChapters = [...chapterPerf].sort((a, b) => b.accuracy - a.accuracy);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getLastActiveText = (date: string): string => {
    if (!date) return 'Not active yet';
    const today = new Date().toISOString().split('T')[0];
    if (date === today) return 'Active today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return date;
  };

  const recentAttempts = attempts.slice(0, 10);

  // Weekly stats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAttempts = attempts.filter((a) => {
    const completedAt = a.completedAt;
    if (!completedAt) return false;
    const date = typeof (completedAt as unknown as { toDate?: () => Date }).toDate === 'function'
      ? (completedAt as unknown as { toDate: () => Date }).toDate()
      : new Date(completedAt as unknown as string);
    return date >= weekAgo;
  });
  const weekTests = weekAttempts.length;
  const weekAvgScore = weekAttempts.length > 0
    ? Math.round(weekAttempts.reduce((s, a) => s + a.score, 0) / weekAttempts.length)
    : 0;

  if (loading) {
    return (
      <div className="space-y-8 pb-20 lg:pb-0">
        <h1 className="text-4xl font-bold text-gray-900">Learning Progress</h1>
        <div className="glass-card flex items-center justify-center py-20 bg-white border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
            <p className="text-gray-600">Loading your child's progress...</p>
          </div>
        </div>
      </div>
    );
  }

  if (noChild || !childData) {
    return (
      <div className="space-y-8 pb-20 lg:pb-0">
        <h1 className="text-4xl font-bold text-gray-900">Learning Progress</h1>
        <div className="glass-card py-16 text-center space-y-4 bg-white border border-gray-200">
          <p className="text-4xl">👨‍👩‍👧</p>
          <h2 className="text-2xl font-bold text-gray-900">No Child Linked Yet</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Ask your child to share their parent link code from their Profile page. Once linked, you'll see their real-time learning progress here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">Learning Progress</h1>
        <p className="text-gray-600">Monitor {childData.name}'s journey with real-time insights</p>
      </header>

      {/* Child Info Card */}
      <div className="glass-card border border-orange-500/20 bg-gradient-to-br from-white to-gray-50 border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-2xl font-bold text-white shadow-lg">
              {childData.name[0]}
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-900">{childData.name}</h2>
              <p className="text-sm text-gray-600">{childData.board} Class {childData.classLevel} · {getLastActiveText(childData.lastActiveDate)}</p>
              <div className="flex gap-4 pt-1">
                <span className="inline-block rounded-full bg-orange-500/20 px-3 py-1 text-xs font-medium text-orange-600">Level {childData.level}</span>
                <span className="inline-block rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-600">{childData.xp} XP</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-5xl font-black text-orange-500">{childData.streak}</p>
            <p className="text-sm text-gray-600">🔥 Day Streak</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-300">
        {(['overview', 'subjects', 'activity'] as const).map((tab) => (
          <button key={tab} onClick={() => setSelectedTab(tab)}
            className={`px-4 py-3 text-sm font-semibold capitalize transition-all relative ${selectedTab === tab ? 'text-orange-500' : 'text-gray-600 hover:text-gray-700'}`}>
            {tab}
            {selectedTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-400" />}
          </button>
        ))}
      </div>

      {/* Overview */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="glass-card space-y-3 border border-gray-200 bg-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Tests This Week</p>
              <p className="text-4xl font-black text-orange-500">{weekTests}</p>
              <p className="text-xs text-gray-600">Avg: {weekAvgScore}%</p>
            </div>
            <div className="glass-card space-y-3 border border-gray-200 bg-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Overall Accuracy</p>
              <p className={`text-4xl font-black ${childData.accuracy >= 70 ? 'text-emerald-600' : childData.accuracy >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
                {childData.accuracy > 0 ? `${childData.accuracy}%` : '—'}
              </p>
              <p className="text-xs text-gray-600">{summary.testsCompleted} tests total</p>
            </div>
            <div className="glass-card space-y-3 border border-gray-200 bg-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Total Tests</p>
              <p className="text-4xl font-black text-blue-600">{childData.testsCompleted}</p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="glass-card space-y-3 border border-gray-200 bg-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Videos</p>
              <p className="text-4xl font-black text-purple-600">{childData.videosWatched}</p>
              <p className="text-xs text-gray-600">Watched</p>
            </div>
          </div>

          <div className="glass-card space-y-4 border border-gray-200 bg-white">
            <h3 className="text-lg font-bold text-gray-900">Insights</h3>
            <div className="space-y-3 text-sm text-gray-700">
              {childData.streak > 0 ? (
                <p>{childData.name} has a <span className="font-semibold text-orange-500">{childData.streak}-day streak</span>! Keep encouraging consistency.</p>
              ) : (
                <p>{childData.name} hasn't been active recently. A gentle nudge could help restart momentum.</p>
              )}
              {summary.weakChapters.length > 0 && (
                <div className="rounded-lg border border-orange-300 bg-orange-50 p-4">
                  <p className="mb-1 font-semibold text-orange-700">⚠️ Needs Attention</p>
                  <p className="text-xs text-orange-600">Struggling with: {summary.weakChapters.join(', ')}</p>
                </div>
              )}
              {summary.strongChapters.length > 0 && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                  <p className="mb-1 font-semibold text-emerald-700">💪 Strong In</p>
                  <p className="text-xs text-emerald-600">{summary.strongChapters.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subjects */}
      {selectedTab === 'subjects' && (
        <div className="space-y-3">
          {sortedChapters.length === 0 ? (
            <div className="glass-card py-12 text-center bg-white border border-gray-200">
              <p className="text-gray-600">No test data yet. Progress shows here once tests are taken.</p>
            </div>
          ) : sortedChapters.map((ch) => {
            const scoreColor = getScoreColor(ch.accuracy);
            return (
              <div key={ch.chapter} className="glass-card space-y-3 border border-gray-200 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{ch.chapter}</p>
                    <p className="text-xs text-gray-600">{ch.subject} • {ch.totalQuestions} Qs</p>
                  </div>
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: scoreColor + '33', color: scoreColor }}>{ch.accuracy}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-300">
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${ch.accuracy}%`, backgroundColor: scoreColor }} />
                </div>
                <span className="text-xs text-gray-600">
                  {ch.accuracy >= 80 ? '💪 Strong' : ch.accuracy >= 60 ? '📈 Improving' : '⚠️ Needs attention'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity */}
      {selectedTab === 'activity' && (
        <div className="space-y-4">
          {recentAttempts.length === 0 ? (
            <div className="glass-card py-12 text-center bg-white border border-gray-200">
              <p className="text-gray-600">No activity yet.</p>
            </div>
          ) : (
            <div className="glass-card p-0 overflow-hidden border border-gray-200 bg-white">
              {recentAttempts.map((attempt, i) => {
                const completedAt = attempt.completedAt;
                let dateStr = '';
                if (completedAt && typeof (completedAt as unknown as { toDate?: () => Date }).toDate === 'function') {
                  dateStr = (completedAt as unknown as { toDate: () => Date }).toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                }
                return (
                  <div key={attempt.id || i} className="flex items-center justify-between px-6 py-4 border-b border-gray-200 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">{attempt.chapters?.join(', ') || attempt.subject}</p>
                      <p className="text-xs text-gray-600">{attempt.subject} • {attempt.totalQuestions} Qs • {dateStr}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${attempt.score >= 70 ? 'text-emerald-600' : attempt.score >= 50 ? 'text-orange-500' : 'text-red-600'}`}>{attempt.score}%</p>
                      <p className="text-xs text-gray-600">{attempt.correctAnswers}/{attempt.totalQuestions}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
