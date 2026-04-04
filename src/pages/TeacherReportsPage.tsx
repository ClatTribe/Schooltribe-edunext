import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt?: Date;
  // Preview gamification data for student cards
  xp: number;
  level: number;
  streak: number;
  accuracy: number;
}

interface GamificationData {
  userId: string;
  xp: number;
  level: number;
  currentStreak: number;
  totalTests: number;
  accuracy: number;
  videosWatched: number;
}

interface TestAttempt {
  id: string;
  userId: string;
  subject: string;
  chapters: string[];
  score: number;
  totalMarks: number;
  accuracy: number;
  timeSpent: number;
  attemptDate: Date;
}

interface SuddenDeathAttempt {
  userId: string;
  bestStreak: number;
  averageAccuracy: number;
  totalAttempts: number;
}

interface SubjectBreakdown {
  subject: string;
  testsDone: number;
  accuracy: number;
  weakChapters: string[];
  strongChapters: string[];
}

export default function TeacherReportsPage() {
  useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<GamificationData | null>(null);
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [suddenDeathData, setSuddenDeathData] = useState<SuddenDeathAttempt | null>(null);
  const [subjectBreakdown, setSubjectBreakdown] = useState<SubjectBreakdown[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'xp' | 'accuracy' | 'streak'>('name');
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch all students (with role filter + gamification preview)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        // Only fetch students, not teachers/parents
        const usersSnapshot = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'student'))
        );

        const studentProfiles = usersSnapshot.docs.map(d => ({
          id: d.id,
          name: d.data().displayName || d.data().name || 'Unknown',
          email: d.data().email || '',
          avatar: d.data().avatar,
          createdAt: d.data().createdAt?.toDate?.() || new Date(),
        }));

        // Fetch gamification data for preview cards (doc ID = userId)
        const gamSnap = await getDocs(collection(db, 'gamification'));
        const gamMap = new Map<string, Record<string, unknown>>();
        gamSnap.docs.forEach((d) => gamMap.set(d.id, d.data()));

        const studentsList: Student[] = studentProfiles.map((s) => {
          const gam = gamMap.get(s.id);
          return {
            ...s,
            xp: (gam?.xp as number) ?? 0,
            level: (gam?.level as number) ?? 1,
            streak: (gam?.streak as number) ?? (gam?.currentStreak as number) ?? 0,
            accuracy: (gam?.accuracy as number) ?? 0,
          };
        });

        setStudents(studentsList);
        setFilteredStudents(studentsList);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(sortStudents(students, sortBy));
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = students.filter(
        s => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)
      );
      setFilteredStudents(sortStudents(filtered, sortBy));
    }
  }, [searchQuery, students, sortBy]);

  // Fetch detailed student data
  useEffect(() => {
    if (!selectedStudentId) return;

    const fetchStudentDetails = async () => {
      try {
        setLoading(true);

        // Fetch gamification data (doc ID = userId)
        const gamDoc = await getDoc(doc(db, 'gamification', selectedStudentId));
        if (gamDoc.exists()) {
          const data = gamDoc.data();
          setStudentData({
            userId: selectedStudentId,
            xp: data.xp || 0,
            level: data.level || 1,
            currentStreak: data.currentStreak || data.streak || 0,
            totalTests: data.totalTests || 0,
            accuracy: data.accuracy || 0,
            videosWatched: data.videosWatched || 0,
          });
        } else {
          // No gamification data yet — set defaults
          setStudentData({
            userId: selectedStudentId,
            xp: 0,
            level: 1,
            currentStreak: 0,
            totalTests: 0,
            accuracy: 0,
            videosWatched: 0,
          });
        }

        // Fetch test attempts
        const testsSnapshot = await getDocs(
          query(collection(db, 'testAttempts'), where('userId', '==', selectedStudentId))
        );
        const testsList: TestAttempt[] = testsSnapshot.docs.map(doc => ({
          id: doc.id,
          userId: doc.data().userId,
          subject: doc.data().subject || 'Unknown',
          chapters: doc.data().chapters || [],
          score: doc.data().score || 0,
          totalMarks: doc.data().totalMarks || 0,
          accuracy: doc.data().accuracy || 0,
          timeSpent: doc.data().timeSpent || 0,
          attemptDate: doc.data().attemptDate?.toDate?.() || new Date(),
        }));
        setTestAttempts(testsList);

        // Fetch sudden death data
        const sdSnapshot = await getDocs(
          query(collection(db, 'suddenDeathAttempts'), where('userId', '==', selectedStudentId))
        );
        if (!sdSnapshot.empty) {
          const data = sdSnapshot.docs[0].data();
          setSuddenDeathData({
            userId: selectedStudentId,
            bestStreak: data.bestStreak || 0,
            averageAccuracy: data.averageAccuracy || 0,
            totalAttempts: data.totalAttempts || 0,
          });
        }

        // Calculate subject breakdown
        const scienceTests = testsList.filter(t => t.subject.toLowerCase().includes('science'));
        const mathsTests = testsList.filter(t => t.subject.toLowerCase().includes('maths') || t.subject.toLowerCase().includes('math'));

        const breakdown: SubjectBreakdown[] = [
          {
            subject: 'Science',
            testsDone: scienceTests.length,
            accuracy: scienceTests.length > 0
              ? scienceTests.reduce((sum, t) => sum + t.accuracy, 0) / scienceTests.length
              : 0,
            weakChapters: extractChapters(scienceTests, true),
            strongChapters: extractChapters(scienceTests, false),
          },
          {
            subject: 'Maths',
            testsDone: mathsTests.length,
            accuracy: mathsTests.length > 0
              ? mathsTests.reduce((sum, t) => sum + t.accuracy, 0) / mathsTests.length
              : 0,
            weakChapters: extractChapters(mathsTests, true),
            strongChapters: extractChapters(mathsTests, false),
          },
        ];
        setSubjectBreakdown(breakdown);
      } catch (error) {
        console.error('Error fetching student details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [selectedStudentId]);

  const extractChapters = (tests: TestAttempt[], isWeak: boolean) => {
    const chapterAccuracy: { [key: string]: { total: number; count: number } } = {};

    tests.forEach(test => {
      test.chapters.forEach(chapter => {
        if (!chapterAccuracy[chapter]) {
          chapterAccuracy[chapter] = { total: 0, count: 0 };
        }
        chapterAccuracy[chapter].total += test.accuracy;
        chapterAccuracy[chapter].count += 1;
      });
    });

    const sorted = Object.entries(chapterAccuracy)
      .map(([name, data]) => ({
        name,
        avg: data.total / data.count,
      }))
      .sort((a, b) => (isWeak ? a.avg - b.avg : b.avg - a.avg))
      .slice(0, 3)
      .map(c => c.name);

    return sorted;
  };

  const sortStudents = (list: Student[], by: 'name' | 'xp' | 'accuracy' | 'streak') => {
    const sorted = [...list];
    switch (by) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'xp':
        return sorted.sort((a, b) => b.xp - a.xp);
      case 'accuracy':
        return sorted.sort((a, b) => b.accuracy - a.accuracy);
      case 'streak':
        return sorted.sort((a, b) => b.streak - a.streak);
      default:
        return sorted;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (accuracy >= 60) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (accuracy >= 40) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getAccuracyBarColor = (accuracy: number) => {
    if (accuracy >= 80) return 'bg-emerald-500';
    if (accuracy >= 60) return 'bg-amber-500';
    if (accuracy >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const downloadReport = (selectedStudent: Student) => {
    if (!studentData) return;

    const reportText = `
=== VIDYAA STUDENT REPORT ===
Name: ${selectedStudent.name}
Email: ${selectedStudent.email}
Member Since: ${selectedStudent.createdAt?.toLocaleDateString() || 'N/A'}

PERFORMANCE OVERVIEW
====================
Total XP: ${studentData.xp}
Accuracy: ${studentData.accuracy.toFixed(2)}%
Tests Completed: ${studentData.totalTests}
Videos Watched: ${studentData.videosWatched}
Level: ${studentData.level}
Current Streak: ${studentData.currentStreak} days

SUBJECT BREAKDOWN
=================
${subjectBreakdown
  .map(
    sb => `
${sb.subject}:
  Tests Done: ${sb.testsDone}
  Accuracy: ${sb.accuracy.toFixed(2)}%
  Strong Chapters: ${sb.strongChapters.join(', ') || 'N/A'}
  Weak Chapters: ${sb.weakChapters.join(', ') || 'N/A'}
`
  )
  .join('')}

RECENT TEST ATTEMPTS
====================
${testAttempts
  .slice(0, 10)
  .map(
    test =>
      `${test.attemptDate.toLocaleDateString()} | ${test.subject} | Score: ${test.score}/${test.totalMarks} | Accuracy: ${test.accuracy.toFixed(2)}%`
  )
  .join('\n')}

SUDDEN DEATH PERFORMANCE
========================
Best Streak: ${suddenDeathData?.bestStreak || 0}
Average Accuracy: ${suddenDeathData?.averageAccuracy.toFixed(2) || 'N/A'}%
Total Attempts: ${suddenDeathData?.totalAttempts || 0}

Generated on ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedStudent.name.replace(/\s+/g, '_')}_Report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareViaWhatsApp = (selectedStudent: Student) => {
    if (!studentData) return;

    const reportText = `📊 *SchoolTribe Student Report*\n*${selectedStudent.name}*\n\n📈 XP: ${studentData.xp}\n🎯 Accuracy: ${studentData.accuracy.toFixed(2)}%\n📝 Tests: ${studentData.totalTests}\n🎥 Videos: ${studentData.videosWatched}\n⚡ Streak: ${studentData.currentStreak}`;

    const encoded = encodeURIComponent(reportText);
    const whatsappUrl = `https://wa.me/?text=${encoded}`;

    navigator.clipboard.writeText(reportText).then(() => {
      window.open(whatsappUrl, '_blank');
    });
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  if (selectedStudentId && selectedStudent && studentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white p-6 md:p-8">
        <style>{`
          @media print {
            .no-print { display: none; }
            .glass-card { page-break-inside: avoid; }
          }
        `}</style>

        {/* Back Button */}
        <button
          onClick={() => {
            setSelectedStudentId(null);
            setStudentData(null);
            setTestAttempts([]);
            setSuddenDeathData(null);
          }}
          className="no-print mb-6 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-orange-600 transition-all duration-300 flex items-center gap-2"
        >
          ← Back to Students
        </button>

        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
          {/* Student Header Card */}
          <div className="glass-card p-8 bg-white border border-gray-200">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
                  {getInitials(selectedStudent.name)}
                </div>
              </div>
              <div className="flex-grow">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {selectedStudent.name}
                </h1>
                <p className="text-gray-600 mb-1">{selectedStudent.email}</p>
                <p className="text-gray-500 text-sm mb-4">
                  Member since {selectedStudent.createdAt?.toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  <span className="text-xl font-bold text-orange-500">{studentData.currentStreak} day streak</span>
                </div>
              </div>
              <div className="md:text-right">
                <div className="text-4xl font-bold text-orange-500">Level {studentData.level}</div>
                <div className="h-2 w-32 bg-gray-300 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                    style={{ width: `${Math.min((studentData.xp % 1000) / 10, 100)}%` }}
                  />
                </div>
                <p className="text-gray-600 text-sm mt-1">{studentData.xp} XP</p>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-6 bg-white border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">Total XP</p>
              <p className="text-3xl font-bold text-orange-500">{studentData.xp}</p>
            </div>
            <div className="glass-card p-6 bg-white border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">Accuracy</p>
              <p className={`text-3xl font-bold ${getAccuracyBarColor(studentData.accuracy).replace('bg-', 'text-').replace('500', '600')}`}>
                {studentData.accuracy.toFixed(1)}%
              </p>
            </div>
            <div className="glass-card p-6 bg-white border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">Tests Completed</p>
              <p className="text-3xl font-bold text-blue-600">{studentData.totalTests}</p>
            </div>
            <div className="glass-card p-6 bg-white border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">Videos Watched</p>
              <p className="text-3xl font-bold text-purple-600">{studentData.videosWatched}</p>
            </div>
          </div>

          {/* Accuracy Trend Chart */}
          {testAttempts.length > 0 && (
            <div className="glass-card p-6 bg-white border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Accuracy Trend (Last 7 Tests)</h2>
              <div className="flex items-end justify-between h-48 gap-2 px-2 py-4">
                {testAttempts
                  .slice(-7)
                  .map((test) => (
                    <div key={test.id} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-full rounded-t ${getAccuracyBarColor(test.accuracy)}`}
                        style={{ height: `${Math.max(test.accuracy, 10)}%` }}
                        title={`${test.accuracy.toFixed(1)}%`}
                      />
                      <p className="text-xs text-gray-600 mt-2 text-center">
                        {test.attemptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Subject Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjectBreakdown.map(subject => (
              <div key={subject.subject} className="glass-card p-6 bg-white border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{subject.subject}</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Tests Done: {subject.testsDone}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Accuracy: {subject.accuracy.toFixed(1)}%</p>
                    <div className="h-2 w-full bg-gray-300 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getAccuracyBarColor(subject.accuracy)}`}
                        style={{ width: `${subject.accuracy}%` }}
                      />
                    </div>
                  </div>
                  {subject.strongChapters.length > 0 && (
                    <div>
                      <p className="text-emerald-600 text-sm font-semibold">💪 Strong:</p>
                      <p className="text-gray-700 text-sm">{subject.strongChapters.join(', ')}</p>
                    </div>
                  )}
                  {subject.weakChapters.length > 0 && (
                    <div>
                      <p className="text-orange-600 text-sm font-semibold">⚠️ Weak:</p>
                      <p className="text-gray-700 text-sm">{subject.weakChapters.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Test Attempts */}
          {testAttempts.length > 0 && (
            <div className="glass-card p-6 bg-white border border-gray-200 overflow-x-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Test Attempts</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-gray-600 font-semibold">Date</th>
                    <th className="text-left py-3 px-2 text-gray-600 font-semibold">Subject</th>
                    <th className="text-left py-3 px-2 text-gray-600 font-semibold">Chapters</th>
                    <th className="text-left py-3 px-2 text-gray-600 font-semibold">Score</th>
                    <th className="text-left py-3 px-2 text-gray-600 font-semibold">Accuracy</th>
                    <th className="text-left py-3 px-2 text-gray-600 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {testAttempts.slice(0, 10).map(test => (
                    <tr key={test.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-700">
                        {test.attemptDate.toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-gray-700">{test.subject}</td>
                      <td className="py-3 px-2 text-gray-600 text-xs">
                        {test.chapters.slice(0, 2).join(', ')}
                        {test.chapters.length > 2 && ` +${test.chapters.length - 2}`}
                      </td>
                      <td className="py-3 px-2 text-gray-700">
                        {test.score}/{test.totalMarks}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getAccuracyColor(test.accuracy)}`}>
                          {test.accuracy.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-600 text-xs">
                        {Math.round(test.timeSpent / 60)}m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sudden Death Performance */}
          {suddenDeathData && (
            <div className="glass-card p-6 bg-white border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚡ Sudden Death Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-600 text-sm mb-2">Best Streak</p>
                  <p className="text-3xl font-bold text-orange-500">{suddenDeathData.bestStreak}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-2">Avg Accuracy</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {suddenDeathData.averageAccuracy.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-2">Total Attempts</p>
                  <p className="text-3xl font-bold text-purple-600">{suddenDeathData.totalAttempts}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="no-print flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={() => downloadReport(selectedStudent)}
              className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold transition-all duration-300 transform hover:scale-105"
            >
              📥 Download Report
            </button>
            <button
              onClick={() => shareViaWhatsApp(selectedStudent)}
              className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold transition-all duration-300 transform hover:scale-105"
            >
              💬 Share via WhatsApp
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold transition-all duration-300 transform hover:scale-105"
            >
              🖨️ Print Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Student Reports
          </h1>
          <p className="text-gray-600 text-lg">
            Search and view detailed performance reports for students
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 animate-fade-in-up relative" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search student by name... (e.g., Vivek Mishra)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-12 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500">🔍</span>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {searchQuery && filteredStudents.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
              {filteredStudents.slice(0, 8).map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setSearchQuery('');
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 border-b border-gray-200 last:border-b-0 transition-colors duration-200 flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {getInitials(student.name)}
                  </div>
                  <div className="flex-grow">
                    <p className="text-gray-900 font-medium group-hover:text-orange-600 transition-colors">
                      {student.name}
                    </p>
                    <p className="text-gray-500 text-xs">{student.email}</p>
                  </div>
                  <span className="text-gray-500 group-hover:text-orange-600">→</span>
                </button>
              ))}
            </div>
          )}

          {searchQuery && filteredStudents.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-xl p-6 z-50 text-center text-gray-500">
              No students found
            </div>
          )}
        </div>

        {/* Sort Options */}
        <div className="mb-6 flex gap-2 flex-wrap animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <span className="text-gray-600 py-2">Sort by:</span>
          {(['name', 'xp', 'accuracy', 'streak'] as const).map(option => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium capitalize ${
                sortBy === option
                  ? 'bg-orange-100 text-orange-600 border border-orange-300'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-700 border border-gray-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Students Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600 text-lg">Loading students...</div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600 text-lg">No students found</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {filteredStudents.map((student, idx) => (
                <div
                  key={student.id}
                  className="stagger-item glass-card glass-card-hover p-6 bg-white border border-gray-200 rounded-xl cursor-pointer group"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                  onClick={() => setSelectedStudentId(student.id)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      {getInitials(student.name)}
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                        {student.name}
                      </h3>
                      <p className="text-gray-500 text-xs truncate">{student.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">XP</span>
                      <span className="text-orange-500 font-semibold">{student.xp.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Accuracy</span>
                      <span className="text-blue-600 font-semibold">{student.accuracy > 0 ? `${student.accuracy.toFixed(1)}%` : '--'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Streak</span>
                      <span className="text-orange-600 font-semibold">{student.streak > 0 ? `${student.streak} 🔥` : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Level</span>
                      <span className="text-purple-600 font-semibold">{student.level}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button className="w-full px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-lg font-semibold transition-all duration-300 transform group-hover:scale-105">
                      View Report →
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
