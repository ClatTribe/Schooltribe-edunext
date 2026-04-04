import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, getUserProfile } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { APP_NAME, SCHOOL_PARTNER_SHORT, SCHOOL_LOGO_URL } from '@/constants';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setProfile } = useAuth();

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      const existingProfile = await getUserProfile(user.uid);
      if (existingProfile) {
        setProfile(existingProfile);
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      setError('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-500/10 blur-[128px]" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent-500/10 blur-[128px]" />
      </div>

      <div className="glass-card relative w-full max-w-md p-8 text-center sm:p-10 border border-gray-200 bg-white">
        {/* Co-branded logos */}
        <div className="mx-auto mb-4 flex items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-3xl">
            📚
          </div>
          <span className="text-gray-400 text-lg font-light">+</span>
          <img
            src={SCHOOL_LOGO_URL}
            alt={SCHOOL_PARTNER_SHORT}
            className="h-16 w-16 rounded-2xl object-contain bg-gray-100 p-1"
          />
        </div>
        <h1 className="text-orange-500 mb-1 text-3xl font-black tracking-tight">{APP_NAME}</h1>
        <p className="mb-1 text-xs font-medium text-orange-600">
          in association with {SCHOOL_PARTNER_SHORT}
        </p>
        <p className="mb-8 text-sm text-gray-500">
          CBSE & ICSE Board Exam Prep — Science & Maths, Class 8 to 10
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="btn-glow flex w-full items-center justify-center gap-3 disabled:opacity-40 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-3 transition-all"
        >
          {loading ? (
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
            Free forever — No credit card needed
          </div>
          <p className="text-xs text-gray-600">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}
