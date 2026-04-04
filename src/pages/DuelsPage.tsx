import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  createDuelChallenge,
  joinDuelChallenge,
  startDuelCountdown,
  submitDuelAnswers,
  completeDuel,
  cancelDuel,
  getDuel,
  subscribeToDuel,
  type Duel,
  type DuelQuestion,
} from '@/services/duelService';

// ─── types & helpers ────────────────────────────────────────────────────────

type PageState =
  | 'idle'
  | 'creating'
  | 'waiting'      // challenger waiting for friend
  | 'joining'      // friend landed via link
  | 'ready'        // friend accepted, challenger sees "friend joined!"
  | 'countdown'    // 3-2-1
  | 'in_progress'
  | 'results';

const DIVISIONS = [
  { name: 'Bronze',   icon: '🥉', minXP: 0    },
  { name: 'Silver',   icon: '🥈', minXP: 200  },
  { name: 'Gold I',   icon: '🥇', minXP: 500  },
  { name: 'Gold II',  icon: '🥇', minXP: 750  },
  { name: 'Gold III', icon: '🏅', minXP: 1000 },
  { name: 'Platinum', icon: '💎', minXP: 1500 },
];

function getDivision(xp: number) {
  for (let i = DIVISIONS.length - 1; i >= 0; i--) {
    if (xp >= DIVISIONS[i].minXP) return DIVISIONS[i];
  }
  return DIVISIONS[0];
}

// 5 sample questions — in production generate these via Gemini
const SAMPLE_QUESTIONS: DuelQuestion[] = [
  {
    id: 0,
    question: 'What is the powerhouse of the cell?',
    options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Body'],
    answer: 'Mitochondria',
  },
  {
    id: 1,
    question: 'The SI unit of electric current is:',
    options: ['Volt', 'Ohm', 'Ampere', 'Watt'],
    answer: 'Ampere',
  },
  {
    id: 2,
    question: 'Which of the following is a prime number?',
    options: ['1', '9', '15', '17'],
    answer: '17',
  },
  {
    id: 3,
    question: 'Photosynthesis releases which gas?',
    options: ['CO₂', 'N₂', 'O₂', 'H₂'],
    answer: 'O₂',
  },
  {
    id: 4,
    question: 'The value of π (pi) up to 2 decimal places is:',
    options: ['3.12', '3.14', '3.16', '3.18'],
    answer: '3.14',
  },
];

const MOCK_CHALLENGES = [
  { id: '1', name: 'Arjun Sharma',  level: 8,  subject: 'Science',      xp: 420, initials: 'AS', color: 'bg-blue-100 text-blue-700'    },
  { id: '2', name: 'Priya Mehta',   level: 11, subject: 'Maths',        xp: 680, initials: 'PM', color: 'bg-purple-100 text-purple-700' },
  { id: '3', name: 'Ravi Kumar',    level: 6,  subject: 'AI & Computing', xp: 310, initials: 'RK', color: 'bg-emerald-100 text-emerald-700' },
];

function getAppUrl() {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://vidyaa-rho.vercel.app';
}

// ─── WaitingRoom component ───────────────────────────────────────────────────

interface WaitingRoomProps {
  duelId: string;
  challengeUrl: string;
  duel: Duel | null;
  onCancel: () => void;
}

function WaitingRoom({ duelId, challengeUrl, duel, onCancel }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(challengeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 px-8 py-7 text-center">
        {/* pulsing avatar */}
        <div className="flex justify-center mb-5">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-40" />
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white text-4xl shadow-lg">
              ⏳
            </span>
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-1">Waiting for your friend…</h2>
        <p className="text-sm text-gray-500">Share the link below on WhatsApp. The duel starts the moment they join!</p>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* challenge ID badge */}
        <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-3 border border-gray-200">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Challenge Code</p>
            <p className="text-lg font-black text-gray-800 tracking-widest mt-0.5">{duelId.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-emerald-600">LIVE</span>
          </div>
        </div>

        {/* share link */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Challenge Link</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={challengeUrl}
              className="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 select-all truncate"
            />
            <button
              onClick={copy}
              className="px-4 py-3 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors shrink-0"
            >
              {copied ? '✅' : '📋'}
            </button>
          </div>
        </div>

        {/* WhatsApp button */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `⚔️ I challenge you to a SchoolTribe Duel!\n\nSubject: ${duel?.subject ?? 'Mixed'}\n5 questions, first to finish wins 🏆\n\nClick to accept: ${challengeUrl}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-3 bg-[#25D366] text-white font-black text-base px-8 py-4 rounded-2xl hover:brightness-105 transition-all shadow-md shadow-green-500/20"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Share on WhatsApp
        </a>

        <button
          onClick={onCancel}
          className="w-full text-center text-sm text-gray-400 hover:text-red-500 transition-colors py-1"
        >
          Cancel challenge
        </button>
      </div>
    </div>
  );
}

// ─── Countdown component ─────────────────────────────────────────────────────

interface CountdownProps {
  opponent: string;
  onComplete: () => void;
}

function CountdownScreen({ opponent, onComplete }: CountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 animate-fade-in-up">
      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">vs {opponent}</p>
      <div
        key={count}
        className="text-[120px] font-black leading-none text-orange-500 animate-bounce"
        style={{ transition: 'all 0.3s' }}
      >
        {count === 0 ? '🚀' : count}
      </div>
      <p className="text-xl font-black text-gray-900">
        {count === 0 ? "Let's GO!" : 'Get ready…'}
      </p>
    </div>
  );
}

// ─── QuizScreen component ────────────────────────────────────────────────────

interface QuizProps {
  questions: DuelQuestion[];
  onFinish: (answers: Record<number, string>, score: number) => void;
  opponentName: string;
  opponentDone: boolean;
}

function QuizScreen({ questions, onFinish, opponentName, opponentDone }: QuizProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(60); // 60s per question total shown as global timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          // auto-submit on timeout
          const finalAnswers = { ...answers };
          const score = questions.filter((q) => finalAnswers[q.id] === q.answer).length;
          onFinish(finalAnswers, score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (option: string) => {
    const updated = { ...answers, [questions[current].id]: option };
    setAnswers(updated);

    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
    } else {
      clearInterval(timerRef.current!);
      const score = questions.filter((q) => updated[q.id] === q.answer).length;
      onFinish(updated, score);
    }
  };

  const q = questions[current];

  return (
    <div className="space-y-6 animate-fade-in-up max-w-xl mx-auto">
      {/* top bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-5 py-3 shadow-sm">
        <span className="text-sm font-bold text-gray-700">Q {current + 1}/{questions.length}</span>
        <div className="flex items-center gap-2 text-sm font-bold text-orange-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {timeLeft}s
        </div>
        {opponentDone && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
            {opponentName} finished!
          </span>
        )}
      </div>

      {/* progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((current) / questions.length) * 100}%` }}
        />
      </div>

      {/* question card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
        <p className="text-lg font-bold text-gray-900 leading-relaxed mb-8">{q.question}</p>
        <div className="space-y-3">
          {q.options.map((opt) => (
            <button
              key={opt}
              onClick={() => choose(opt)}
              className="w-full text-left px-5 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50 text-sm font-bold text-gray-700
                hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 transition-all active:scale-[0.98]"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ResultsScreen component ─────────────────────────────────────────────────

interface ResultsProps {
  duel: Duel;
  myRole: 'challenger' | 'joiner';
  myName: string;
}

function ResultsScreen({ duel, myRole, myName }: ResultsProps) {
  const myScore     = myRole === 'challenger' ? duel.challengerScore ?? 0 : duel.joinerScore ?? 0;
  const theirScore  = myRole === 'challenger' ? duel.joinerScore ?? 0    : duel.challengerScore ?? 0;
  const theirName   = myRole === 'challenger' ? duel.joinerName ?? 'Opponent'    : duel.challengerName;
  const total       = duel.questions?.length ?? 5;
  const won         = myScore > theirScore;
  const tied        = myScore === theirScore;

  return (
    <div className="space-y-6 animate-fade-in-up max-w-xl mx-auto">
      {/* result banner */}
      <div className={`rounded-3xl border p-8 text-center ${
        won  ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200' :
        tied ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'   :
               'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
      }`}>
        <div className="text-6xl mb-3">{won ? '🏆' : tied ? '🤝' : '😤'}</div>
        <h2 className="text-3xl font-black text-gray-900 mb-1">
          {won ? 'You Won!' : tied ? "It's a Tie!" : 'You Lost'}
        </h2>
        <p className="text-sm text-gray-500">
          {won  ? '+100 XP and +40 Coins added to your account!' :
           tied ? 'No coins exchanged — perfectly matched!' :
                  'Better luck next time 💪'}
        </p>
      </div>

      {/* score comparison */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Score</h3>
        </div>
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          {[
            { name: myName,    score: myScore,    isMe: true  },
            { name: theirName, score: theirScore, isMe: false },
          ].map((p) => (
            <div key={p.name} className="py-7 text-center">
              <p className={`text-4xl font-black ${p.isMe ? 'text-orange-500' : 'text-gray-700'}`}>
                {p.score}/{total}
              </p>
              <p className="text-xs font-bold text-gray-400 mt-1 truncate px-2">{p.name}</p>
              {p.isMe && <p className="text-[10px] font-bold text-orange-400 mt-1">YOU</p>}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => window.location.reload()}
        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-base px-8 py-4 rounded-2xl hover:brightness-105 transition-all shadow-md shadow-orange-500/20"
      >
        🔁 Play Again
      </button>
    </div>
  );
}

// ─── JoinScreen component ────────────────────────────────────────────────────

interface JoinScreenProps {
  duel: Duel;
  onJoin: () => void;
  loading: boolean;
}

function JoinScreen({ duel, onJoin, loading }: JoinScreenProps) {
  return (
    <div className="max-w-md mx-auto animate-fade-in-up">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-8 py-8 text-center">
          <div className="text-5xl mb-4">⚔️</div>
          <h2 className="text-2xl font-black text-gray-900 mb-1">You've been challenged!</h2>
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-800">{duel.challengerName}</span> wants a duel
          </p>
        </div>
        <div className="px-8 py-6 space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-3 border border-gray-200">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subject</span>
            <span className="text-sm font-bold text-gray-800">{duel.subject}</span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-3 border border-gray-200">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Questions</span>
            <span className="text-sm font-bold text-gray-800">{duel.questions?.length ?? 5} questions</span>
          </div>
          <button
            onClick={onJoin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-base px-8 py-4 rounded-2xl hover:brightness-105 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-60"
          >
            {loading ? 'Joining…' : '✅ Accept & Join Duel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main DuelsPage ──────────────────────────────────────────────────────────

export default function DuelsPage() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>('idle');
  const [activeDuel, setActiveDuel] = useState<Duel | null>(null);
  const [activeDuelId, setActiveDuelId] = useState<string | null>(null);
  const [challengeUrl, setChallengeUrl] = useState('');
  const [myRole, setMyRole] = useState<'challenger' | 'joiner'>('challenger');
  const [joining, setJoining] = useState(false);
  const [opponentDone, setOpponentDone] = useState(false);

  const unsubRef = useRef<(() => void) | null>(null);

  // Mock stats
  const wins = 14; const losses = 12;
  const winRate = Math.round((wins / (wins + losses)) * 100);
  const userXP = profile ? 420 : 0;
  const division = getDivision(userXP);
  const coinsBalance = Math.floor(userXP / 10);

  const myDisplayName = profile?.displayName ?? profile?.email ?? 'You';

  // Detect join param from URL
  useEffect(() => {
    const joinId = searchParams.get('join');
    if (!joinId || !user) return;

    // don't let challenger join their own duel
    void (async () => {
      const duel = await getDuel(joinId);
      if (!duel || duel.status === 'cancelled' || duel.status === 'completed') return;
      if (duel.challengerId === user.uid) return; // own challenge
      setActiveDuel(duel);
      setActiveDuelId(joinId);
      setMyRole('joiner');
      setPageState('joining');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  // Subscribe to duel changes
  useEffect(() => {
    if (!activeDuelId) return;
    unsubRef.current?.();
    unsubRef.current = subscribeToDuel(activeDuelId, (duel) => {
      setActiveDuel(duel);

      // Challenger sees friend joined → go ready
      if (myRole === 'challenger' && duel.status === 'ready' && pageState === 'waiting') {
        setPageState('ready');
      }
      // Both see countdown
      if (duel.status === 'countdown' && pageState !== 'countdown' && pageState !== 'in_progress') {
        setPageState('countdown');
      }
      // Track opponent completion
      if (duel.status === 'in_progress' || duel.status === 'completed') {
        const theirAnswers = myRole === 'challenger' ? duel.joinerAnswers : duel.challengerAnswers;
        if (theirAnswers && Object.keys(theirAnswers).length === (duel.questions?.length ?? 5)) {
          setOpponentDone(true);
        }
        // If both done → completed
        if (duel.status === 'completed' && pageState === 'in_progress') {
          setPageState('results');
        }
      }
      // Joiner sees results when completed
      if (duel.status === 'completed' && myRole === 'joiner' && pageState === 'in_progress') {
        setPageState('results');
      }
    });
    return () => unsubRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDuelId]);

  // Create challenge
  const handleCreateChallenge = useCallback(async () => {
    if (!user) return;
    setPageState('creating');
    try {
      const id = await createDuelChallenge(
        user.uid,
        myDisplayName,
        'Mixed',
        SAMPLE_QUESTIONS,
      );
      const url = `${getAppUrl()}/duels?join=${id}`;
      setActiveDuelId(id);
      setChallengeUrl(url);
      setMyRole('challenger');
      setPageState('waiting');
    } catch {
      setPageState('idle');
    }
  }, [user, myDisplayName]);

  // Friend accepts
  const handleJoin = useCallback(async () => {
    if (!user || !activeDuelId) return;
    setJoining(true);
    try {
      await joinDuelChallenge(activeDuelId, user.uid, myDisplayName);
      // challenger's listener fires → pageState becomes 'ready' for challenger
      // joiner stays and waits for countdown
    } catch {
      setJoining(false);
    }
  }, [user, activeDuelId, myDisplayName]);

  // Challenger triggers countdown once they see "ready"
  const handleStartCountdown = useCallback(async () => {
    if (!activeDuelId) return;
    await startDuelCountdown(activeDuelId);
  }, [activeDuelId]);

  const handleCountdownComplete = useCallback(() => {
    setPageState('in_progress');
  }, []);

  // Player finishes quiz
  const handleQuizFinish = useCallback(async (answers: Record<number, string>, score: number) => {
    if (!activeDuelId) return;
    await submitDuelAnswers(activeDuelId, myRole, answers, score);

    // Check if opponent already done → complete
    const fresh = await getDuel(activeDuelId);
    if (fresh) {
      const theirScore = myRole === 'challenger' ? fresh.joinerScore : fresh.challengerScore;
      if (theirScore !== undefined) {
        await completeDuel(activeDuelId);
        setActiveDuel(fresh);
        setPageState('results');
      } else {
        // Wait for opponent — stay in_progress
        // The listener will trigger results when opponent submits
      }
    }
  }, [activeDuelId, myRole]);

  // Cancel
  const handleCancel = useCallback(async () => {
    if (activeDuelId) await cancelDuel(activeDuelId);
    unsubRef.current?.();
    setActiveDuelId(null);
    setActiveDuel(null);
    setPageState('idle');
    navigate('/duels', { replace: true });
  }, [activeDuelId, navigate]);

  // ── render by state ──────────────────────────────────────────────────────

  if (pageState === 'joining' && activeDuel) {
    return (
      <div className="max-w-3xl mx-auto pt-6 px-4">
        <JoinScreen duel={activeDuel} onJoin={handleJoin} loading={joining} />
        {/* joiner waits after accepting */}
        {joining && (
          <div className="mt-6 text-center text-sm text-gray-500 animate-pulse">
            Waiting for challenger to start the countdown…
          </div>
        )}
      </div>
    );
  }

  if (pageState === 'countdown' && activeDuel) {
    const opponentName =
      myRole === 'challenger' ? activeDuel.joinerName ?? 'Opponent' : activeDuel.challengerName;
    return (
      <div className="max-w-3xl mx-auto pt-6 px-4">
        <CountdownScreen opponent={opponentName} onComplete={handleCountdownComplete} />
      </div>
    );
  }

  if (pageState === 'in_progress' && activeDuel?.questions) {
    const opponentName =
      myRole === 'challenger' ? activeDuel.joinerName ?? 'Opponent' : activeDuel.challengerName;
    return (
      <div className="max-w-3xl mx-auto pt-6 px-4">
        <QuizScreen
          questions={activeDuel.questions}
          onFinish={handleQuizFinish}
          opponentName={opponentName}
          opponentDone={opponentDone}
        />
      </div>
    );
  }

  if (pageState === 'results' && activeDuel) {
    return (
      <div className="max-w-3xl mx-auto pt-6 px-4">
        <ResultsScreen duel={activeDuel} myRole={myRole} myName={myDisplayName} />
      </div>
    );
  }

  // ── "ready" overlay — challenger sees friend joined ──────────────────────
  if (pageState === 'ready' && activeDuel) {
    return (
      <div className="max-w-3xl mx-auto pt-6 px-4 space-y-6 animate-fade-in-up">
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 px-8 py-8 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">
              {activeDuel.joinerName ?? 'Your friend'} joined!
            </h2>
            <p className="text-sm text-gray-500">Both of you are here. Start the duel when you're ready!</p>
          </div>
          <div className="px-8 py-6">
            <button
              onClick={handleStartCountdown}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-lg px-8 py-5 rounded-2xl hover:brightness-105 transition-all shadow-md shadow-orange-500/20"
            >
              🚀 START THE DUEL NOW
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── main idle screen ─────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-20 lg:pb-0 max-w-3xl mx-auto">

      {/* Header */}
      <header className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-2xl">⚔️</div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Duels</h1>
            <p className="text-sm text-gray-500">Challenge a classmate to a 5-question sprint. Winner takes the XP.</p>
          </div>
        </div>
      </header>

      {/* Live pill */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-4 py-2 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          3 LIVE BATTLES IN PROGRESS
        </div>
      </div>

      {/* Main Duel Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-8 py-5 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-100 text-4xl shadow-sm">⚔️</div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-1">Ready to Brawl?</h2>
          <p className="text-sm text-gray-500">Entry fee: <span className="font-bold text-gray-700">20 Coins</span>. Winner takes <span className="font-bold text-orange-500">40 Coins + 100 XP</span>.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          <div className="py-5 text-center">
            <p className="text-2xl font-black text-gray-900">{wins}</p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Wins</p>
          </div>
          <div className="py-5 text-center">
            <p className="text-2xl font-black text-gray-900">{winRate}%</p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Win Rate</p>
          </div>
          <div className="py-5 text-center">
            <p className="text-2xl font-black text-orange-500">{division.icon} {division.name}</p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Division</p>
          </div>
        </div>

        <div className="px-8 pt-5 flex items-center justify-between">
          <span className="text-sm text-gray-500">Your balance</span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
            <span className="text-base">🪙</span> {coinsBalance} Coins
          </span>
        </div>

        {/* Buttons */}
        <div className="px-8 py-5 space-y-3">
          <button
            onClick={() => {}}
            disabled={coinsBalance < 20}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-base tracking-wide px-8 py-4 rounded-2xl hover:brightness-105 transition-all shadow-md shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🎯 FIND RANDOM OPPONENT
          </button>

          {/* WhatsApp challenge button */}
          {pageState === 'creating' ? (
            <div className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white font-bold text-base px-8 py-4 rounded-2xl opacity-80">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating challenge…
            </div>
          ) : (
            <button
              onClick={handleCreateChallenge}
              className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white font-black text-base tracking-wide px-8 py-4 rounded-2xl hover:brightness-105 transition-all shadow-md shadow-green-500/20"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              CHALLENGE A FRIEND VIA WHATSAPP
            </button>
          )}
        </div>
      </div>

      {/* Waiting room — shown below main card while challenger waits */}
      {pageState === 'waiting' && activeDuelId && (
        <WaitingRoom
          duelId={activeDuelId}
          challengeUrl={challengeUrl}
          duel={activeDuel}
          onCancel={handleCancel}
        />
      )}

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-black text-gray-900 mb-4">How Duels Work</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '📲', title: 'Send WhatsApp invite', desc: 'Tap "Challenge a Friend" — a link is created and shared to WhatsApp.' },
            { icon: '⏱️', title: 'Wait for them to join', desc: 'Your friend taps the link and accepts. You both see a 3-2-1 countdown.' },
            { icon: '🏆', title: 'Winner takes all', desc: '40 coins + 100 XP goes to whoever scores higher in the 5-question sprint.' },
          ].map((item) => (
            <div key={item.icon} className="flex gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50 border border-orange-100 text-lg">{item.icon}</div>
              <div>
                <p className="text-sm font-bold text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open Challenges */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-gray-900">Open Challenges</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">{MOCK_CHALLENGES.length}</span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {MOCK_CHALLENGES.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${c.color}`}>{c.initials}</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">{c.name}</p>
                <p className="text-xs text-gray-500">Level {c.level} • {c.subject} • {c.xp} XP</p>
              </div>
              <button className="px-4 py-2 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold rounded-xl hover:bg-orange-100 transition-colors">
                Accept ⚔️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Division ladder */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-black text-gray-900 mb-4">Division Ladder</h3>
        <div className="space-y-2">
          {DIVISIONS.slice().reverse().map((div) => {
            const isCurrent = div.name === division.name;
            return (
              <div key={div.name} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${isCurrent ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                <span className="text-lg">{div.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${isCurrent ? 'text-orange-600' : 'text-gray-700'}`}>{div.name}</p>
                  <p className="text-xs text-gray-400">{div.minXP}+ XP</p>
                </div>
                {isCurrent && <span className="text-[10px] font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">YOU ARE HERE</span>}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">
        Random matchmaking coming soon 🚀
      </p>
    </div>
  );
}
