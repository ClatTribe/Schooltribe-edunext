import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/authService';

const studentNav = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'Sudden Death', path: '/sudden-death', icon: '💀' },
  { label: 'Tests', path: '/tests', icon: '📝' },
  { label: 'Notes', path: '/notes', icon: '📖' },
  { label: 'Videos', path: '/videos', icon: '🎥' },
  { label: 'Meri Report', path: '/meri-report', icon: '📈' },
  { label: 'Aaj Ka Plan', path: '/aaj-ka-plan', icon: '📋' },
  { label: 'Leaderboard', path: '/leaderboard', icon: '🏆' },
  { label: 'Ask AI', path: '/chat', icon: '💬' },
  { label: 'Profile', path: '/profile', icon: '👤' },
];

const teacherNav = [
  { label: 'Dashboard', path: '/teacher', icon: '📊' },
  { label: 'Create Test', path: '/teacher/create-test', icon: '📝' },
  { label: 'Analytics', path: '/teacher/analytics', icon: '🔥' },
  { label: 'Student Reports', path: '/teacher/reports', icon: '📈' },
  { label: 'Announcements', path: '/teacher/announcements', icon: '📢' },
  { label: 'Leaderboard', path: '/leaderboard', icon: '🏆' },
  { label: 'Ask AI', path: '/chat', icon: '💬' },
  { label: 'Profile', path: '/profile', icon: '👤' },
];

const parentNav = [
  { label: 'Dashboard', path: '/parent', icon: '📊' },
  { label: 'Profile', path: '/profile', icon: '👤' },
];

const adminNav = [
  { label: 'Dashboard', path: '/admin', icon: '🏫' },
  { label: 'Manage Users', path: '/admin/users', icon: '👥' },
  { label: 'Assignments', path: '/admin/assign', icon: '🔗' },
  { label: 'Profile', path: '/profile', icon: '👤' },
];

// Priority items shown in bottom nav on mobile (max 5)
const MOBILE_BOTTOM_NAV: Record<string, string[]> = {
  student: ['/dashboard', '/sudden-death', '/tests', '/notes', '/chat'],
  teacher: ['/teacher', '/teacher/create-test', '/teacher/reports', '/chat', '/profile'],
  parent: ['/parent', '/profile'],
  admin: ['/admin', '/admin/users', '/admin/assign', '/profile'],
};

export default function Layout() {
  const { profile } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const role = profile?.role || 'student';
  const navItems = role === 'admin' ? adminNav : role === 'parent' ? parentNav : role === 'teacher' ? teacherNav : studentNav;
  const logoLink = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/dashboard';

  // Bottom nav: show only priority items for this role
  const bottomNavPaths = MOBILE_BOTTOM_NAV[role] || MOBILE_BOTTOM_NAV.student;
  const bottomNavItems = navItems.filter((item) => bottomNavPaths.includes(item.path));

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
      setSigningOut(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Skip to content — Accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>

      {/* Top header — mobile */}
      <header className="sticky top-0 z-40 border-b border-surface-700/60 bg-surface-800/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Link to={logoLink} className="text-gradient text-xl font-black tracking-tight">
            Vidyaa
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-400 hover:bg-surface-700/60 hover:text-white"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar — desktop */}
        <nav
          className="hidden w-64 flex-shrink-0 border-r border-surface-700/60 bg-surface-800/50 p-5 backdrop-blur-xl lg:flex lg:flex-col"
          aria-label="Main navigation"
        >
          <Link to={logoLink} className="text-gradient mb-10 block text-2xl font-black tracking-tight">
            Vidyaa
          </Link>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    location.pathname.startsWith(item.path)
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'text-slate-400 hover:bg-surface-700/60 hover:text-white border border-transparent'
                  }`}
                  aria-current={location.pathname.startsWith(item.path) ? 'page' : undefined}
                >
                  <span aria-hidden="true" className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-semibold text-slate-500 transition-all hover:border-error-500/20 hover:bg-error-500/10 hover:text-error-400 disabled:opacity-50"
            >
              <span aria-hidden="true">{signingOut ? '⏳' : '🚪'}</span>
              {signingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </nav>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <nav
              className="fixed left-0 top-0 h-full w-64 border-r border-surface-700/60 bg-surface-800 p-5 shadow-2xl"
              aria-label="Mobile navigation"
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="text-gradient text-xl font-black">Vidyaa</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-surface-700 hover:text-white"
                  aria-label="Close menu"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                        location.pathname.startsWith(item.path)
                          ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                          : 'text-slate-400 hover:bg-surface-700/60 hover:text-white border border-transparent'
                      }`}
                    >
                      <span aria-hidden="true" className="text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}

        {/* Main content */}
        <main
          id="main-content"
          className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8"
        >
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-700/60 bg-surface-800/90 backdrop-blur-xl lg:hidden"
        aria-label="Bottom navigation"
      >
        <ul className="flex items-center justify-around py-2">
          {bottomNavItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-semibold transition-colors ${
                  location.pathname.startsWith(item.path)
                    ? 'text-primary-500'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                aria-current={location.pathname.startsWith(item.path) ? 'page' : undefined}
              >
                <span className="text-lg" aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
