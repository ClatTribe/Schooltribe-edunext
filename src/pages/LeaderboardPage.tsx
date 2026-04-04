import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  streak: number;
}

export default function LeaderboardPage() {
  const { user, profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all gamification profiles sorted by XP
      const gamSnap = await getDocs(
        query(collection(db, 'gamification'), orderBy('xp', 'desc'), limit(50))
      );

      // Get all user profiles to map userId → displayName
      const usersSnap = await getDocs(collection(db, 'users'));
      const nameMap = new Map<string, string>();
      usersSnap.docs.forEach((d) => {
        const data = d.data();
        nameMap.set(d.id, data.displayName || 'Student');
      });

      // Build leaderboard entries
      const entries: LeaderboardEntry[] = gamSnap.docs.map((d, index) => {
        const data = d.data();
        const uid = d.id;
        return {
          rank: index + 1,
          userId: uid,
          displayName: nameMap.get(uid) || 'Student',
          xp: (data.xp as number) ?? 0,
          level: (data.level as number) ?? 1,
          streak: (data.streak as number) ?? 0,
        };
      });

      setLeaderboard(entries);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError('Failed to load leaderboard. A Firestore index may be required — check browser console for a link to create it.');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-cyan-500'];
    return colors[(name || 'S').charCodeAt(0) % colors.length];
  };

  const getInitials = (name: string) =>
    (name || 'S').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { medal: '👑', ring: 'ring-2 ring-amber-400' };
    if (rank === 2) return { medal: '🥈', ring: 'ring-2 ring-slate-300' };
    if (rank === 3) return { medal: '🥉', ring: 'ring-2 ring-amber-600' };
    return { medal: null, ring: '' };
  };

  const myEntry = leaderboard.find((e) => e.userId === user?.uid);

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      {/* Header */}
      <header className="animate-fade-in-up text-center space-y-2">
        <span className="text-5xl animate-float inline-block">🏆</span>
        <h1 className="text-4xl font-bold text-orange-500">Leaderboard</h1>
        <p className="text-gray-500">See how you stack up against others</p>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
          <p className="mt-4 text-gray-500">Loading leaderboard...</p>
        </div>
      ) : error ? (
        <div className="glass-card text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchLeaderboard} className="text-orange-500 underline text-sm">Try again</button>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-3xl mb-3">🏆</p>
          <p className="text-gray-500">No one on the leaderboard yet. Start earning XP!</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {leaderboard.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
              {[1, 0, 2].map((pos) => {
                const e = leaderboard[pos];
                if (!e) return null;
                const isFirst = pos === 0;
                return (
                  <div key={e.userId} className={`glass-card text-center ${isFirst ? 'border border-orange-200 bg-orange-50 -mt-4' : 'mt-4'}`}>
                    <p className={`mb-2 ${isFirst ? 'text-4xl' : 'text-3xl'}`}>{getRankDisplay(e.rank).medal}</p>
                    <div className={`mx-auto rounded-full flex items-center justify-center text-white font-bold ${getAvatarColor(e.displayName)} ${getRankDisplay(e.rank).ring} ${isFirst ? 'h-14 w-14' : 'h-11 w-11'}`}>
                      {getInitials(e.displayName)}
                    </div>
                    <p className="mt-2 font-semibold text-gray-900 text-sm truncate px-2">{e.displayName}</p>
                    <p className={`font-bold text-orange-500 ${isFirst ? 'text-lg' : ''}`}>{e.xp.toLocaleString()} XP</p>
                    {e.streak > 0 && <p className="text-xs text-orange-600">🔥 {e.streak}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Full List */}
          <div className="glass-card p-0 overflow-hidden">
            {leaderboard.map((entry) => {
              const { medal, ring } = getRankDisplay(entry.rank);
              const isYou = entry.userId === user?.uid;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 px-5 py-3 border-b border-gray-200 transition-colors ${isYou ? 'bg-orange-50' : 'hover:bg-gray-100'}`}
                >
                  <div className="w-8 text-center">
                    {medal ? <span className="text-xl">{medal}</span> : <span className="text-sm font-bold text-gray-500">{entry.rank}</span>}
                  </div>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(entry.displayName)} ${ring}`}>
                    {getInitials(entry.displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{entry.displayName}</p>
                      {isYou && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">YOU</span>}
                    </div>
                    <p className="text-xs text-gray-500">Level {entry.level}</p>
                  </div>
                  {entry.streak > 0 && <span className="text-xs font-medium text-orange-600">🔥{entry.streak}</span>}
                  <span className="font-bold text-orange-500 min-w-[70px] text-right">{entry.xp.toLocaleString()}</span>
                </div>
              );
            })}
          </div>

          {/* Your Rank Footer */}
          {myEntry ? (
            <div className="glass-card border border-orange-200 flex items-center gap-4">
              <span className="text-orange-500 font-bold text-lg">#{myEntry.rank}</span>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${getAvatarColor(myEntry.displayName)}`}>
                {getInitials(myEntry.displayName)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Your Rank</p>
                <p className="text-xs text-gray-500">{myEntry.xp.toLocaleString()} XP • Level {myEntry.level}</p>
              </div>
            </div>
          ) : profile && (
            <div className="glass-card text-center py-6">
              <p className="text-gray-500 text-sm">Complete challenges to appear on the leaderboard!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
