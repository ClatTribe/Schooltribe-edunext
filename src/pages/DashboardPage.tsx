import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDocument, setDocument } from '@/services/firestoreService';
import type { GamificationProfile } from '@/types';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [gamification, setGamification] = useState<GamificationProfile | null>(null);

  useEffect(() => {
    if (profile?.role === 'teacher') navigate('/teacher', { replace: true });
    if (profile?.role === 'parent') navigate('/parent', { replace: true });
  }, [profile, navigate]);

  useEffect(() => {
    if (!user) return;
    getDocument<GamificationProfile>('gamification', user.uid).then(async (doc) => {
      if (doc) {
        setGamification(doc);
      } else {
        const initial = {
          userId: user.uid, xp: 0, level: 1, streak: 0, lastActiveDate: '',
          shieldActive: false, badges: [], testsCompleted: 0, accuracy: 0,
          totalQuestions: 0, totalCorrect: 0, videosWatched: 0,
        };
        await setDocument('gamification', user.uid, initial);
        setGamification(initial as unknown as GamificationProfile);
      }
    });
  }, [user]);

  const xp = gamification?.xp ?? 0;
  const level = gamification?.level ?? 1;
  const streak = gamification?.streak ?? 0;
  const accuracy = (gamification as { accuracy?: number })?.accuracy ?? 0;
  const xpInLevel = xp % 100;
  const xpToNext = 100 - xpInLevel;
  const predictedBoardPercentage = Math.min(95, 40 + Math.floor(xp / 50));

  const firstName = profile?.displayName?.split(' ')[0] || 'Scholar';
  const board = profile?.board || 'CBSE';

  // Days left calc
  const today = new Date();
  const currentYear = today.getFullYear();
  let boardExamDate = new Date(currentYear, board === 'ICSE' ? 1 : 2, 1);
  if (boardExamDate < today) boardExamDate.setFullYear(currentYear + 1);
  const daysLeft = Math.max(0, Math.ceil((boardExamDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Date display
  const dateStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      {/* ═══ Hero Greeting (PrepTribe style) ═══ */}
      <header className="animate-fade-in-up flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
            Sup, <span className="text-gradient">{firstName}!</span> <span className="text-2xl">✨</span>
          </h1>
          <p className="text-gray-500 text-sm">
            Only <span className="font-bold text-orange-500">{daysLeft} days</span> left. Let&apos;s get this bread. 🍞
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="font-semibold text-gray-600">{dateStr}</span>
        </div>
      </header>

      {/* ═══ Stats Row (PrepTribe style — 4 stat cards) ═══ */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Current Streak */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl">🔥</div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Streak</p>
            <p className="text-3xl font-black text-gray-900">{streak}</p>
          </div>
          <p className="text-[11px] text-gray-400">Grace: 2/mo • Freezes: buy with coins</p>
        </div>

        {/* Total XP */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl">🏆</div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total XP</p>
            <p className="text-3xl font-black text-gray-900">{xp.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all" style={{ width: `${Math.max(xpInLevel, 5)}%` }} />
            </div>
            <p className="text-[10px] text-gray-400">{xpToNext} XP to Level {level + 1}</p>
          </div>
        </div>

        {/* Predicted Score */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl">📈</div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Predicted Score</p>
            <p className="text-3xl font-black text-gray-900">{predictedBoardPercentage}%</p>
          </div>
          <p className="text-[11px] text-orange-500 font-semibold flex items-center gap-1">
            <span>↑</span> +{Math.min(accuracy, 4)}% from last week
          </p>
        </div>

        {/* Coins */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl">🪙</div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coins</p>
            <p className="text-3xl font-black text-gray-900">{Math.floor(xp / 10)}</p>
          </div>
          <p className="text-[11px] text-gray-400">Earn coins by completing tests</p>
        </div>
      </div>

      {/* ═══ Share Score Button (PrepTribe style) ═══ */}
      <Link
        to="/leaderboard"
        className="flex items-center justify-center gap-2 w-full sm:w-auto sm:inline-flex rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-4 text-white font-bold text-base shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:brightness-105 transition-all"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        SHARE SCORE
      </Link>

      {/* ═══ Two Column Layout: Daily Challenge + Global Rank ═══ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily Challenge (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm relative overflow-hidden">
            {/* Badge pills */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-600 text-[11px] font-bold px-3 py-1 rounded-full">
                🔥 {board} Daily Sprint
              </span>
              <span className="inline-flex items-center bg-gray-100 text-gray-500 text-[11px] font-semibold px-3 py-1 rounded-full">
                SchoolTribe Exclusive
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Daily Challenge</h2>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    12 Questions
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    30 Minutes
                  </span>
                </div>
                <Link
                  to="/sudden-death"
                  className="inline-flex items-center gap-2 bg-gray-900 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
                >
                  Start Daily Mock <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>

              {/* XP reward badge */}
              <div className="hidden sm:flex flex-col items-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 border-4 border-orange-100">
                  <div className="text-center">
                    <span className="text-2xl font-black text-orange-500 block">+50</span>
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">XP Reward</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Rank (1/3 width) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-black text-gray-900">Global Rank</h3>
            <span className="text-xl">🏆</span>
          </div>
          <div className="space-y-3">
            {[
              { rank: 1, name: 'Top Scorer', xp: 1180, color: 'bg-orange-100 text-orange-700' },
              { rank: 2, name: 'Studious Star', xp: 1050, color: 'bg-gray-100 text-gray-600' },
              { rank: 3, name: firstName, xp, color: 'bg-orange-50 text-orange-600 ring-2 ring-orange-200' },
            ].map((entry) => (
              <div key={entry.rank} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${entry.rank === 3 ? 'bg-orange-50/50 border border-orange-200' : ''}`}>
                <span className="text-sm font-black text-gray-400 w-5">{entry.rank}</span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${entry.color}`}>
                  {entry.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800">{entry.name}</p>
                  <p className="text-[11px] text-orange-500 font-semibold">{entry.xp.toLocaleString()} XP</p>
                </div>
                {entry.rank <= 2 && <span className="text-sm">🔥</span>}
              </div>
            ))}
          </div>
          <Link to="/leaderboard" className="block mt-4 text-center text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors">
            View Full Leaderboard →
          </Link>
        </div>
      </div>

      {/* ═══ Training Hub ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">Training Hub</h2>
          <Link to="/tests" className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1">
            View All <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/sudden-death', icon: '💀', title: 'Sudden Death', desc: 'Lose a life for every wrong answer. Survive!', color: 'bg-red-50 border-red-100' },
            { to: '/tests', icon: '📝', title: 'Chapter Tests', desc: 'Deep dive into topics and master every concept.', color: 'bg-blue-50 border-blue-100' },
            { to: '/notes', icon: '🃏', title: 'Flash Cards', desc: 'Active recall for formulas and definitions.', color: 'bg-purple-50 border-purple-100' },
            { to: '/chat', icon: '🤖', title: 'Ask AI Tutor', desc: 'Instant explanations and doubt solving 24/7.', color: 'bg-emerald-50 border-emerald-100' },
          ].map((card) => (
            <Link key={card.to} to={card.to} className={`group bg-white rounded-2xl border border-gray-200 p-5 transition-all duration-300 hover:border-orange-300 hover:shadow-md hover:-translate-y-1`}>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.color} text-2xl mb-4`}>{card.icon}</div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">{card.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">{card.desc}</p>
              <span className="text-xs font-bold text-orange-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                Start <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ AI Coach Grid ═══ */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-gray-900">AI Coach</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/meri-report', icon: '📊', title: 'Meri Report', desc: `${accuracy > 0 ? `${accuracy.toFixed(0)}% accuracy` : 'Take a test to unlock'}` },
            { to: '/aaj-ka-plan', icon: '📋', title: 'Aaj Ka Plan', desc: `${daysLeft} days to boards — plan ready` },
            { to: '/leaderboard', icon: '📈', title: 'Leaderboard', desc: `Level ${level} • ${xpToNext} XP to next` },
            { to: '/videos', icon: '🎬', title: 'LearnFlix', desc: `Video lessons for every chapter` },
          ].map((card) => (
            <Link key={card.to} to={card.to} className="group bg-white rounded-2xl border border-gray-200 p-4 transition-all duration-300 hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 border border-orange-100 text-base">{card.icon}</span>
                <h3 className="text-sm font-bold text-gray-800">{card.title}</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-2">{card.desc}</p>
              <span className="text-xs font-bold text-orange-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                Open <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
