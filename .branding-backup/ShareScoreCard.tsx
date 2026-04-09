import { useState } from 'react';

export interface ShareScoreProps {
  userName: string;
  xp: number;
  level: number;
  streak: number;
  accuracy?: number;
  rank?: number;
  mode?: string; // 'sudden-death' | 'daily' | 'general'
  questionsAnswered?: number;
  onClose: () => void;
}

export function ShareScoreCard(props: ShareScoreProps) {
  const {
    userName,
    xp,
    level,
    streak,
    accuracy = 0,
    rank,
    mode = 'general',
    questionsAnswered = 0,
    onClose,
  } = props;

  const [copyNotification, setCopyNotification] = useState(false);

  const shareText = `🔥 Vidyaa Score Update!

📊 XP: ${xp} | Level: ${level}
🎯 Accuracy: ${accuracy}%
⚡ Streak: ${streak} days

Can you beat my score? 💪
Play now: https://vidyaa-rho.vercel.app
#Vidyaa #CBSE #Class10`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyNotification(true);
      setTimeout(() => setCopyNotification(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareWhatsApp = () => {
    const encodedText = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handleShareTwitter = () => {
    const encodedText = encodeURIComponent(shareText);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodedText}`,
      '_blank'
    );
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in-up"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in">
        <div className="w-full max-w-md bg-gradient-to-br from-surface-800 to-surface-900 rounded-2xl overflow-hidden">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-surface-700/50 hover:bg-surface-600 flex items-center justify-center text-slate-300 hover:text-white transition-all duration-200"
          >
            ✕
          </button>

          <div className="glass-card">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl">📊</span>
                <h2 className="text-2xl font-bold text-gradient">
                  Vidyaa Score
                </h2>
              </div>
              <p className="text-slate-400 text-sm">
                Share your achievement with friends
              </p>
            </div>

            {/* Shareable Card Preview */}
            <div className="bg-gradient-to-br from-surface-700 to-surface-900 rounded-xl p-6 mb-6 border border-surface-600">
              {/* Vidyaa Branding */}
              <div className="flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-gradient">Vidyaa</span>
                <span className="text-amber-400 ml-2">✨</span>
              </div>

              {/* Stats Grid */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-slate-400 text-sm">XP</p>
                    <p className="text-amber-400 font-bold text-2xl">
                      {xp.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">Level</p>
                    <p className="text-amber-400 font-bold text-2xl">{level}</p>
                  </div>
                </div>

                {accuracy > 0 && (
                  <div>
                    <p className="text-slate-400 text-sm">🎯 Accuracy</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-amber-400 font-bold text-2xl">
                        {accuracy}%
                      </p>
                      <p className="text-slate-500 text-xs">
                        ({questionsAnswered} questions)
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-slate-400 text-sm">🔥 Streak</p>
                  <p className="text-amber-400 font-bold text-2xl">
                    {streak} days
                  </p>
                </div>

                {rank && (
                  <div>
                    <p className="text-slate-400 text-sm">Global Rank</p>
                    <p className="text-amber-400 font-bold text-2xl">
                      #{rank}
                    </p>
                  </div>
                )}
              </div>

              {/* Player Info */}
              <div className="text-center pt-4 border-t border-surface-600">
                <p className="text-white font-semibold">{userName}</p>
                <p className="text-slate-400 text-sm">
                  {mode === 'sudden-death' && '⚡ Sudden Death Mode'}
                  {mode === 'daily' && '📅 Daily Challenge'}
                  {mode === 'general' && '🎓 General Test'}
                </p>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleCopyText}
                className="w-full px-4 py-3 bg-surface-700 hover:bg-surface-600 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                <span className="group-hover:scale-110 transition-transform">
                  📋
                </span>
                Copy Text
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShareWhatsApp}
                  className="px-4 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-600/50 rounded-lg font-semibold text-green-400 transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  <span className="group-hover:scale-110 transition-transform">
                    📱
                  </span>
                  WhatsApp
                </button>

                <button
                  onClick={handleShareTwitter}
                  className="px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 rounded-lg font-semibold text-blue-400 transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  <span className="group-hover:scale-110 transition-transform">
                    🐦
                  </span>
                  Twitter
                </button>
              </div>
            </div>

            {/* Copy Notification */}
            {copyNotification && (
              <div className="mt-4 p-3 bg-green-600/20 border border-green-600/50 rounded-lg text-green-400 text-center font-semibold animate-fade-in-up">
                ✓ Copied to clipboard!
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
