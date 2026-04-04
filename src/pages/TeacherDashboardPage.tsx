import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface StudentRow {
  uid: string;
  name: string;
  xp: number;
  level: number;
  streak: number;
  accuracy: number;
  testsCompleted: number;
  lastActive: string;
}

export default function TeacherDashboardPage() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'xp' | 'accuracy' | 'streak' | 'tests'>('xp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const teacherName = profile?.displayName || 'Teacher';
  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Fetch all students from Firestore
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        // Get all student user profiles
        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'student'))
        );

        const studentProfiles = usersSnap.docs.map((d) => ({
          uid: d.id,
          name: d.data().displayName || 'Unknown',
        }));

        // Get gamification data for each student
        const gamSnap = await getDocs(collection(db, 'gamification'));
        const gamMap = new Map<string, Record<string, unknown>>();
        gamSnap.docs.forEach((d) => gamMap.set(d.id, d.data()));

        const rows: StudentRow[] = studentProfiles.map((s) => {
          const gam = gamMap.get(s.uid);
          return {
            uid: s.uid,
            name: s.name,
            xp: (gam?.xp as number) ?? 0,
            level: (gam?.level as number) ?? 1,
            streak: (gam?.streak as number) ?? 0,
            accuracy: (gam?.accuracy as number) ?? 0,
            testsCompleted: (gam?.testsCompleted as number) ?? 0,
            lastActive: (gam?.lastActiveDate as string) ?? '—',
          };
        });

        setStudents(rows);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // Sort students
  const sorted = [...students].sort((a, b) => {
    const aVal = a[sortBy === 'tests' ? 'testsCompleted' : sortBy];
    const bVal = b[sortBy === 'tests' ? 'testsCompleted' : sortBy];
    return sortDir === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  });

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  // Computed stats
  const totalStudents = students.length;
  const avgAccuracy = totalStudents > 0
    ? Math.round(students.reduce((s, st) => s + st.accuracy, 0) / totalStudents)
    : 0;
  const totalTests = students.reduce((s, st) => s + st.testsCompleted, 0);
  const activeToday = students.filter((s) => s.lastActive === new Date().toISOString().split('T')[0]).length;

  const getAccuracyColor = (acc: number) => {
    if (acc >= 80) return 'text-emerald-400';
    if (acc >= 60) return 'text-amber-400';
    if (acc >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getAccuracyBg = (acc: number) => {
    if (acc >= 80) return 'bg-emerald-500';
    if (acc >= 60) return 'bg-amber-500';
    if (acc >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    <span className="ml-1 text-xs">
      {sortBy === col ? (sortDir === 'desc' ? '▼' : '▲') : ''}
    </span>
  );

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      {/* Header */}
      <header className="animate-fade-in-up space-y-3">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Welcome back 👋</p>
            <h1 className="text-gray-900 font-black text-4xl sm:text-5xl">{teacherName}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">{todayDate}</p>
            <p className="text-sm font-semibold text-orange-600">Teacher Dashboard</p>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="stagger-children grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="stagger-item animate-fade-in-up glass-card tilt-hover space-y-1 bg-white border border-gray-200">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-700">Students</p>
          <p className="text-4xl font-black text-orange-600">{totalStudents}</p>
          <p className="text-xs text-gray-600">Enrolled</p>
        </div>
        <div className="stagger-item animate-fade-in-up glass-card tilt-hover space-y-1 bg-white border border-gray-200">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Avg Accuracy</p>
          <p className={`text-4xl font-black ${getAccuracyColor(avgAccuracy)}`}>{avgAccuracy}%</p>
          <p className="text-xs text-gray-600">Class average</p>
        </div>
        <div className="stagger-item animate-fade-in-up glass-card tilt-hover space-y-1 bg-white border border-gray-200">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Total Tests</p>
          <p className="text-4xl font-black text-blue-600">{totalTests}</p>
          <p className="text-xs text-gray-600">Across all students</p>
        </div>
        <div className="stagger-item animate-fade-in-up glass-card tilt-hover space-y-1 bg-white border border-gray-200">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-green-700">Active Today</p>
            <span className="live-dot" />
          </div>
          <p className="text-4xl font-black text-green-600">{activeToday}</p>
          <p className="text-xs text-gray-600">Students online</p>
        </div>
      </div>

      {/* Student Performance Table */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">👨‍🎓 Student Performance</h2>
          <p className="text-xs text-gray-600">{totalStudents} students</p>
        </div>

        {loading ? (
          <div className="glass-card flex items-center justify-center py-16 bg-white border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
              <p className="text-gray-600">Loading students...</p>
            </div>
          </div>
        ) : totalStudents === 0 ? (
          <div className="glass-card py-16 text-center bg-white border border-gray-200">
            <p className="text-3xl mb-3">👨‍🎓</p>
            <p className="text-gray-600 text-lg mb-2">No students enrolled yet</p>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Students will appear here once they sign up. Go to <Link to="/admin/seed" className="text-orange-600 underline">/admin/seed</Link> to populate demo data.
            </p>
          </div>
        ) : (
          <div className="glass-card p-0 overflow-hidden bg-white border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Student</th>
                    <th
                      className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-orange-600 transition-colors"
                      onClick={() => handleSort('xp')}
                    >
                      XP <SortIcon col="xp" />
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-orange-600 transition-colors"
                      onClick={() => handleSort('accuracy')}
                    >
                      Accuracy <SortIcon col="accuracy" />
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-orange-600 transition-colors"
                      onClick={() => handleSort('streak')}
                    >
                      Streak <SortIcon col="streak" />
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-orange-600 transition-colors"
                      onClick={() => handleSort('tests')}
                    >
                      Tests <SortIcon col="tests" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s, i) => (
                    <tr
                      key={s.uid}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-600 font-medium">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-500 text-xs font-bold text-white">
                            {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-500">Level {s.level}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600">{s.xp.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-gray-300 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getAccuracyBg(s.accuracy)}`}
                              style={{ width: `${s.accuracy}%` }}
                            />
                          </div>
                          <span className={`font-bold ${getAccuracyColor(s.accuracy)}`}>{s.accuracy}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-orange-600">
                          {s.streak > 0 ? `🔥 ${s.streak}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">{s.testsCompleted}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600">{s.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* At-Risk Students Alert */}
      {students.filter((s) => s.accuracy < 50 || s.streak === 0).length > 0 && (
        <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <h2 className="text-lg font-bold text-red-600">⚠️ Students Needing Attention</h2>
          <div className="stagger-children grid gap-3 sm:grid-cols-2">
            {students
              .filter((s) => s.accuracy < 50 || s.streak === 0)
              .sort((a, b) => a.accuracy - b.accuracy)
              .map((s) => (
                <Link key={s.uid} to="/teacher/reports" className="stagger-item animate-fade-in-up">
                  <div className="flex items-center gap-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 transition-all hover:bg-red-100 hover:border-red-400">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-200 text-sm font-bold text-red-700">
                      {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                      <div className="flex gap-3 text-xs">
                        {s.accuracy < 50 && <span className="text-red-600">Accuracy: {s.accuracy}%</span>}
                        {s.streak === 0 && <span className="text-orange-600">Inactive streak</span>}
                        {s.testsCompleted < 5 && <span className="text-orange-600">Only {s.testsCompleted} tests</span>}
                      </div>
                    </div>
                    <span className="text-xs text-red-600">View →</span>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* Teacher Tools */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <h2 className="text-lg font-bold text-gray-900">🛠️ Teacher Tools</h2>
        <div className="stagger-children grid gap-4 sm:grid-cols-2">
          {[
            { icon: '📝', title: 'Create Test', sub: 'Generate & assign to students', to: '/teacher/create-test', color: 'from-amber-500/30 to-amber-600/10 ring-amber-500/20' },
            { icon: '📊', title: 'Student Reports', sub: 'Search & download reports', to: '/teacher/reports', color: 'from-purple-500/30 to-purple-600/10 ring-purple-500/20' },
            { icon: '📢', title: 'Announcements', sub: 'Post class announcements', to: '/teacher/announcements', color: 'from-blue-500/30 to-blue-600/10 ring-blue-500/20' },
            { icon: '🏆', title: 'Leaderboard', sub: 'Class XP rankings', to: '/leaderboard', color: 'from-emerald-500/30 to-emerald-600/10 ring-emerald-500/20' },
          ].map((tool) => (
            <Link key={tool.title} to={tool.to} className="stagger-item animate-fade-in-up group">
              <div className="glass-card-hover tilt-hover space-y-3 p-5">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.color} text-xl ring-1`}>
                  {tool.icon}
                </div>
                <div>
                  <p className="font-bold text-white">{tool.title}</p>
                  <p className="text-sm text-slate-400">{tool.sub}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-amber-400 transition-transform group-hover:translate-x-1">
                  Open →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
