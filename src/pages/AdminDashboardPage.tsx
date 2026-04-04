import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface RoleCounts {
  students: number;
  teachers: number;
  parents: number;
  admins: number;
  unlinkedStudents: number;
  unlinkedParents: number;
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<RoleCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        let students = 0;
        let teachers = 0;
        let parents = 0;
        let admins = 0;
        let unlinkedStudents = 0;
        let unlinkedParents = 0;

        snap.docs.forEach((doc) => {
          const data = doc.data();
          switch (data.role) {
            case 'student':
              students++;
              if (!data.linkedTeacherUid) unlinkedStudents++;
              break;
            case 'teacher':
              teachers++;
              break;
            case 'parent':
              parents++;
              if (!data.linkedStudentUids || data.linkedStudentUids.length === 0) unlinkedParents++;
              break;
            case 'admin':
              admins++;
              break;
          }
        });

        setCounts({ students, teachers, parents, admins, unlinkedStudents, unlinkedParents });
      } catch (err) {
        console.error('Error fetching user counts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-gray-300 border-t-orange-500" />
      </div>
    );
  }

  const stats = [
    { label: 'Students', value: counts?.students ?? 0, icon: '🎓', color: 'orange' },
    { label: 'Teachers', value: counts?.teachers ?? 0, icon: '👩‍🏫', color: 'blue' },
    { label: 'Parents', value: counts?.parents ?? 0, icon: '👨‍👩‍👧', color: 'emerald' },
    { label: 'Admins', value: counts?.admins ?? 0, icon: '🏫', color: 'purple' },
  ];

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <header className="space-y-2">
        <h1 className="text-gray-900 text-4xl font-black">Admin Dashboard</h1>
        <p className="text-gray-600">Manage your school — assign students, teachers, and parents</p>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card space-y-2 p-6 bg-white border border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{s.icon}</span>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-600">{s.label}</p>
            </div>
            <p className="text-4xl font-black text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {((counts?.unlinkedStudents ?? 0) > 0 || (counts?.unlinkedParents ?? 0) > 0) && (
        <div className="glass-card border-l-4 border-orange-500 p-6 space-y-3 bg-white border-r border-gray-200 border-b border-gray-200">
          <h2 className="text-lg font-bold text-orange-600">Action Required</h2>
          {(counts?.unlinkedStudents ?? 0) > 0 && (
            <p className="text-gray-700">
              <span className="font-bold text-orange-600">{counts?.unlinkedStudents}</span> student(s) not assigned to any teacher
            </p>
          )}
          {(counts?.unlinkedParents ?? 0) > 0 && (
            <p className="text-gray-700">
              <span className="font-bold text-orange-600">{counts?.unlinkedParents}</span> parent(s) not linked to any child
            </p>
          )}
          <Link
            to="/admin/assign"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Go to Assignments →
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/users" className="glass-card-hover group p-6 space-y-3 bg-white border border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👥</span>
            <div>
              <p className="text-lg font-bold text-gray-900">Manage Users</p>
              <p className="text-sm text-gray-600">View all users, promote to admin, manage roles</p>
            </div>
          </div>
          <span className="text-sm font-bold text-orange-600 group-hover:translate-x-1 transition-transform inline-block">
            Open →
          </span>
        </Link>
        <Link to="/admin/assign" className="glass-card-hover group p-6 space-y-3 bg-white border border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔗</span>
            <div>
              <p className="text-lg font-bold text-gray-900">Assignments</p>
              <p className="text-sm text-gray-600">Link students to teachers, parents to children</p>
            </div>
          </div>
          <span className="text-sm font-bold text-orange-600 group-hover:translate-x-1 transition-transform inline-block">
            Open →
          </span>
        </Link>
      </div>
    </div>
  );
}
