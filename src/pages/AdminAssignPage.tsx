import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, doc, writeBatch,
} from 'firebase/firestore';

interface UserEntry {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  linkedTeacherUid?: string;
  linkedStudentUids?: string[];
  linkedParentUids?: string[];
  assignedStudentUids?: string[];
}

type Tab = 'student-teacher' | 'parent-child';

export default function AdminAssignPage() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [tab, setTab] = useState<Tab>('student-teacher');

  // Student-Teacher assignment state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');

  // Parent-Child linking state
  const [selectedParent, setSelectedParent] = useState('');
  const [childEmail, setChildEmail] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const entries: UserEntry[] = snap.docs.map((d) => ({
          uid: d.id,
          displayName: d.data().displayName || d.data().name || 'Unknown',
          email: d.data().email || '',
          role: d.data().role || 'student',
          linkedTeacherUid: d.data().linkedTeacherUid,
          linkedStudentUids: d.data().linkedStudentUids,
          linkedParentUids: d.data().linkedParentUids,
          assignedStudentUids: d.data().assignedStudentUids,
        }));
        setUsers(entries);
      } catch (err) {
        console.error('Error fetching users:', err);
        setErrorMsg('Failed to load users.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const students = users.filter((u) => u.role === 'student');
  const teachers = users.filter((u) => u.role === 'teacher');
  const parents = users.filter((u) => u.role === 'parent');

  function flash(msg: string, type: 'success' | 'error') {
    if (type === 'success') {
      setSuccessMsg(msg);
      setErrorMsg('');
    } else {
      setErrorMsg(msg);
      setSuccessMsg('');
    }
    setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 4000);
  }

  // ===== Assign student to teacher =====
  async function handleAssignStudentTeacher() {
    if (!selectedStudent || !selectedTeacher) {
      flash('Please select both a student and a teacher.', 'error');
      return;
    }
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const studentRef = doc(db, 'users', selectedStudent);
      const teacherRef = doc(db, 'users', selectedTeacher);

      // Update student's linkedTeacherUid
      batch.update(studentRef, { linkedTeacherUid: selectedTeacher });

      // Add student to teacher's assignedStudentUids (deduplicated)
      const teacher = users.find((u) => u.uid === selectedTeacher);
      const existingAssigned = teacher?.assignedStudentUids || [];
      if (!existingAssigned.includes(selectedStudent)) {
        batch.update(teacherRef, {
          assignedStudentUids: [...existingAssigned, selectedStudent],
        });
      }

      await batch.commit();

      // Update local state
      setUsers((prev) =>
        prev.map((u) => {
          if (u.uid === selectedStudent) return { ...u, linkedTeacherUid: selectedTeacher };
          if (u.uid === selectedTeacher) {
            const updated = [...(u.assignedStudentUids || [])];
            if (!updated.includes(selectedStudent)) updated.push(selectedStudent);
            return { ...u, assignedStudentUids: updated };
          }
          return u;
        })
      );

      const studentName = users.find((u) => u.uid === selectedStudent)?.displayName || '';
      const teacherName = users.find((u) => u.uid === selectedTeacher)?.displayName || '';
      flash(`Assigned ${studentName} to ${teacherName}`, 'success');
      setSelectedStudent('');
      setSelectedTeacher('');
    } catch (err) {
      console.error('Error assigning student to teacher:', err);
      flash('Failed to assign. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ===== Link parent to child by Gmail =====
  async function handleLinkParentChild() {
    if (!selectedParent || !childEmail.trim()) {
      flash('Please select a parent and enter the child\'s Gmail.', 'error');
      return;
    }

    const normalizedEmail = childEmail.trim().toLowerCase();
    const child = students.find((s) => s.email?.toLowerCase() === normalizedEmail);

    if (!child) {
      flash(`No student found with email "${normalizedEmail}". Make sure the student has signed up first.`, 'error');
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      const parentRef = doc(db, 'users', selectedParent);
      const childRef = doc(db, 'users', child.uid);

      // Add child to parent's linkedStudentUids
      const parent = users.find((u) => u.uid === selectedParent);
      const existingChildren = parent?.linkedStudentUids || [];
      if (existingChildren.includes(child.uid)) {
        flash(`${child.displayName} is already linked to this parent.`, 'error');
        setSaving(false);
        return;
      }
      batch.update(parentRef, {
        linkedStudentUids: [...existingChildren, child.uid],
      });

      // Add parent to child's linkedParentUids
      const existingParents = child.linkedParentUids || [];
      if (!existingParents.includes(selectedParent)) {
        batch.update(childRef, {
          linkedParentUids: [...existingParents, selectedParent],
        });
      }

      await batch.commit();

      // Update local state
      setUsers((prev) =>
        prev.map((u) => {
          if (u.uid === selectedParent) {
            return { ...u, linkedStudentUids: [...(u.linkedStudentUids || []), child.uid] };
          }
          if (u.uid === child.uid) {
            return { ...u, linkedParentUids: [...(u.linkedParentUids || []), selectedParent] };
          }
          return u;
        })
      );

      const parentName = users.find((u) => u.uid === selectedParent)?.displayName || '';
      flash(`Linked ${parentName} → ${child.displayName} (${normalizedEmail})`, 'success');
      setSelectedParent('');
      setChildEmail('');
    } catch (err) {
      console.error('Error linking parent to child:', err);
      flash('Failed to link. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ===== Unlink helpers =====
  async function handleUnlinkStudentTeacher(studentUid: string) {
    setSaving(true);
    try {
      const student = users.find((u) => u.uid === studentUid);
      if (!student?.linkedTeacherUid) return;
      const teacherUid = student.linkedTeacherUid;

      const batch = writeBatch(db);
      batch.update(doc(db, 'users', studentUid), { linkedTeacherUid: '' });

      const teacher = users.find((u) => u.uid === teacherUid);
      if (teacher) {
        batch.update(doc(db, 'users', teacherUid), {
          assignedStudentUids: (teacher.assignedStudentUids || []).filter((id) => id !== studentUid),
        });
      }

      await batch.commit();
      setUsers((prev) =>
        prev.map((u) => {
          if (u.uid === studentUid) return { ...u, linkedTeacherUid: '' };
          if (u.uid === teacherUid) return { ...u, assignedStudentUids: (u.assignedStudentUids || []).filter((id) => id !== studentUid) };
          return u;
        })
      );
      flash(`Unlinked ${student.displayName} from teacher`, 'success');
    } catch (err) {
      console.error('Unlink error:', err);
      flash('Failed to unlink.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlinkParentChild(parentUid: string, childUid: string) {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const parentUser = users.find((u) => u.uid === parentUid);
      const childUser = users.find((u) => u.uid === childUid);

      batch.update(doc(db, 'users', parentUid), {
        linkedStudentUids: (parentUser?.linkedStudentUids || []).filter((id) => id !== childUid),
      });
      batch.update(doc(db, 'users', childUid), {
        linkedParentUids: (childUser?.linkedParentUids || []).filter((id) => id !== parentUid),
      });

      await batch.commit();
      setUsers((prev) =>
        prev.map((u) => {
          if (u.uid === parentUid) return { ...u, linkedStudentUids: (u.linkedStudentUids || []).filter((id) => id !== childUid) };
          if (u.uid === childUid) return { ...u, linkedParentUids: (u.linkedParentUids || []).filter((id) => id !== parentUid) };
          return u;
        })
      );
      flash(`Unlinked parent from child`, 'success');
    } catch (err) {
      console.error('Unlink error:', err);
      flash('Failed to unlink.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-gray-300 border-t-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <header className="space-y-2">
        <h1 className="text-gray-900 text-3xl font-black">Assignments</h1>
        <p className="text-gray-600">Link students to teachers and parents to children</p>
      </header>

      {/* Flash messages */}
      {successMsg && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('student-teacher')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            tab === 'student-teacher'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:text-gray-700'
          }`}
        >
          Student → Teacher
        </button>
        <button
          onClick={() => setTab('parent-child')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            tab === 'parent-child'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:text-gray-700'
          }`}
        >
          Parent → Child
        </button>
      </div>

      {/* ===== Student-Teacher Tab ===== */}
      {tab === 'student-teacher' && (
        <div className="space-y-6">
          {/* Assignment Form */}
          <div className="glass-card p-6 space-y-4 bg-white border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Assign Student to Teacher</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-600">Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Select a student...</option>
                  {students.map((s) => (
                    <option key={s.uid} value={s.uid}>
                      {s.displayName} ({s.email || 'no email'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-600">Teacher</label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Select a teacher...</option>
                  {teachers.map((t) => (
                    <option key={t.uid} value={t.uid}>
                      {t.displayName} ({t.email || 'no email'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleAssignStudentTeacher}
              disabled={saving || !selectedStudent || !selectedTeacher}
              className="rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
            >
              {saving ? 'Assigning...' : 'Assign'}
            </button>
          </div>

          {/* Current Assignments Table */}
          <div className="glass-card p-6 space-y-4 bg-white border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Current Student-Teacher Assignments</h2>
            {students.length === 0 ? (
              <p className="text-gray-500">No students registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-bold uppercase tracking-widest text-gray-600">
                      <th className="py-3 pr-4">Student</th>
                      <th className="py-3 pr-4">Email</th>
                      <th className="py-3 pr-4">Assigned Teacher</th>
                      <th className="py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const teacher = s.linkedTeacherUid
                        ? users.find((u) => u.uid === s.linkedTeacherUid)
                        : null;
                      return (
                        <tr key={s.uid} className="border-b border-gray-200">
                          <td className="py-3 pr-4 font-medium text-gray-900">{s.displayName}</td>
                          <td className="py-3 pr-4 text-gray-500">{s.email || '—'}</td>
                          <td className="py-3 pr-4">
                            {teacher ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 border border-blue-300 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                {teacher.displayName}
                              </span>
                            ) : (
                              <span className="text-xs text-orange-600">Not assigned</span>
                            )}
                          </td>
                          <td className="py-3">
                            {teacher && (
                              <button
                                onClick={() => handleUnlinkStudentTeacher(s.uid)}
                                disabled={saving}
                                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                              >
                                Unlink
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Parent-Child Tab ===== */}
      {tab === 'parent-child' && (
        <div className="space-y-6">
          {/* Linking Form */}
          <div className="glass-card p-6 space-y-4 bg-white border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Link Parent to Child</h2>
            <p className="text-sm text-gray-600">Enter the child's Gmail ID to find and link them to a parent.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-600">Parent</label>
                <select
                  value={selectedParent}
                  onChange={(e) => setSelectedParent(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Select a parent...</option>
                  {parents.map((p) => (
                    <option key={p.uid} value={p.uid}>
                      {p.displayName} ({p.email || 'no email'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-600">Child's Gmail</label>
                <input
                  type="email"
                  value={childEmail}
                  onChange={(e) => setChildEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleLinkParentChild}
              disabled={saving || !selectedParent || !childEmail.trim()}
              className="rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
            >
              {saving ? 'Linking...' : 'Link Parent to Child'}
            </button>
          </div>

          {/* Current Links Table */}
          <div className="glass-card p-6 space-y-4 bg-white border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Current Parent-Child Links</h2>
            {parents.length === 0 ? (
              <p className="text-gray-500">No parents registered yet.</p>
            ) : (
              <div className="space-y-4">
                {parents.map((p) => {
                  const children = (p.linkedStudentUids || [])
                    .map((cid) => users.find((u) => u.uid === cid))
                    .filter(Boolean) as UserEntry[];

                  return (
                    <div key={p.uid} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">👨‍👩‍👧</span>
                        <div>
                          <p className="font-semibold text-gray-900">{p.displayName}</p>
                          <p className="text-xs text-gray-500">{p.email || 'no email'}</p>
                        </div>
                      </div>
                      {children.length === 0 ? (
                        <p className="text-xs text-orange-600 ml-9">No children linked</p>
                      ) : (
                        <div className="ml-9 space-y-2">
                          {children.map((child) => (
                            <div key={child.uid} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-gray-200">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">🎓</span>
                                <span className="text-sm font-medium text-gray-900">{child.displayName}</span>
                                <span className="text-xs text-gray-500">({child.email})</span>
                              </div>
                              <button
                                onClick={() => handleUnlinkParentChild(p.uid, child.uid)}
                                disabled={saving}
                                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                              >
                                Unlink
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
