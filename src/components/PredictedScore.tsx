import { useState, useEffect } from 'react';

export interface PredictedScoreProps {
  scienceAccuracy: number; // 0-100
  mathsAccuracy: number; // 0-100
  totalQuestionsAttempted: number;
  previousScore?: number;
  className?: string;
}

export function PredictedScore(props: PredictedScoreProps) {
  const {
    scienceAccuracy,
    mathsAccuracy,
    totalQuestionsAttempted,
    previousScore,
    className = '',
  } = props;

  const [animatedScore, setAnimatedScore] = useState(0);

  // Calculate predicted score
  const base = (scienceAccuracy + mathsAccuracy) / 2;
  const confidenceFactor = Math.min(1, totalQuestionsAttempted / 100);
  const predicted = Math.max(
    30,
    Math.min(99, Math.round(base * 0.85 + 10))
  );

  // Determine grade
  const getGrade = (score: number): string => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  };

  // Get color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981'; // emerald
    if (score >= 60) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getConfidenceLevel = (): 'Low' | 'Medium' | 'High' => {
    if (confidenceFactor < 0.33) return 'Low';
    if (confidenceFactor < 0.66) return 'Medium';
    return 'High';
  };

  const getTrendArrow = (): string => {
    if (!previousScore) return '→';
    if (predicted > previousScore + 2) return '↑';
    if (predicted < previousScore - 2) return '↓';
    return '→';
  };

  const getTrendText = (): string => {
    if (!previousScore) return 'Stable';
    if (predicted > previousScore + 2) return 'Improving';
    if (predicted < previousScore - 2) return 'Declining';
    return 'Stable';
  };

  const getMotivationalMessage = (): string => {
    if (predicted >= 90) return '🌟 Outstanding! You\'re on fire!';
    if (predicted >= 80) return '🚀 Excellent progress! Keep it up!';
    if (predicted >= 70) return '💪 Good effort! You\'re getting there!';
    if (predicted >= 60) return '📚 Keep practicing to improve!';
    if (predicted >= 50) return '🎯 More practice needed! You can do it!';
    return '⚠️ Focus on fundamentals!';
  };

  // Animate score on mount
  useEffect(() => {
    let current = 0;
    const target = predicted;
    const increment = target / 30;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedScore(target);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [predicted]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className={`glass-card ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gradient mb-2">
          Predicted Board %
        </h3>
        <p className="text-slate-400 text-sm">
          Based on your current performance
        </p>
      </div>

      {/* Circular Progress Ring */}
      <div className="flex justify-center mb-8">
        <div className="relative w-40 h-40 animate-scale-in">
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            className="transform -rotate-90"
          >
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="45"
              fill="none"
              stroke="rgba(71, 85, 105, 0.3)"
              strokeWidth="8"
            />
            {/* Gradient circle (animated) */}
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <circle
              cx="80"
              cy="80"
              r="45"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.5s ease-out',
              }}
            />
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-slate-400 text-sm font-semibold mb-1">
              Predicted Score
            </p>
            <p
              className="text-4xl font-bold transition-colors duration-300"
              style={{ color: getScoreColor(animatedScore) }}
            >
              {animatedScore}%
            </p>
            <p
              className="text-2xl font-bold mt-1 transition-colors duration-300"
              style={{ color: getScoreColor(animatedScore) }}
            >
              {getGrade(animatedScore)}
            </p>
          </div>
        </div>
      </div>

      {/* Motivational Message */}
      <div className="text-center mb-8 p-3 bg-surface-700/50 rounded-lg">
        <p className="text-amber-400 font-semibold text-sm">
          {getMotivationalMessage()}
        </p>
      </div>

      {/* Subject Breakdown Bars */}
      <div className="space-y-5 mb-8">
        {/* Science */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-300 font-semibold flex items-center gap-2">
              <span>🧬</span>
              Science
            </label>
            <span className="text-amber-400 font-bold">
              {Math.round(scienceAccuracy)}%
            </span>
          </div>
          <div className="w-full h-2 bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, scienceAccuracy))}%`,
              }}
            />
          </div>
        </div>

        {/* Maths */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-300 font-semibold flex items-center gap-2">
              <span>📐</span>
              Mathematics
            </label>
            <span className="text-amber-400 font-bold">
              {Math.round(mathsAccuracy)}%
            </span>
          </div>
          <div className="w-full h-2 bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, mathsAccuracy))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Confidence Indicator */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface-700/50 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-xs font-semibold mb-1 uppercase">
            Confidence
          </p>
          <div className="flex items-center justify-center gap-2">
            <span
              className={`w-3 h-3 rounded-full live-dot ${
                getConfidenceLevel() === 'High'
                  ? 'bg-green-500'
                  : getConfidenceLevel() === 'Medium'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
            />
            <p className="text-white font-bold">
              {getConfidenceLevel()} ({Math.round(confidenceFactor * 100)}%)
            </p>
          </div>
          <p className="text-slate-400 text-xs mt-2">
            {totalQuestionsAttempted} questions attempted
          </p>
        </div>

        {/* Trend Indicator */}
        <div className="bg-surface-700/50 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-xs font-semibold mb-1 uppercase">
            Trend
          </p>
          <div className="flex items-center justify-center gap-2">
            <span
              className={`text-2xl transition-transform ${
                getTrendArrow() === '↑'
                  ? 'text-green-500'
                  : getTrendArrow() === '↓'
                    ? 'text-red-500'
                    : 'text-amber-500'
              }`}
            >
              {getTrendArrow()}
            </span>
            <p className="text-white font-bold">{getTrendText()}</p>
          </div>
          {previousScore && (
            <p className="text-slate-400 text-xs mt-2">
              vs {previousScore}% before
            </p>
          )}
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
        <p className="text-amber-400 font-semibold text-sm">
          📈 Keep practicing to improve your predicted score!
        </p>
      </div>
    </div>
  );
}
