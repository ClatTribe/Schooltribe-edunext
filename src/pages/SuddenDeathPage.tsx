import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSuddenDeathQuestions } from '@/services/questionService';
import type { CachedQuestion } from '@/services/questionService';
import type { BoardType, ClassLevel } from '@/constants';
import { atomicXPUpdate } from '@/services/firestoreService';

interface Answer {
  questionId: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
}

type GameState = 'start' | 'playing' | 'gameover' | 'victory';

export default function SuddenDeathPage() {
  const { user, profile } = useAuth();
  const [gameState, setGameState] = useState<GameState>('start');
  const [questions, setQuestions] = useState<CachedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [showAnswerReview, setShowAnswerReview] = useState(false);

  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const board = (profile?.board || 'CBSE') as BoardType;
        const classLevel = (profile?.class || 10) as ClassLevel;
        const gameQuestions = await getSuddenDeathQuestions(board, classLevel);
        setQuestions(gameQuestions);
      } catch (error) {
        console.error('Failed to load questions:', error);
      } finally {
        setLoading(false);
      }
    };

    initGame();
  }, [user]);

  // XP is saved via saveXPAndShare() when user clicks Share or when game ends.
  // No duplicate useEffect save needed.
  const xpSavedRef = useRef(false); // Prevent double-saving XP

  // Save XP once when game ends
  useEffect(() => {
    if ((gameState === 'victory' || gameState === 'gameover') && xpEarned > 0 && user && !xpSavedRef.current) {
      xpSavedRef.current = true;
      atomicXPUpdate(user.uid, xpEarned).catch(console.error);
    }
  }, [gameState, xpEarned, user]);

  // Refs to track timeouts, handlers, and mutable game state
  const handleTimeoutRef = useRef<() => void>(() => {});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const livesRef = useRef(3); // Mirror of lives state — always current

  // Update ref when dependencies change
  useEffect(() => {
    handleTimeoutRef.current = () => {
      if (currentIndex < questions.length && !showResult) {
        handleWrongAnswer();
      }
    };
  }, [currentIndex, questions.length, showResult]);

  // Cleanup all timeouts on unmount or state change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing' || showResult) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          handleTimeoutRef.current();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, showResult]);

  const startChallenge = () => {
    if (questions.length === 0) return;
    livesRef.current = 3;
    setGameState('playing');
    setCurrentIndex(0);
    setLives(3);
    setStreak(0);
    setAnswers([]);
    setXpEarned(0);
    setSelectedOption(null);
    setShowResult(false);
    setTimer(30);
  };

  const handleAnswerSelect = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
  };

  const handleCorrectAnswer = () => {
    const newStreak = streak + 1;
    setStreak(newStreak);
    setXpEarned((prev) => prev + 5);

    const question = questions[currentIndex];
    setAnswers([
      ...answers,
      {
        questionId: question.id,
        selected: selectedOption!,
        correct: question.correctAnswer,
        isCorrect: true,
      },
    ]);

    setShowResult(true);

    // Clear any previous timeout before setting a new one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        setGameState('victory');
      } else {
        setCurrentIndex(currentIndex + 1);
        setSelectedOption(null);
        setShowResult(false);
        setTimer(30);
      }
    }, 1500);
  };

  const handleWrongAnswer = () => {
    const question = questions[currentIndex];
    setAnswers((prev) => [
      ...prev,
      {
        questionId: question.id,
        selected: selectedOption || 'timeout',
        correct: question.correctAnswer,
        isCorrect: false,
      },
    ]);

    // Decrement lives using BOTH ref (for immediate read) and state (for UI)
    livesRef.current -= 1;
    const newLives = livesRef.current;
    setLives(newLives);
    setShowResult(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (newLives <= 0) {
        setGameState('gameover');
      } else if (currentIndex + 1 >= questions.length) {
        setGameState('victory');
      } else {
        setCurrentIndex(currentIndex + 1);
        setSelectedOption(null);
        setShowResult(false);
        setTimer(30);
      }
    }, 1500);
  };

  const handleConfirmAnswer = () => {
    if (!selectedOption) return;

    const question = questions[currentIndex];
    const isCorrect = selectedOption === question.correctAnswer;

    if (isCorrect) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  };

  // XP is already saved once via the useEffect above — no duplicate call needed here.

  const [copied, setCopied] = useState(false);

  const shareScore = async () => {
    const accuracy = answers.length > 0
      ? Math.round((answers.filter((a) => a.isCorrect).length / answers.length) * 100)
      : 0;
    const text = `🎮 Sudden Death Challenge 💀\nI survived ${answers.length} questions with ${streak} correct streak!\nAccuracy: ${accuracy}%\nXP Earned: ${xpEarned}\n\nCan you beat my score? Play at vidyaa-rho.vercel.app 🔥`;

    // Try native share API first (works on mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SchoolTribe - Sudden Death Score', text });
        return;
      } catch { /* user cancelled */ }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Last resort for HTTP or old browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const resetGame = () => {
    livesRef.current = 3;
    xpSavedRef.current = false;
    setGameState('start');
    setCurrentIndex(0);
    setLives(3);
    setStreak(0);
    setSelectedOption(null);
    setShowResult(false);
    setAnswers([]);
    setXpEarned(0);
    setTimer(30);
    setShowAnswerReview(false);
  };

  // Render Start Screen
  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white p-4 md:p-8 flex flex-col items-center justify-center">
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes pulse-red {
            0%, 100% { text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
            50% { text-shadow: 0 0 30px rgba(239, 68, 68, 0.9); }
          }
          .animate-float { animation: float 3s ease-in-out infinite; }
          .pulse-red { animation: pulse-red 2s ease-in-out infinite; }
        `}</style>

        <div className="w-full max-w-2xl animate-fade-in-up">
          {/* Skull Icon */}
          <div className="text-8xl text-center mb-6 animate-float pulse-red">💀</div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-bold text-center mb-4 text-orange-500">
            Sudden Death
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 text-center mb-8">
            One wrong answer = Game Over. How far can you go?
          </p>

          {/* Date and Daily Badge */}
          <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
            <div className="glass-card text-center">
              <p className="text-gray-500 text-sm">Today's Date</p>
              <p className="text-orange-500 font-semibold">
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="glass-card flex items-center justify-center gap-2">
              <span className="live-dot"></span>
              <span className="text-orange-500 font-semibold">DAILY CHALLENGE</span>
            </div>
          </div>

          {/* Rules Card */}
          <div className="glass-card mb-8 border border-gray-200">
            <h2 className="text-lg font-semibold text-orange-500 mb-4">📋 Rules</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-xl">❤️</span>
                <span>You have 3 lives to survive the challenge</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">✓</span>
                <span>Answer correctly to keep your streak alive</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">✗</span>
                <span>One wrong answer = lose a life</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">💀</span>
                <span>0 lives = Game Over</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">⏱️</span>
                <span>30 seconds per question</span>
              </li>
            </ul>
          </div>


          {/* Start Button */}
          <button
            onClick={startChallenge}
            disabled={loading || questions.length === 0}
            className="w-full btn-glow bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold py-4 px-6 rounded-lg text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {loading ? 'Loading Questions...' : 'START CHALLENGE'}
          </button>
        </div>
      </div>
    );
  }

  // Render Playing Screen
  if (gameState === 'playing') {
    const question = questions[currentIndex];
    const timerColor = timer <= 5 ? 'bg-red-500' : timer <= 10 ? 'bg-orange-500' : 'bg-emerald-500';
    const correctAnswer = question?.correctAnswer;

    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white p-4 md:p-8">
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
            50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.7); }
          }
          @keyframes red-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
            50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.7); }
          }
          .shake { animation: shake 0.5s; }
          .pulse-glow { animation: pulse-glow 0.8s; }
          .red-glow { animation: red-glow 0.8s; }
        `}</style>

        <div className="w-full max-w-4xl mx-auto">
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-8 p-4 glass-card border border-gray-200">
            {/* Lives */}
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`text-2xl transition-all duration-300 ${
                    i < lives ? '' : 'grayscale opacity-30'
                  }`}
                  style={i >= lives ? { filter: 'grayscale(1) brightness(0.4)' } : {}}
                >
                  {i < lives ? '❤️' : '🖤'}
                </span>
              ))}
              <span className="text-sm font-bold text-red-400 ml-1">{lives}/3</span>
            </div>

            {/* Streak */}
            <div className="text-center">
              <p className="text-orange-500 font-bold text-lg flex items-center gap-2">
                <span>🔥</span>
                <span>{streak}</span>
              </p>
            </div>

            {/* Timer */}
            <div className="text-right">
              <p className="text-gray-600 text-sm">Time Remaining</p>
              <div className="relative mt-2">
                <div className="w-24 h-2 bg-gray-300 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${timerColor} transition-all duration-300`}
                    style={{ width: `${(timer / 30) * 100}%` }}
                  ></div>
                </div>
                <p className={`text-sm font-bold mt-1 ${timerColor === 'bg-red-500' ? 'text-red-500' : timerColor === 'bg-orange-500' ? 'text-orange-500' : 'text-emerald-500'}`}>
                  {timer}s
                </p>
              </div>
            </div>
          </div>

          {/* Question Number */}
          <div className="text-center mb-6">
            <p className="text-gray-600">
              Question <span className="text-orange-500 font-bold">{currentIndex + 1}</span> of{' '}
              <span className="text-orange-500 font-bold">{questions.length}</span>
            </p>
          </div>

          {/* Question Card */}
          <div className={`glass-card mb-8 border border-gray-200 ${showResult ? 'scale-100' : 'animate-fade-in-up'}`}>
            <p className="text-2xl md:text-3xl font-semibold text-center text-gray-900 leading-relaxed">
              {question?.question}
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {['a', 'b', 'c', 'd'].map((option) => {
              const optionText = question?.options[option as 'a' | 'b' | 'c' | 'd'];
              const isSelected = selectedOption === option;
              const isCorrect = option === correctAnswer;
              const isWrong = selectedOption === option && option !== correctAnswer && showResult;

              let buttonClass = 'bg-gray-200 border border-gray-300 hover:border-orange-300';

              if (isSelected && !showResult) {
                buttonClass = 'bg-gray-300 border-2 border-orange-500 ring-2 ring-orange-200';
              } else if (showResult) {
                if (isCorrect) {
                  buttonClass = 'bg-emerald-100 border-2 border-emerald-500 pulse-glow';
                } else if (isWrong) {
                  buttonClass = 'bg-red-100 border-2 border-red-500 shake red-glow';
                }
              }

              return (
                <button
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showResult}
                  className={`p-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 ${buttonClass}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-orange-500 font-bold text-lg">{option.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-gray-800 font-medium">{optionText}</p>
                    </div>
                    {showResult && isCorrect && <span className="text-emerald-400 text-2xl">✓</span>}
                    {showResult && isWrong && <span className="text-red-400 text-2xl">✗</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Confirm Button */}
          {!showResult && (
            <button
              onClick={handleConfirmAnswer}
              disabled={!selectedOption}
              className="w-full btn-glow bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Answer
            </button>
          )}

          {/* Feedback Message */}
          {showResult && (
            <div className={`text-center text-lg font-semibold ${selectedOption === correctAnswer ? 'text-emerald-600' : 'text-red-600'}`}>
              {selectedOption === correctAnswer ? (
                <>
                  <p>✓ Correct! +5 XP</p>
                  <p className="text-sm text-gray-600 mt-2">Next question loading...</p>
                </>
              ) : (
                <>
                  <p>✗ Wrong answer!</p>
                  <p className="text-sm text-orange-600 mt-2">Correct answer: {correctAnswer?.toUpperCase()}</p>
                  {lives > 0 && <p className="text-sm text-gray-600 mt-1">Continue to next question...</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Victory Screen
  if (gameState === 'victory') {
    const accuracy = answers.length > 0
      ? Math.round((answers.filter((a) => a.isCorrect).length / answers.length) * 100)
      : 0;
    const isPerfect = answers.every((a) => a.isCorrect);

    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white p-4 md:p-8 flex flex-col items-center justify-center">
        <style>{`
          @keyframes confetti {
            0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          .confetti {
            position: fixed;
            pointer-events: none;
            animation: confetti 3s ease-in forwards;
          }
        `}</style>

        <div className="w-full max-w-2xl animate-fade-in-up text-center">
          {/* Confetti Effect */}
          {isPerfect &&
            [...Array(20)].map((_, i) => (
              <div
                key={i}
                className="confetti text-2xl"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }}
              >
                🎉
              </div>
            ))}

          {/* Icon */}
          <div className="text-8xl mb-6 animate-scale-in">
            {isPerfect ? '🏆' : '💀'}
          </div>

          {/* Result Title */}
          <h1 className={`text-5xl md:text-6xl font-bold mb-4 ${isPerfect ? 'text-orange-500' : 'text-red-500'}`}>
            {isPerfect ? 'PERFECT RUN!' : 'GAME OVER'}
          </h1>

          {/* Stats */}
          <div className="glass-card mb-8 border border-gray-200">
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 text-sm">Questions Survived</p>
                <p className="text-4xl font-bold text-orange-500">{answers.length}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Accuracy</p>
                <p className="text-2xl font-bold text-emerald-600">{accuracy}%</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Best Streak</p>
                <p className="text-2xl font-bold text-orange-500">{streak}</p>
              </div>
              <div className="border-t border-gray-300 pt-4">
                <p className="text-gray-600 text-sm">XP Earned</p>
                <p className="text-3xl font-bold text-emerald-600">+{xpEarned}</p>
              </div>
            </div>
          </div>

          {/* Answer Review Toggle */}
          <button
            onClick={() => setShowAnswerReview(!showAnswerReview)}
            className="w-full mb-6 px-4 py-2 bg-gray-200 border border-gray-300 text-gray-700 rounded-lg hover:border-orange-300 transition-all"
          >
            {showAnswerReview ? '▼ Hide' : '▶ Show'} Answer Review
          </button>

          {/* Answer Review */}
          {showAnswerReview && (
            <div className="glass-card mb-8 border border-gray-200 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {answers.map((answer, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      answer.isCorrect
                        ? 'bg-emerald-100 border-emerald-300'
                        : 'bg-red-100 border-red-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-800">
                      Q{idx + 1}: {answer.isCorrect ? '✓' : '✗'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Your answer: <span className="text-orange-600">{answer.selected}</span>
                    </p>
                    {!answer.isCorrect && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Correct answer: <span>{answer.correct}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={shareScore}
              className="btn-glow bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
            >
              {copied ? "✅ Copied to clipboard!" : "📤 SHARE SCORE"}
            </button>
            <button
              onClick={resetGame}
              className="btn-glow bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Game Over Screen
  if (gameState === 'gameover') {
    const accuracy = answers.length > 0
      ? Math.round((answers.filter((a) => a.isCorrect).length / answers.length) * 100)
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white p-4 md:p-8 flex flex-col items-center justify-center">
        <style>{`
          @keyframes red-glow-fade {
            0% { text-shadow: 0 0 20px rgba(239, 68, 68, 0.3); opacity: 1; }
            100% { text-shadow: 0 0 60px rgba(239, 68, 68, 0.9); opacity: 0.8; }
          }
          .red-glow-fade { animation: red-glow-fade 2s ease-out; }
        `}</style>

        <div className="w-full max-w-2xl animate-fade-in-up text-center">
          {/* Skull Icon */}
          <div className="text-8xl mb-6 red-glow-fade">💀</div>

          {/* Game Over Title */}
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-red-500">GAME OVER</h1>

          {/* Survival Stats */}
          <div className="glass-card mb-8 border border-red-300 bg-red-50">
            <p className="text-gray-600 text-lg mb-2">You survived</p>
            <p className="text-6xl font-bold text-orange-500">{answers.length}</p>
            <p className="text-gray-600 text-lg mt-2">questions</p>
          </div>

          {/* Stats Card */}
          <div className="glass-card mb-8 border border-gray-200">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-gray-600 text-sm">Accuracy</p>
                <p className="text-3xl font-bold text-emerald-600">{accuracy}%</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Best Streak</p>
                <p className="text-3xl font-bold text-orange-500">{streak}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600 text-sm">XP Earned</p>
                <p className="text-3xl font-bold text-emerald-600">+{xpEarned}</p>
              </div>
            </div>
          </div>

          {/* Answer Review Toggle */}
          <button
            onClick={() => setShowAnswerReview(!showAnswerReview)}
            className="w-full mb-6 px-4 py-2 bg-gray-200 border border-gray-300 text-gray-700 rounded-lg hover:border-orange-300 transition-all"
          >
            {showAnswerReview ? '▼ Hide' : '▶ Show'} Answer Review
          </button>

          {/* Answer Review */}
          {showAnswerReview && (
            <div className="glass-card mb-8 border border-gray-200 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {answers.map((answer, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      answer.isCorrect
                        ? 'bg-emerald-100 border-emerald-300'
                        : 'bg-red-100 border-red-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-800">
                      Q{idx + 1}: {answer.isCorrect ? '✓' : '✗'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Your answer: <span className="text-orange-600">{answer.selected}</span>
                    </p>
                    {!answer.isCorrect && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Correct answer: <span>{answer.correct}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={shareScore}
              className="btn-glow bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
            >
              {copied ? "✅ Copied to clipboard!" : "📤 SHARE SCORE"}
            </button>
            <button
              onClick={resetGame}
              className="btn-glow bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
