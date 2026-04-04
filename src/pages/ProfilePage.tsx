import { useState, useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/authService';
import { getDocument } from '@/services/firestoreService';
import { useNavigate } from 'react-router-dom';

interface GamificationStats {
  testsCompleted?: number;
  videosWatched?: number;
  xp?: number;
  level?: number;
  streak?: number;
}

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [stats, setStats] = useState<GamificationStats>({});
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!user || isAdmin) return;
    getDocument<GamificationStats>('gamification', user.uid)
      .then((data) => { if (data) setStats(data); })
      .catch(console.error);
  }, [user, isAdmin]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login');
    } catch {
      setSigningOut(false);
    }
  }

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  const initials = (profile?.displayName || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen space-y-8 pb-20 lg:pb-0">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-white px-6 py-12 sm:px-8 border border-orange-200">
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-orange-500/5 blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl"></div>

        <div className="relative space-y-6">
          <h1 className="text-orange-500 text-4xl font-bold sm:text-5xl">
            My Profile
          </h1>
          <p className="text-gray-600 text-lg">
            {isAdmin ? 'Manage your account and platform settings' : 'Manage your account, settings, and academic details'}
          </p>
        </div>
      </div>

      {/* Avatar + Name Card */}
      <div className="glass-card rounded-2xl p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={profile?.displayName || 'Profile'}
              className="h-24 w-24 rounded-full object-cover ring-2 ring-orange-500/50 ring-offset-2 ring-offset-white"
            />
          ) : (
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-3xl font-bold text-white shadow-lg shadow-orange-500/20">
              {initials}
            </div>
          )}

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-gray-900 text-3xl font-bold">
              {profile?.displayName || (isAdmin ? 'Admin' : 'Student')}
            </h2>
            <p className="mt-1 text-gray-500">{user?.email || 'No email'}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600 border border-orange-200">
                {profile?.role || 'student'}
              </span>
              {!isAdmin && (
                <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600 border border-orange-200">
                  Class {profile?.class || 10} • {profile?.board || 'CBSE'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid — students/teachers only */}
      {!isAdmin && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-5xl font-bold text-orange-500">{stats.testsCompleted ?? 0}</p>
            <p className="mt-2 text-gray-500 text-sm">Tests Taken</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-5xl font-bold text-orange-500">{stats.videosWatched ?? 0}</p>
            <p className="mt-2 text-gray-500 text-sm">Videos Watched</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-5xl font-bold text-orange-500">{stats.xp ?? 0}</p>
            <p className="mt-2 text-gray-500 text-sm">Total XP</p>
          </div>
        </div>
      )}

      {/* Admin Info — admin only */}
      {isAdmin && (
        <div className="glass-card rounded-2xl p-8">
          <h3 className="text-gray-900 text-xl font-bold mb-6">
            Admin Overview
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-gray-500 text-sm font-medium">Role</p>
              <p className="text-orange-500 text-lg font-semibold capitalize">Administrator</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-500 text-sm font-medium">Access Level</p>
              <p className="text-gray-900 text-lg font-semibold">Full Access</p>
            </div>
          </div>
        </div>
      )}

      {/* Academic Details — students/teachers only */}
      {!isAdmin && (
        <div className="glass-card rounded-2xl p-8">
          <h3 className="text-gray-900 text-xl font-bold mb-6">
            Academic Details
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-gray-500 text-sm font-medium">Board</p>
              <p className="text-gray-900 text-lg font-semibold">
                {profile?.board || 'CBSE'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-500 text-sm font-medium">Class</p>
              <p className="text-gray-900 text-lg font-semibold">
                {profile?.class || 10}
              </p>
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-2">
              <p className="text-gray-500 text-sm font-medium">Subjects</p>
              <div className="flex flex-wrap gap-2">
                {(profile?.subjects || ['science', 'maths', 'ai']).map((s) => {
                  const icons: Record<string, string> = {
                    science: '🔬', maths: '📐', physics: '⚛️',
                    chemistry: '🧪', biology: '🧬', ai: '🤖',
                  };
                  const labels: Record<string, string> = {
                    science: 'Science', maths: 'Maths', physics: 'Physics',
                    chemistry: 'Chemistry', biology: 'Biology', ai: 'AI & Computing',
                  };
                  return (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-gray-700 border border-gray-200 font-medium"
                    >
                      {icons[s] || '📚'} {labels[s] || s}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences */}
      <div className="glass-card rounded-2xl p-8">
        <h3 className="text-gray-900 text-xl font-bold mb-6">
          Preferences
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-900 font-medium">Dark Mode</p>
            <p className="mt-1 text-gray-500 text-sm">Premium dark theme enabled</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative h-8 w-14 rounded-full transition-all duration-300 ${
              darkMode
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30'
                : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={darkMode}
            aria-label="Toggle dark mode"
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all duration-300 ${
                darkMode ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Account Details */}
      <div className="glass-card rounded-2xl p-8">
        <h3 className="text-gray-900 text-xl font-bold mb-6">
          Account Information
        </h3>
        <div className="space-y-6">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">User ID</p>
            <p className="font-mono text-gray-500 text-sm break-all">
              {user?.uid || '—'}
            </p>
          </div>
          <div className="border-t border-gray-200 pt-6">
            <p className="text-gray-500 text-sm font-medium mb-1">Sign-In Method</p>
            <p className="text-gray-700 text-sm">
              {user?.providerData?.[0]?.providerId === 'google.com'
                ? '🔑 Google Account'
                : '📱 Phone OTP'}
            </p>
          </div>
          <div className="border-t border-gray-200 pt-6">
            <p className="text-gray-500 text-sm font-medium mb-1">Member Since</p>
            <p className="text-gray-700 text-sm">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="pt-4">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="glass-card w-full rounded-xl px-6 py-4 text-gray-900 font-semibold text-lg transition-all duration-300 border border-red-300 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
