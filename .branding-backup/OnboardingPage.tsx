import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { createUserProfile } from '@/services/authService';
import { BOARDS, CLASS_OPTIONS, BOARD_SUBJECTS, SUBJECT_LABELS } from '@/constants';
import type { UserRole, Subject, Board, ClassLevel } from '@/types';

type Step = 'role' | 'board' | 'class' | 'subjects' | 'name';

const STEPS: Step[] = ['role', 'board', 'class', 'subjects', 'name'];

const ROLES: { value: UserRole; label: string; icon: string; desc: string }[] = [
  { value: 'student', label: 'Student', icon: '🎓', desc: 'I want to study for board exams' },
  { value: 'parent', label: 'Parent', icon: '👨‍👩‍👧', desc: "I want to track my child's progress" },
  { value: 'teacher', label: 'Teacher', icon: '👩‍🏫', desc: 'I want to help students learn' },
  { value: 'admin', label: 'Principal / Admin', icon: '🏫', desc: 'I manage the school and assignments' },
];

export default function OnboardingPage() {
  const { user, setProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<UserRole | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [classLevel, setClassLevel] = useState<ClassLevel | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length;

  function toggleSubject(subject: Subject) {
    setSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  }

  function goNext() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  function goBack() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  async function handleComplete() {
    if (!user || !role || !board || !classLevel || subjects.length === 0 || !displayName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const profileData = await createUserProfile(user.uid, {
        role,
        displayName: displayName.trim(),
        phone: user.phoneNumber || '',
        email: user.email || undefined,
        board,
        class: classLevel,
        subjects,
      });
      setProfile(profileData);
      const home = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/dashboard';
      navigate(home, { replace: true });
    } catch (err) {
      console.error('Profile creation error:', err);
      setError('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Available subjects based on selected board
  const availableSubjects = board ? BOARD_SUBJECTS[board] : [];

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-950 px-4 py-8">
      {/* Ambient gradient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-48 -top-48 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute -left-48 -bottom-48 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="glass-card rounded-2xl border border-surface-700/50 p-8 md:p-12 backdrop-blur-xl">
          {/* Step indicator */}
          <div className="mb-10 flex items-center justify-center gap-2">
            {STEPS.map((s, i) => {
              const isCompleted = i < stepIndex;
              const isCurrent = s === step;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                      isCompleted
                        ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40'
                        : isCurrent
                          ? 'bg-amber-500 text-surface-950 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20'
                          : 'bg-surface-800 text-slate-500 ring-1 ring-surface-700'
                    }`}
                  >
                    {isCompleted ? '✓' : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 w-6 rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-amber-500/40' : 'bg-surface-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* ─── Step 1: Role ─── */}
          {step === 'role' && (
            <div className="animate-fade-in">
              <div className="mb-2 text-center">
                <h1 className="text-gradient mb-2 text-4xl font-bold">Welcome to Vidyaa</h1>
                <p className="text-slate-400">Choose your role to get started</p>
              </div>
              <div className="mb-8 mt-10 space-y-3">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => { setRole(r.value); goNext(); }}
                    className={`glass-card-hover group relative flex w-full items-center gap-4 rounded-xl border p-5 transition-all duration-300 ${
                      role === r.value
                        ? 'border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/20'
                        : 'border-surface-700/50 hover:border-amber-500/30'
                    }`}
                  >
                    <span className="text-3xl">{r.icon}</span>
                    <div className="flex flex-col items-start">
                      <p className="font-semibold text-white">{r.label}</p>
                      <p className="text-sm text-slate-400">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 2: Board ─── */}
          {step === 'board' && (
            <div className="animate-fade-in">
              <div className="mb-2 text-center">
                <h2 className="text-gradient mb-2 text-3xl font-bold">Select Your Board</h2>
                <p className="text-slate-400">Which education board are you following?</p>
              </div>
              <div className="mb-8 mt-10 grid grid-cols-2 gap-4">
                {BOARDS.map((b) => {
                  const isSelected = board === b.value;
                  return (
                    <button
                      key={b.value}
                      onClick={() => {
                        setBoard(b.value);
                        setSubjects([]); // reset subjects when board changes
                      }}
                      className={`glass-card-hover group relative flex flex-col items-center gap-3 rounded-xl border p-6 transition-all duration-300 ${
                        isSelected
                          ? 'border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/20'
                          : 'border-surface-700/50 hover:border-amber-500/30'
                      }`}
                    >
                      <span className="text-5xl">{b.icon}</span>
                      <span className="text-xl font-bold text-white">{b.label}</span>
                      <span className="text-xs text-slate-400 text-center">{b.desc}</span>
                      {isSelected && (
                        <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
                          <svg className="h-3 w-3 text-surface-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={goBack} className="btn-ghost flex-1 rounded-lg border border-surface-700 px-4 py-3 font-medium text-slate-300 transition-all hover:border-amber-500/30 hover:text-white">
                  Back
                </button>
                <button
                  onClick={goNext}
                  disabled={!board}
                  className="btn-glow flex-1 rounded-lg bg-amber-500 px-4 py-3 font-semibold text-surface-950 shadow-lg shadow-amber-500/30 transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-slate-500 disabled:shadow-none"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Class ─── */}
          {step === 'class' && (
            <div className="animate-fade-in">
              <div className="mb-2 text-center">
                <h2 className="text-gradient mb-2 text-3xl font-bold">Select Your Class</h2>
                <p className="text-slate-400">{board} — Which class are you in?</p>
              </div>
              <div className="mb-8 mt-10 grid grid-cols-3 gap-4">
                {CLASS_OPTIONS.map((c) => {
                  const isSelected = classLevel === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setClassLevel(c.value)}
                      className={`glass-card-hover flex flex-col items-center gap-2 rounded-xl border p-6 transition-all duration-300 ${
                        isSelected
                          ? 'border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/20'
                          : 'border-surface-700/50 hover:border-amber-500/30'
                      }`}
                    >
                      <span className="text-4xl font-black text-amber-400">{c.value}</span>
                      <span className="text-sm font-medium text-slate-300">{c.label}</span>
                      {isSelected && (
                        <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
                          <svg className="h-3 w-3 text-surface-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={goBack} className="btn-ghost flex-1 rounded-lg border border-surface-700 px-4 py-3 font-medium text-slate-300 transition-all hover:border-amber-500/30 hover:text-white">
                  Back
                </button>
                <button
                  onClick={goNext}
                  disabled={!classLevel}
                  className="btn-glow flex-1 rounded-lg bg-amber-500 px-4 py-3 font-semibold text-surface-950 shadow-lg shadow-amber-500/30 transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-slate-500 disabled:shadow-none"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 4: Subjects ─── */}
          {step === 'subjects' && (
            <div className="animate-fade-in">
              <div className="mb-2 text-center">
                <h2 className="text-gradient mb-2 text-3xl font-bold">Select Your Subjects</h2>
                <p className="text-slate-400">{board} Class {classLevel} — Choose subjects to study</p>
              </div>
              <div className="mb-8 mt-10 grid grid-cols-2 gap-4">
                {availableSubjects.map((s) => {
                  const info = SUBJECT_LABELS[s];
                  const isSelected = subjects.includes(s as Subject);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSubject(s as Subject)}
                      className={`glass-card-hover group relative flex flex-col items-center gap-3 rounded-xl border p-6 transition-all duration-300 ${
                        isSelected
                          ? 'border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/20'
                          : 'border-surface-700/50 hover:border-amber-500/30'
                      }`}
                    >
                      <span className="text-4xl">{info.icon}</span>
                      <span className="font-semibold text-white">{info.label}</span>
                      {isSelected && (
                        <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
                          <svg className="h-3 w-3 text-surface-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={goBack} className="btn-ghost flex-1 rounded-lg border border-surface-700 px-4 py-3 font-medium text-slate-300 transition-all hover:border-amber-500/30 hover:text-white">
                  Back
                </button>
                <button
                  onClick={goNext}
                  disabled={subjects.length === 0}
                  className="btn-glow flex-1 rounded-lg bg-amber-500 px-4 py-3 font-semibold text-surface-950 shadow-lg shadow-amber-500/30 transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-slate-500 disabled:shadow-none"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 5: Name ─── */}
          {step === 'name' && (
            <div className="animate-fade-in">
              <div className="mb-2 text-center">
                <h2 className="text-gradient mb-2 text-3xl font-bold">What's Your Name?</h2>
                <p className="text-slate-400">Almost there! Personalize your learning journey</p>
              </div>

              {/* Summary of selections */}
              <div className="mb-6 mt-8 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400">
                  {board}
                </span>
                <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-xs font-semibold text-blue-400">
                  Class {classLevel}
                </span>
                {subjects.map((s) => (
                  <span key={s} className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
                    {SUBJECT_LABELS[s]?.label || s}
                  </span>
                ))}
              </div>

              <div className="mb-8">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-lg border border-surface-700 bg-surface-900/50 px-4 py-3 font-medium text-white placeholder-slate-500 transition-all duration-300 focus:border-amber-500/60 focus:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button onClick={goBack} className="btn-ghost flex-1 rounded-lg border border-surface-700 px-4 py-3 font-medium text-slate-300 transition-all hover:border-amber-500/30 hover:text-white">
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!displayName.trim() || loading}
                  className="btn-glow flex-1 rounded-lg bg-amber-500 px-4 py-3 font-semibold text-surface-950 shadow-lg shadow-amber-500/30 transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-slate-500 disabled:shadow-none"
                >
                  {loading ? 'Creating Profile...' : 'Start Learning'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Step {stepIndex + 1} of {totalSteps}</p>
        </div>
      </div>
    </main>
  );
}
