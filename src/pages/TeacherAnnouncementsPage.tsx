import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

interface Announcement {
  id: string;
  teacherId: string;
  teacherName: string;
  title: string;
  message: string;
  priority: 'Normal' | 'Important' | 'Urgent';
  target: 'All Students' | 'Selected Students';
  targetStudents?: string[];
  createdAt: Timestamp;
  readBy: string[];
}

interface Template {
  name: string;
  title: string;
  message: string;
  priority: 'Normal' | 'Important' | 'Urgent';
}

const ANNOUNCEMENT_TEMPLATES: Template[] = [
  {
    name: 'Test Tomorrow',
    title: 'Test Tomorrow',
    message: 'A test is scheduled for tomorrow. Please revise all the topics covered in class. Good luck!',
    priority: 'Important',
  },
  {
    name: 'Holiday Notice',
    title: 'Holiday Notice',
    message: 'School will remain closed on the following dates due to holidays. Classes will resume on the notified date.',
    priority: 'Normal',
  },
  {
    name: 'Parent Meeting',
    title: 'Parent-Teacher Meeting Notice',
    message: 'A parent-teacher meeting is scheduled. Parents are requested to attend and discuss their ward\'s progress.',
    priority: 'Important',
  },
  {
    name: 'Assignment Due',
    title: 'Assignment Submission Reminder',
    message: 'Please submit your assignments by the given deadline. Late submissions may attract penalties.',
    priority: 'Urgent',
  },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Urgent':
      return 'text-red-400 bg-red-500/10';
    case 'Important':
      return 'text-amber-400 bg-amber-500/10';
    default:
      return 'text-blue-400 bg-blue-500/10';
  }
};

const getPriorityBadgeColor = (priority: string) => {
  switch (priority) {
    case 'Urgent':
      return 'bg-red-500';
    case 'Important':
      return 'bg-amber-500';
    default:
      return 'bg-blue-500';
  }
};

const getTimeAgo = (timestamp: Timestamp | null | undefined): string => {
  if (!timestamp || typeof timestamp.toDate !== 'function') return 'Just now';
  const now = new Date();
  const date = timestamp.toDate();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
};

export default function TeacherAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'Important' | 'Urgent'>(
    'Normal'
  );
  const [target, setTarget] = useState<'All Students' | 'Selected Students'>(
    'All Students'
  );
  const [targetStudents, setTargetStudents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    fetchAnnouncements();
    // Fetch total student count for read tracking
    getDocs(query(collection(db, 'users'), where('role', '==', 'student')))
      .then((snap) => setTotalStudents(snap.size))
      .catch(() => { /* ignore */ });
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const announcementsRef = collection(db, 'announcements');
      const q = query(announcementsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const data: Announcement[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Announcement);
      });

      setAnnouncements(data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !title.trim() || !message.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const announcementId = `${Date.now()}_${user.uid}`;
      const announcementData: Announcement = {
        id: announcementId,
        teacherId: user.uid,
        teacherName: user.displayName || 'Teacher',
        title,
        message,
        priority,
        target,
        targetStudents: target === 'Selected Students' ? targetStudents : [],
        createdAt: Timestamp.now(),
        readBy: [],
      };

      await setDoc(
        doc(db, 'announcements', announcementId),
        announcementData
      );

      setTitle('');
      setMessage('');
      setPriority('Normal');
      setTarget('All Students');
      setTargetStudents([]);

      await fetchAnnouncements();
    } catch (error) {
      console.error('Error posting announcement:', error);
      alert('Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
      setDeleteConfirm(null);
      await fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement');
    }
  };

  const handleTemplateClick = (template: Template) => {
    setTitle(template.title);
    setMessage(template.message);
    setPriority(template.priority);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Announcement Board
          </h1>
          <p className="text-gray-600">Create and manage class announcements</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Announcement Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Form */}
            <form
              onSubmit={handlePostAnnouncement}
              className="glass-card glass-card-hover p-6 space-y-4 bg-white border border-gray-200"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Create Announcement
              </h2>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter announcement title"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition"
                  required
                />
              </div>

              {/* Message Textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your announcement message..."
                  rows={5}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition resize-none"
                  required
                />
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Priority
                </label>
                <div className="flex gap-3">
                  {(['Normal', 'Important', 'Urgent'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                        priority === p
                          ? getPriorityColor(p) + ' ring-2 ring-offset-2 ring-offset-slate-900'
                          : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Send To
                </label>
                <div className="flex gap-3">
                  {(['All Students', 'Selected Students'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTarget(t)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                        target === t
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500'
                          : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Multi-Select (if Selected Students) */}
              {target === 'Selected Students' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Students
                  </label>
                  <input
                    type="text"
                    placeholder="Enter student IDs (comma-separated)"
                    value={targetStudents.join(', ')}
                    onChange={(e) =>
                      setTargetStudents(
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-glow py-3 rounded-lg font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting...' : 'Post Announcement'}
              </button>
            </form>

            {/* Quick Templates */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Quick Templates
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {ANNOUNCEMENT_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => handleTemplateClick(template)}
                    className="glass-card glass-card-hover p-3 text-left transition hover:bg-amber-500/10 group"
                  >
                    <p className="text-sm font-medium text-amber-400 group-hover:text-amber-300">
                      {template.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {template.message}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Previous Announcements List */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Previous Announcements
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border border-amber-500 border-t-transparent"></div>
                </div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">
                    No announcements yet. Create your first one!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 stagger-children">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="stagger-item glass-card glass-card-hover p-4 flex items-start gap-4"
                    >
                      {/* Priority Badge */}
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-3 h-3 rounded-full ${getPriorityBadgeColor(
                            announcement.priority
                          )}`}
                        ></div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-bold text-white">
                              {announcement.title}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                              {getTimeAgo(announcement.createdAt)}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded ${getPriorityColor(
                                announcement.priority
                              )}`}
                            >
                              {announcement.priority}
                            </span>
                          </div>
                        </div>

                        {/* Message Preview */}
                        <p className="text-slate-300 text-sm line-clamp-2 mb-3">
                          {announcement.message}
                        </p>

                        {/* Read Count & Delete */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            {announcement.readBy?.length ?? 0}/{totalStudents} students read
                          </span>
                          <button
                            onClick={() => setDeleteConfirm(announcement.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Delete Confirmation */}
                      {deleteConfirm === announcement.id && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                          <div className="glass-card p-6 max-w-sm w-full">
                            <h3 className="text-lg font-bold text-white mb-2">
                              Confirm Delete
                            </h3>
                            <p className="text-slate-300 mb-4">
                              Are you sure you want to delete this announcement?
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded-lg transition"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteAnnouncement(announcement.id)
                                }
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
