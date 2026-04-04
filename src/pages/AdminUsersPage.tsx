import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import type { UserRole } from '@/types';

interface UserEntry {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  board?: string;
  class?: number;
  createdAt?: { seconds: number } | null;
}

const ROLE_BADGES: Record<string, { label: string; color: string; icon: string }> = {
  student: { label: 'Student', color: 'amber', icon: '🎓' },
  teacher: { label: 'Teacher', color: 'blue', icon: '👩‍🏫' },
  parent: { label: 'Parent', color: 'emerald', icon: '👨‍👩‍👧' },
  admin: { label: 'Admin', color: 'purple', icon: '🏫' },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const entries: UserEntry[] = snap.docs.map((d) => ({
          uid: d.id,
          displayName: d.data().displayName || d.data().name || 'Unknown',
          email: d.data().email || '',
          role: d.data().role || 'student',
          board: d.data().board,
          class: d.data().class,
          createdAt: d.data().createdAt,
        }));
        setUsers(entries.sort((a, b) => a.displayName.localeCompare(b.displayName)));
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  async function changeRole(uid: string, newRole: UserRole) {
    setSaving(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
      const userName = users.find((u) => u.uid === uid)?.displayName || '';
      setSuccessMsg(`${userName} is now ${newRole}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error changing role:', err);
    } finally {
      setSaving(null);
    }
  }

  const filtered = users.filter((u) => {
    if (filter !== 'all' && u.role !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-gray-300 border-t-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <header className="space-y-2">
        <h1 className="text-gray-900 text-3xl font-black">Manage Users</h1>
        <p className="text-gray-600">{users.length} total users — search, filter, and manage roles</p>
      </header>

      {successMsg && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none"
        />
        <div className="flex gap-2 flex-wrap">
          {['all', 'student', 'teacher', 'parent', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                filter === r
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-700 border border-gray-300'
              }`}
            >
              {r === 'all' ? 'All' : ROLE_BADGES[r]?.label || r}
              {r !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({users.filter((u) => u.role === r).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass-card p-8 text-center text-gray-500">
            No users found matching your criteria.
          </div>
        ) : (
          filtered.map((u) => {
            const badge = ROLE_BADGES[u.role] || ROLE_BADGES.student;
            return (
              <div key={u.uid} className="glass-card flex items-center gap-4 p-4 bg-white border border-gray-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg">
                  {badge.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{u.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email || 'no email'}</p>
                </div>
                <span className={`hidden sm:inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  u.role === 'admin' ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : u.role === 'teacher' ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : u.role === 'parent' ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'bg-orange-100 border-orange-300 text-orange-700'
                }`}>
                  {badge.label}
                </span>
                {u.board && (
                  <span className="hidden lg:inline text-xs text-gray-500">
                    {u.board} {u.class ? `Class ${u.class}` : ''}
                  </span>
                )}
                <div className="flex-shrink-0">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.uid, e.target.value as UserRole)}
                    disabled={saving === u.uid}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-orange-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
