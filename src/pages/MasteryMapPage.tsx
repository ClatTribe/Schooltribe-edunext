import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDocument } from '@/services/firestoreService';
import { getChapters } from '@/constants';
import type { BoardType, ClassLevel, SubjectType } from '@/constants';
import type { GamificationProfile } from '@/types';

/* ── Mastery level helpers ── */
type MasteryLevel = 'mastered' | 'learning' | 'weak' | 'critical' | 'not_started';

function getMasteryLevel(accuracy: number, attempted: boolean): MasteryLevel {
  if (!attempted) return 'not_started';
  if (accuracy >= 80) return 'mastered';
  if (accuracy >= 60) return 'learning';
  if (accuracy >= 30) return 'weak';
  return 'critical';
}

const MASTERY_CONFIG: Record<MasteryLevel, { label: string; color: string; bar: string; dot: string }> = {
  mastered:    { label: 'Mastered (80%+)',   color: 'text-emerald-600', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  learning:    { label: 'Learning (60-80%)', color: 'text-amber-600',   bar: 'bg-amber-400',   dot: 'bg-amber-400'   },
  weak:        { label: 'Weak (30-60%)',     color: 'text-orange-600',  bar: 'bg-orange-500',  dot: 'bg-orange-500'  },
  critical:    { label: 'Critical (<30%)',   color: 'text-red-600',     bar: 'bg-red-500',     dot: 'bg-red-500'     },
  not_started: { label: 'Not Started',       color: 'text-gray-400',    bar: 'bg-gray-200',    dot: 'bg-gray-300'    },
};

const SUBJECT_COLORS: Record<string, string> = {
  science:   'bg-blue-100 text-blue-700',
  maths:     'bg-purple-100 text-purple-700',
  physics:   'bg-indigo-100 text-indigo-700',
  chemistry: 'bg-green-100 text-green-700',
  biology:   'bg-rose-100 text-rose-700',
  ai:        'bg-orange-100 text-orange-700',
};

interface SubjectMastery {
  subject: SubjectType;
  label: string;
  totalChapters: number;
  attemptedChapters: number;
  overallAccuracy: number;
  level: MasteryLevel;
}

export default function MasteryMapPage() {
  const { user, profile } = useAuth();
  const [gamification, setGamification] = useState<GamificationProfile | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const board = (profile?.board || 'CBSE') as BoardType;
  const classLevel = (profile?.class || 10) as ClassLevel;

  // Subjects for this board/class
  const subjectMap: Record<string, string> = {
    science: 'Science', maths: 'Mathematics', physics: 'Physics',
    chemistry: 'Chemistry', biology: 'Biology', ai: 'AI & Computing',
  };
  const boardSubjects = board === 'ICSE'
    ? ['physics', 'chemistry', 'biology', 'maths', 'ai']
    : ['science', 'maths', 'ai'];

  useEffect(() => {
    if (!user) return;
    getDocument<GamificationProfile>('gamification', user.uid)
      .then((doc) => { if (doc) setGamification(doc); })
      .catch(() => {});
  }, [user]);

  // Build mastery data per subject (using real XP/accuracy as proxy)
  const accuracy = (gamification as { accuracy?: number })?.accuracy ?? 0;
  const testsCompleted = (gamification as { testsCompleted?: number })?.testsCompleted ?? 0;
  const xp = gamification?.xp ?? 0;

  // Generate per-subject mastery — in production each would have own Firestore doc
  const subjectMasteryData: SubjectMastery[] = boardSubjects.map((s, i) => {
    const chapters = getChapters(board, classLevel, s as SubjectType);
    // Distribute overall stats across subjects (mock distribution for now)
    const subjectAccuracy = Math.max(0, accuracy - i * 8 + Math.floor(xp / 100));
    const subjectTests = Math.max(0, testsCompleted - i * 2);
    const attempted = Math.min(chapters.length, subjectTests);
    return {
      subject: s as SubjectType,
      label: subjectMap[s] || s,
      totalChapters: chapters.length,
      attemptedChapters: attempted,
      overallAccuracy: subjectAccuracy,
      level: getMasteryLevel(subjectAccuracy, subjectTests > 0),
    };
  });

  const totalQuestions = testsCompleted * 10; // rough estimate
  const topicsTracked = subjectMasteryData.reduce((sum, s) => sum + s.attemptedChapters, 0);

  return (
    <div className="space-y-8 pb-20 lg:pb-0">

      {/* Header */}
      <header className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-1">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              Topic Mastery Map 🗺️
            </h1>
            <p className="text-sm text-gray-500">Subject → Topic breakdown with color-coded mastery levels</p>
          </div>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { value: totalQuestions, label: 'QUESTIONS DONE' },
          { value: `${accuracy.toFixed(0)}%`, label: 'OVERALL ACCURACY' },
          { value: topicsTracked, label: 'TOPICS TRACKED' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="text-3xl font-black text-gray-900">{stat.value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Mastery legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(MASTERY_CONFIG) as [MasteryLevel, typeof MASTERY_CONFIG[MasteryLevel]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-full ${cfg.dot} flex-shrink-0`} />
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Subject Cards */}
      <div className="space-y-3">
        {subjectMasteryData.map((subject) => {
          const cfg = MASTERY_CONFIG[subject.level];
          const progressPct = subject.totalChapters > 0
            ? Math.round((subject.attemptedChapters / subject.totalChapters) * 100)
            : 0;
          const isExpanded = expandedSubject === subject.subject;

          return (
            <div key={subject.subject} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Subject row */}
              <button
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                onClick={() => setExpandedSubject(isExpanded ? null : subject.subject)}
              >
                {/* Subject icon */}
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black ${SUBJECT_COLORS[subject.subject] || 'bg-gray-100 text-gray-700'}`}>
                  {subject.label[0]}
                </div>

                {/* Subject info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-gray-900">{subject.label}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      subject.level === 'mastered' ? 'bg-emerald-50 text-emerald-600' :
                      subject.level === 'learning' ? 'bg-amber-50 text-amber-600' :
                      subject.level === 'weak' ? 'bg-orange-50 text-orange-600' :
                      subject.level === 'critical' ? 'bg-red-50 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {cfg.label.split(' (')[0]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {subject.attemptedChapters} topics attempted · {subject.overallAccuracy.toFixed(0)}% accuracy · {subject.totalChapters} topics total
                  </p>
                </div>

                {/* Progress bar */}
                <div className="hidden sm:block w-32">
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${cfg.bar}`}
                      style={{ width: `${Math.max(progressPct, 3)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{progressPct}%</p>
                </div>

                {/* Arrow */}
                <svg
                  className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Expanded chapter list */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 animate-fade-in-up">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Chapter breakdown</p>
                  <div className="space-y-2">
                    {getChapters(board, classLevel, subject.subject).map((chapter, idx) => {
                      // Assign declining mastery levels as chapter number increases (mock data)
                      const chapterAccuracy = Math.max(0, subject.overallAccuracy - idx * 5);
                      const chapterAttempted = idx < subject.attemptedChapters;
                      const chLevel = getMasteryLevel(chapterAccuracy, chapterAttempted);
                      const chCfg = MASTERY_CONFIG[chLevel];
                      return (
                        <div key={chapter.number} className="flex items-center gap-3">
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${chCfg.dot}`} />
                          <span className="text-xs text-gray-500 w-6 flex-shrink-0">{chapter.number}.</span>
                          <span className="text-xs text-gray-700 flex-1">{chapter.name}</span>
                          <span className={`text-[10px] font-bold ${chCfg.color}`}>
                            {chapterAttempted ? `${chapterAccuracy.toFixed(0)}%` : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <Link
                    to="/tests"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
                  >
                    Practice this subject →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pro tip */}
      <div className="bg-orange-50 rounded-2xl border border-orange-100 p-5">
        <div className="flex gap-3">
          <span className="text-2xl flex-shrink-0">💡</span>
          <div>
            <p className="text-sm font-bold text-gray-800 mb-1">How to improve your Mastery Map</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Take chapter tests regularly — each attempt updates your accuracy score. Aim for 80%+ on each chapter to turn it green. Red chapters need immediate attention before board exams!
            </p>
            <Link to="/tests" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-orange-500 hover:text-orange-600">
              Start practicing now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
