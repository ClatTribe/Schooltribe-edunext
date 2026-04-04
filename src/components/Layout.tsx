import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/authService';
import { APP_NAME, BRAND_LINKS } from '@/constants';
import { getDocument } from '@/services/firestoreService';
import type { GamificationProfile } from '@/types';

/* ── Navigation sections (PrepTribe-style grouped nav) ── */
interface NavItem { label: string; path: string; icon: string; }
interface NavSection { heading?: string; items: NavItem[]; }

const studentSections: NavSection[] = [
  {
    items: [
      { label: 'Home', path: '/dashboard', icon: 'dashboard' },
      { label: 'Mocks & Tests', path: '/tests', icon: 'tests' },
      { label: 'LearnFlix', path: '/videos', icon: 'videos' },
      { label: 'Notes & Study', path: '/notes', icon: 'notes' },
    ],
  },
  {
    heading: 'PRACTICE',
    items: [
      { label: 'Flashcards', path: '/notes', icon: 'notes' },
      { label: 'Sudden Death', path: '/sudden-death', icon: 'skull' },
      { label: 'Duels', path: '/duels', icon: 'duels' },
    ],
  },
  {
    heading: 'AI COACH',
    items: [
      { label: 'Mastery Map', path: '/mastery-map', icon: 'map' },
      { label: 'Meri Report', path: '/meri-report', icon: 'report' },
      { label: 'Aaj Ka Plan', path: '/aaj-ka-plan', icon: 'plan' },
      { label: 'Doubt Samjhao', path: '/chat', icon: 'ai' },
    ],
  },
];

const teacherSections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', path: '/teacher', icon: 'dashboard' },
      { label: 'Create Test', path: '/teacher/create-test', icon: 'tests' },
    ],
  },
  {
    heading: 'REPORTS',
    items: [
      { label: 'Analytics', path: '/teacher/analytics', icon: 'report' },
      { label: 'Student Reports', path: '/teacher/reports', icon: 'report' },
      { label: 'Announcements', path: '/teacher/announcements', icon: 'notes' },
    ],
  },
  {
    heading: 'TOOLS',
    items: [
      { label: 'Leaderboard', path: '/leaderboard', icon: 'trophy' },
      { label: 'AI Tutor', path: '/chat', icon: 'ai' },
    ],
  },
];

const parentSections: NavSection[] = [
  { items: [{ label: 'Dashboard', path: '/parent', icon: 'dashboard' }] },
];

const adminSections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
      { label: 'Manage Users', path: '/admin/users', icon: 'profile' },
      { label: 'Assignments', path: '/admin/assign', icon: 'plan' },
    ],
  },
];

const MOBILE_BOTTOM_NAV: Record<string, string[]> = {
  student: ['/dashboard', '/tests', '/duels', '/mastery-map', '/chat'],
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
    case 'duels': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>;
    case 'map': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;
    default: return <svg {...props}><circle cx="12" cy="12" r="3" /></svg>;
  }
}

/* Flatten sections to items for mobile */
function flattenSections(sections: typeof studentSections) {
  return sections.flatMap((s) => s.items);
}

export default function Layout() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [gamStats, setGamStats] = useState<{ xp: number; streak: number }>({ xp: 0, streak: 0 });

  const role = profile?.role || 'student';
  const sections = role === 'admin' ? adminSections : role === 'parent' ? parentSections : role === 'teacher' ? teacherSections : studentSections;
  const allNavItems = flattenSections(sections);
  const logoLink = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/dashboard';
  const bottomNavPaths = MOBILE_BOTTOM_NAV[role] || MOBILE_BOTTOM_NAV.student;
  const bottomNavItems = allNavItems.filter((item) => bottomNavPaths.includes(item.path));

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

  const displayName = profile?.displayName || 'Student';

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <a href="#main-content" className="skip-to-content">Skip to content</a>

      {/* ═══ Top Brand Bar (PrepTribe-style) ═══ */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          {/* Left: Logo + Brand Switcher */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link to={logoLink} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-sm shadow-md shadow-orange-500/20">
                ST
              </div>
              <div className="hidden sm:block leading-tight">
                <span className="text-base font-black text-gray-900 tracking-tight block">{APP_NAME}</span>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider">A unit of EduNext</span>
              </div>
            </Link>

            {/* Brand Switcher Tabs — desktop */}
            <nav className="hidden lg:flex items-center gap-1 bg-gray-100 rounded-xl p-1" aria-label="Brand navigation">
              <a href={BRAND_LINKS.edunext} target="_blank" rel="noopener noreferrer" className="px-4 py-1.5 text-xs font-semibold text-gray-500 rounded-lg hover:bg-white hover:text-gray-700 hover:shadow-sm transition-all">
                EduNext
              </a>
              <a href={BRAND_LINKS.preptribe} target="_blank" rel="noopener noreferrer" className="px-4 py-1.5 text-xs font-semibold text-gray-500 rounded-lg hover:bg-white hover:text-gray-700 hover:shadow-sm transition-all">
                PrepTribe
              </a>
              <span className="px-4 py-1.5 text-xs font-bold text-orange-600 bg-white rounded-lg shadow-sm">
                SchoolTribe
              </span>
            </nav>
          </div>

          {/* Right: dark mode toggle, notification, avatar */}
          <div className="flex items-center gap-2">
            {/* Streak badge */}
            {gamStats.streak > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1.5">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-bold text-orange-600">{gamStats.streak}</span>
              </div>
            )}
            {/* Notification bell */}
            <button className="relative rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" />
            </button>
            {/* Avatar + Name */}
            <Link to="/profile" className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-orange-200" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-bold text-white">
                  {displayName[0].toUpperCase()}
                </div>
              )}
              <div className="hidden lg:block leading-tight">
                <span className="text-sm font-bold text-gray-800 block">{displayName}</span>
                <span className="text-[10px] text-gray-400 capitalize">{profile?.board || 'CBSE'}</span>
              </div>
            </Link>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        {/* ═══ Left Sidebar — desktop (PrepTribe-style) ═══ */}
        <nav
          className="hidden w-[240px] flex-shrink-0 border-r border-gray-200 bg-white p-4 lg:flex lg:flex-col"
          aria-label="Main navigation"
        >
          {/* Grouped nav sections */}
          <div className="flex-1 space-y-6">
            {sections.map((section, si) => (
              <div key={si}>
                {section.heading && (
                  <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{section.heading}</p>
                )}
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== logoLink && location.pathname.startsWith(item.path));
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                            isActive
                              ? 'bg-orange-50 text-orange-600 shadow-sm'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <NavIcon type={item.icon} className={`h-[18px] w-[18px] ${isActive ? 'text-orange-500' : ''}`} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom: Profile + Sign Out */}
          <div className="mt-auto space-y-2 pt-4 border-t border-gray-100">
            <Link
              to="/profile"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all ${
                location.pathname === '/profile' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <NavIcon type="profile" className="h-[18px] w-[18px]" />
              Profile
            </Link>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              {signingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </nav>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
            <nav className="fixed left-0 top-0 h-full w-72 bg-white p-5 shadow-2xl overflow-y-auto" aria-label="Mobile navigation">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-xs">ST</div>
                  <span className="text-lg font-black text-gray-900">{APP_NAME}</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close menu">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Brand switcher — mobile */}
              <div className="mb-6 flex gap-1 bg-gray-100 rounded-xl p-1">
                <a href={BRAND_LINKS.edunext} className="flex-1 text-center px-2 py-1.5 text-[10px] font-semibold text-gray-500 rounded-lg">EduNext</a>
                <a href={BRAND_LINKS.preptribe} className="flex-1 text-center px-2 py-1.5 text-[10px] font-semibold text-gray-500 rounded-lg">PrepTribe</a>
                <span className="flex-1 text-center px-2 py-1.5 text-[10px] font-bold text-orange-600 bg-white rounded-lg shadow-sm">SchoolTribe</span>
              </div>

              <div className="space-y-5">
                {sections.map((section, si) => (
                  <div key={si}>
                    {section.heading && (
                      <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{section.heading}</p>
                    )}
                    <ul className="space-y-0.5">
                      {section.items.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                          <li key={item.path}>
                            <Link
                              to={item.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all ${
                                isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                              }`}
                            >
                              <NavIcon type={item.icon} className={`h-[18px] w-[18px] ${isActive ? 'text-orange-500' : ''}`} />
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>
          </div>
        )}

        {/* ═══ Main Content ═══ */}
        <main id="main-content" className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>

      {/* ═══ Bottom nav — mobile ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-xl lg:hidden shadow-[0_-1px_3px_rgba(0,0,0,0.05)]" aria-label="Bottom navigation">
        <ul className="flex items-center justify-around py-1.5">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors ${
                    isActive ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <NavIcon type={item.icon} className={`h-5 w-5 ${isActive ? 'text-orange-500' : ''}`} />
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
