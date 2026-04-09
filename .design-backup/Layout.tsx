import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/authService';
import { SCHOOL_PARTNER_SHORT, SCHOOL_LOGO_URL } from '@/constants';
import { getDocument } from '@/services/firestoreService';
import type { GamificationProfile } from '@/types';

const studentNav = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { label: 'Sudden Death', path: '/sudden-death', icon: 'skull' },
  { label: 'Tests', path: '/tests', icon: 'tests' },
  { label: 'Notes', path: '/notes', icon: 'notes' },
  { label: 'Videos', path: '/videos', icon: 'videos' },
  { label: 'Meri Report', path: '/meri-report', icon: 'report' },
  { label: 'Aaj Ka Plan', path: '/aaj-ka-plan', icon: 'plan' },
  { label: 'Leaderboard', path: '/leaderboard', icon: 'trophy' },
  { label: 'AI Tutor', path: '/chat', icon: 'ai' },
  { label: 'Profile', path: '/profile', icon: 'profile' },
];

const teacherNav = [
  { label: 'Dashboard', path: '/teacher', icon: 'dashboard' },
  { label: 'Create Test', path: '/teacher/create-test', icon: 'tests' },
  { label: 'Analytics', path: '/teacher/analytics', icon: 'report' },
  { label: 'Student Reports', path: '/teacher/reports', icon: 'report' },
  { label: 'Announcements', path: '/teacher/announcements', icon: 'notes' },
  { label: 'Leaderboard', path: '/leaderboard', icon: 'trophy' },
  { label: 'AI Tutor', path: '/chat', icon: 'ai' },
  { label: 'Profile', path: '/profile', icon: 'profile' },
];

const parentNav = [
  { label: 'Dashboard', path: '/parent', icon: 'dashboard' },
  { label: 'Profile', path: '/profile', icon: 'profile' },
];

const adminNav = [
  { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
  { label: 'Manage Users', path: '/admin/users', icon: 'profile' },
  { label: 'Assignments', path: '/admin/assign', icon: 'plan' },
  { label: 'Profile', path: '/profile', icon: 'profile' },
];

const MOBILE_BOTTOM_NAV: Record<string, string[]> = {
  student: ['/dashboard', '/sudden-death', '/tests', '/notes', '/chat'],
  teacher: ['/teacher', '/teacher/create-test', '/teacher/reports', '/chat', '/profile'],
  parent: ['/parent', '/profile'],
  admin: ['/admin', '/admin/users', '/admin/assign', '/profile'],
};

/* ── SVG Nav Icons ── */
function NavIcon({ type, className = 'h-5 w-5' }: { type: string; className?: string }) {
  const props = { className, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.8 };
  switch (type) {
    case 'dashboard': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>;
    case 'skull': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12c0 3.5 1.8 6.5 4.5 8.2V22h3v-1h5v1h3v-1.8C19.2 18.5 22 15.5 22 12c0-5.52-4.48-10-10-10zm-3 13a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>;
    case 'tests': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
    case 'notes': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h10" /></svg>;
    case 'videos': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'report': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
    case 'plan': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    case 'trophy': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14M5 3v4a7 7 0 007 7m-7-7H2m17 0h3m-3 0v4a7 7 0 01-7 7m0 0v3m0-3a2 2 0 002 2h-4a2 2 0 002-2" /></svg>;
    case 'ai': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5m-4.25-5.682a24.3 24.3 0 00.75-.082M12 21a7 7 0 01-7-7m7 7a7 7 0 007-7m-7 7v-3m-3.5-4.5L12 17.5l3.5-3.5" /></svg>;
    case 'profile': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
    default: return <svg {...props}><circle cx="12" cy="12" r="3" /></svg>;
  }
}

export default function Layout() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [gamStats, setGamStats] = useState<{ xp: number; streak: number }>({ xp: 0, streak: 0 });

  const role = profile?.role || 'student';
  const navItems = role === 'admin' ? adminNav : role === 'parent' ? parentNav : role === 'teacher' ? teacherNav : studentNav;
  const logoLink = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/dashboard';
  const bottomNavPaths = MOBILE_BOTTOM_NAV[role] || MOBILE_BOTTOM_NAV.student;
  const bottomNavItems = navItems.filter((item) => bottomNavPaths.includes(item.path));

  useEffect(() => {
    if (!user) return;
    getDocument<GamificationProfile>('gamification', user.uid).then((doc) => {
      if (doc) setGamStats({ xp: doc.xp ?? 0, streak: doc.streak ?? 0 });
    }).catch(() => {});
  }, [user]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try { await signOut(); } catch { setSigningOut(false); }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-to-content">Skip to content</a>

      {/* ═══ Top header — mobile ═══ */}
      <header className="sticky top-0 z-40 border-b border-surface-700/60 bg-surface-800/90 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Link to={logoLink} className="flex items-center gap-2.5">
            <img src={SCHOOL_LOGO_URL} alt="" className="h-8 w-8 rounded-lg object-contain bg-amber-500/10 p-0.5" />
            <div className="leading-tight">
              <span className="text-gradient text-base font-black tracking-tight block">Vidyaa AI</span>
              <span className="text-[8px] text-slate-500 uppercase tracking-wider">{SCHOOL_PARTNER_SHORT}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {/* Streak badge */}
            {gamStats.streak > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1">
                <span className="text-xs">⚡</span>
                <span className="text-[10px] font-bold text-amber-400">{gamStats.streak} Day Streak</span>
              </div>
            )}
            {/* XP badge */}
            <div className="flex items-center gap-1 rounded-full bg-surface-700/80 border border-surface-600 px-2.5 py-1">
              <span className="text-xs">🏆</span>
              <span className="text-[10px] font-bold text-slate-300">XP: {gamStats.xp.toLocaleString()}</span>
            </div>
            {/* Menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-700/60 hover:text-white"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ═══ Sidebar — desktop ═══ */}
        <nav
          className="hidden w-[260px] flex-shrink-0 border-r border-surface-700/40 bg-[#0d1526] p-5 lg:flex lg:flex-col"
          aria-label="Main navigation"
        >
          {/* Brand block */}
          <Link to={logoLink} className="mb-8 block">
            <div className="flex items-center gap-3">
              <img src={SCHOOL_LOGO_URL} alt={SCHOOL_PARTNER_SHORT} className="h-10 w-10 rounded-xl object-contain bg-amber-500/10 p-0.5 ring-1 ring-amber-500/20" />
              <div>
                <span className="text-gradient text-xl font-black tracking-tight block leading-tight">Vidyaa AI</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest leading-tight">
                  {profile?.board || 'CBSE'} {profile?.class || 10} • {SCHOOL_PARTNER_SHORT}
                </span>
              </div>
            </div>
          </Link>

          {/* Search */}
          <div className="mb-6 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search topics, tests..."
              className="w-full rounded-xl bg-surface-800/80 border border-surface-700/60 pl-9 pr-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
            />
          </div>

          {/* Nav links */}
          <ul className="space-y-0.5 flex-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== logoLink && location.pathname.startsWith(item.path));
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/5'
                        : 'text-slate-400 hover:bg-surface-700/40 hover:text-slate-200'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <NavIcon type={item.icon} className={`h-[18px] w-[18px] ${isActive ? 'text-amber-400' : ''}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Bottom actions */}
          <div className="mt-auto space-y-3 pt-4 border-t border-surface-700/40">
            <Link
              to="/sudden-death"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-surface-900 shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:brightness-110"
            >
              <span>⚡</span> Start Daily Goal
            </Link>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition-all hover:bg-error-500/10 hover:text-error-400 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              {signingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </nav>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
            <nav className="fixed left-0 top-0 h-full w-64 border-r border-surface-700/60 bg-[#0d1526] p-5 shadow-2xl" aria-label="Mobile navigation">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={SCHOOL_LOGO_URL} alt={SCHOOL_PARTNER_SHORT} className="h-8 w-8 rounded-lg object-contain bg-amber-500/10 p-0.5" />
                  <span className="text-gradient text-lg font-black">Vidyaa AI</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-surface-700 hover:text-white" aria-label="Close menu">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <ul className="space-y-0.5">
                {navItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all ${
                          isActive ? 'bg-amber-500/15 text-amber-400' : 'text-slate-400 hover:bg-surface-700/40 hover:text-white'
                        }`}
                      >
                        <NavIcon type={item.icon} className={`h-[18px] w-[18px] ${isActive ? 'text-amber-400' : ''}`} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        )}

        {/* ═══ Top bar — desktop (streak + XP + avatar) ═══ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="hidden lg:flex items-center justify-between border-b border-surface-700/40 bg-surface-800/50 px-8 py-3 backdrop-blur-sm">
            {/* Search bar */}
            <div className="relative w-80">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search topics, tests..."
                className="w-full rounded-xl bg-surface-800/80 border border-surface-700/60 pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Streak badge */}
              {gamStats.streak > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5">
                  <span className="text-sm">⚡</span>
                  <span className="text-xs font-bold text-amber-400">{gamStats.streak} Day Streak</span>
                </div>
              )}
              {/* XP badge */}
              <div className="flex items-center gap-1.5 rounded-full bg-surface-700/60 border border-surface-600/60 px-3.5 py-1.5">
                <span className="text-sm">🏆</span>
                <span className="text-xs font-bold text-slate-300">XP: {gamStats.xp.toLocaleString()}</span>
              </div>
              {/* Notification bell */}
              <button className="relative rounded-full p-2 text-slate-400 hover:bg-surface-700/60 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              {/* Avatar */}
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-amber-500/30" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-bold text-white">
                  {(profile?.displayName || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
          </header>

          {/* Main content */}
          <main id="main-content" className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ═══ Bottom nav — mobile ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-700/60 bg-surface-800/95 backdrop-blur-xl lg:hidden" aria-label="Bottom navigation">
        <ul className="flex items-center justify-around py-1.5">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors ${
                    isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <NavIcon type={item.icon} className={`h-5 w-5 ${isActive ? 'text-amber-400' : ''}`} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
