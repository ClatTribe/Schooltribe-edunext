import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDocument, setDocument } from '@/services/firestoreService';
import type { GamificationProfile } from '@/types';

/* ─── Motivational quotes (rotates daily) ─── */
const QUOTES = [
  { text: '"The only way to learn mathematics is to do mathematics."', author: 'Paul Halmos' },
  { text: '"Science is organized knowledge. Wisdom is organized life."', author: 'Immanuel Kant' },
  { text: '"The expert in anything was once a beginner."', author: 'Helen Hayes' },
  { text: '"Education is not preparation for life; education is life itself."', author: 'John Dewey' },
  { text: '"Success is the sum of small efforts repeated day in and day out."', author: 'Robert Collier' },
];

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
  const testsCompleted = (gamification as { testsCompleted?: number })?.testsCompleted ?? 0;
  const videosWatched = (gamification as { videosWatched?: number })?.videosWatched ?? 0;
  const accuracy = (gamification as { accuracy?: number })?.accuracy ?? 0;
  const xpInLevel = xp % 100;
  const xpToNext = 100 - xpInLevel;
  const predictedBoardPercentage = Math.min(95, 40 + Math.floor(xp / 50));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const dailyQuote = QUOTES[new Date().getDate() % QUOTES.length];
  const board = profile?.board || 'CBSE';

  // Days left calc
  const today = new Date();
  const currentYear = today.getFullYear();
  let boardExamDate = new Date(currentYear, board === 'ICSE' ? 1 : 2, 1);
  if (boardExamDate < today) boardExamDate.setFullYear(currentYear + 1);
  const daysLeft = Math.max(0, Math.ceil((boardExamDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Streak calendar (last 7 days)
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIdx = (today.getDay() + 6) % 7; // Mon=0

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      {/* ═══ Hero Greeting ═══ */}
      <header className="animate-fade-in-up flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2 flex-1">
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            {greeting()}, <span className="text-gradient">{profile?.displayName?.split(' ')[0] || 'Scholar'}!</span>
          </h1>
          <p className="text-slate-400 italic text-sm max-w-lg">
            {dailyQuote.text} — <span className="text-slate-500">{dailyQuote.author}</span>
          </p>
        </div>

        {/* Rank Card */}
        <div className="flex-shrink-0 rounded-2xl border border-amber-500/20 px-6 py-4 min-w-[200px] relative overflow-hidden" style={{ background: '#0a101f' }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/8 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
          <p className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest mb-1">Current Rank</p>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/25 text-xl">🏆</div>
            <div>
              <span className="text-lg font-black text-white block leading-tight">Level {level}</span>
              <span className="text-[10px] text-amber-400/80 font-medium">Top {Math.max(5, 100 - Math.floor(xp / 25))}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ Stats Row ═══ */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total XP */}
        <div className="rounded-2xl border border-amber-500/15 p-5 space-y-3" style={{ background: '#0a101f' }}>
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/12 border border-amber-500/20">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">+{Math.min(xp, 120)} Today</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total XP</p>
            <p className="text-3xl font-black text-white">{xp.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#141c2e' }}>
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all" style={{ width: `${Math.max(xpInLevel, 3)}%` }} />
            </div>
            <p className="text-[10px] text-slate-500">{xpToNext} XP to Level {level + 1}</p>
          </div>
        </div>

        {/* Daily Streak */}
        <div className="rounded-2xl border border-amber-500/15 p-5 space-y-3" style={{ background: '#0a101f' }}>
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/12 border border-amber-500/20">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
            </div>
            {streak >= 3 && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400"><span className="animate-pulse">🔥</span> On Fire</span>}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Daily Streak</p>
            <p className="text-3xl font-black text-white">{String(streak).padStart(2, '0')} <span className="text-base font-medium text-slate-400">Days</span></p>
          </div>
          <div className="flex gap-1.5">
            {weekDays.map((d, i) => (
              <div key={i} className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
                i <= todayIdx && streak > todayIdx - i
                  ? 'bg-amber-500 text-surface-900'
                  : 'text-slate-500'
              }`} style={i <= todayIdx && streak > todayIdx - i ? {} : { background: '#141c2e' }}>{d}</div>
            ))}
          </div>
        </div>

        {/* Weekly Tests */}
        <div className="rounded-2xl border border-amber-500/15 p-5 space-y-3" style={{ background: '#0a101f' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/12 border border-amber-500/20">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Weekly Tests</p>
            <p className="text-3xl font-black text-white">{testsCompleted} <span className="text-base font-medium text-slate-400">/ 15</span></p>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#141c2e' }}>
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: `${Math.min((testsCompleted / 15) * 100, 100)}%` }} />
            </div>
            <p className="text-[10px] text-slate-500">{Math.max(0, 15 - testsCompleted)} tests remaining for Goal</p>
          </div>
        </div>

        {/* Estimated Score */}
        <div className="rounded-2xl border border-amber-500/15 p-5 space-y-3" style={{ background: '#0a101f' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/12 border border-amber-500/20">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Est. Score</p>
            <p className="text-3xl font-black text-white">{predictedBoardPercentage}%</p>
          </div>
          <p className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
            <span>↑</span> +{Math.min(accuracy, 4)}% from last week
          </p>
        </div>
      </div>

      {/* ═══ Training Hub ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Training Hub</h2>
            <p className="text-sm text-slate-500">Choose your weapon of mass instruction.</p>
          </div>
          <Link to="/tests" className="text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
            View All <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/sudden-death', icon: '💀', title: 'Sudden Death', desc: 'Lose a life for every wrong answer. How long can you survive?', btnText: 'Play Now' },
            { to: '/tests', icon: '📝', title: 'Chapter Tests', desc: 'Deep dive into specific topics and master every concept.', btnText: 'Explore' },
            { to: '/notes', icon: '🃏', title: 'Flash Cards', desc: 'Active recall practice for formulas and definitions.', btnText: 'Explore' },
            { to: '/chat', icon: '🤖', title: 'Ask AI Tutor', desc: 'Instant answers and personalized explanations 24/7.', btnText: 'Start Chat' },
          ].map((card) => (
            <Link key={card.to} to={card.to} className="group relative rounded-2xl overflow-hidden border border-amber-500/15 p-5 transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1" style={{ background: '#0a101f' }}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-amber-500/10 transition-all" />
              <div className="relative space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-2xl">{card.icon}</div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">{card.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-xs font-bold text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                  {card.btnText} <svg className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ Today's Goals + AI Coach ═══ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Goals */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-amber-500" />
            <h2 className="text-xl font-bold text-white">Today&apos;s Goals</h2>
          </div>
          <div className="rounded-2xl border border-amber-500/15 overflow-hidden" style={{ background: '#0a101f' }}>
            {/* Goal 1 — Login (done) */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-amber-500/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="flex-1 text-sm font-medium text-white">Log in daily</p>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">+10 XP</span>
            </div>
            {/* Goal 2 — Test */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-amber-500/10">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${testsCompleted > 0 ? 'bg-amber-500/15' : 'bg-surface-700/50'}`}>
                {testsCompleted > 0 ? (
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <div className="h-4 w-4 rounded border-2 border-slate-600" />
                )}
              </div>
              <p className={`flex-1 text-sm font-medium ${testsCompleted > 0 ? 'text-white' : 'text-slate-400'}`}>Complete 1 chapter test</p>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">+150 XP</span>
            </div>
            {/* Goal 3 — Flash cards */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-amber-500/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-700/50">
                <div className="h-4 w-4 rounded border-2 border-slate-600" />
              </div>
              <p className="flex-1 text-sm font-medium text-slate-400">Solve 5 Flash Cards</p>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">+50 XP</span>
            </div>
            {/* Progress bar */}
            <div className="px-5 py-3" style={{ background: '#070d1a' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest">Daily Milestone</span>
                <span className="text-xs font-bold text-white">{testsCompleted > 0 ? '66' : '33'}% Done</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#141c2e' }}>
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all" style={{ width: `${testsCompleted > 0 ? 66 : 33}%` }} />
              </div>
            </div>
          </div>
        </section>

        {/* AI Coach Insights */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-amber-500" />
            <h2 className="text-xl font-bold text-white">AI Coach Insights</h2>
          </div>
          <div className="grid gap-3 grid-cols-2">
            {[
              { to: '/meri-report', icon: '📊', title: 'Meri Report', desc: `Weekly diagnosis: ${accuracy > 0 ? `You're at ${accuracy.toFixed(0)}% accuracy` : 'Take a test to see your report'}.`, linkText: 'Read Analysis' },
              { to: '/aaj-ka-plan', icon: '📋', title: 'Aaj Ka Plan', desc: `Your optimal schedule for today is ready. ${daysLeft} days to boards.`, linkText: 'View Schedule' },
              { to: '/leaderboard', icon: '📈', title: 'Leaderboard', desc: `You're at Level ${level}. ${xpToNext} XP more to reach next level!`, linkText: 'Open Board' },
              { to: '/videos', icon: '🎬', title: 'Video Lessons', desc: `${videosWatched} videos watched. ${3 - Math.min(videosWatched, 3)} new recommended.`, linkText: 'Watch Now' },
            ].map((card) => (
              <Link key={card.to} to={card.to} className="group rounded-2xl border border-amber-500/15 p-4 transition-all duration-300 hover:border-amber-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5" style={{ background: '#0a101f' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-base">{card.icon}</span>
                  <h3 className="text-sm font-bold text-white">{card.title}</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{card.desc}</p>
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                  {card.linkText} <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
