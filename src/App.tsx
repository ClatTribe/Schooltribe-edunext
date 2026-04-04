import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import ErrorBoundary from '@/components/ErrorBoundary';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRedirect from '@/components/RoleRedirect';
import { LoadingSpinner } from '@/components/ui';

// Route-level code splitting with React.lazy
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const TestsPage = lazy(() => import('@/pages/TestsPage'));
const VideosPage = lazy(() => import('@/pages/VideosPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const NotesPage = lazy(() => import('@/pages/NotesPage'));
const SuddenDeathPage = lazy(() => import('@/pages/SuddenDeathPage'));
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage'));
const MeriReportPage = lazy(() => import('@/pages/MeriReportPage'));
const AajKaPlanPage = lazy(() => import('@/pages/AajKaPlanPage'));
const TeacherDashboardPage = lazy(() => import('@/pages/TeacherDashboardPage'));
const TeacherCreateTestPage = lazy(() => import('@/pages/TeacherCreateTestPage'));
const TeacherReportsPage = lazy(() => import('@/pages/TeacherReportsPage'));
const TeacherAnnouncementsPage = lazy(() => import('@/pages/TeacherAnnouncementsPage'));
const TeacherAnalyticsPage = lazy(() => import('@/pages/TeacherAnalyticsPage'));
const AdminSeedPage = lazy(() => import('@/pages/AdminSeedPage'));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('@/pages/AdminUsersPage'));
const AdminAssignPage = lazy(() => import('@/pages/AdminAssignPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const ParentDashboardPage = lazy(() => import('@/pages/ParentDashboardPage'));
const DuelsPage = lazy(() => import('@/pages/DuelsPage'));
const MasteryMapPage = lazy(() => import('@/pages/MasteryMapPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner size="lg" label="Loading page..." />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Onboarding — requires auth but no profile check */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* Authenticated routes with layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tests" element={<TestsPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/videos" element={<VideosPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/sudden-death" element={<SuddenDeathPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/meri-report" element={<MeriReportPage />} />
              <Route path="/aaj-ka-plan" element={<AajKaPlanPage />} />
              <Route path="/duels" element={<DuelsPage />} />
              <Route path="/mastery-map" element={<MasteryMapPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/admin/seed"
                element={
                  <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                    <AdminSeedPage />
                  </ProtectedRoute>
                }
              />

              {/* Teacher-only routes */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/create-test"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherCreateTestPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/reports"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/announcements"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherAnnouncementsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/analytics"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherAnalyticsPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin-only routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/assign"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminAssignPage />
                  </ProtectedRoute>
                }
              />

              {/* Parent-only routes */}
              <Route
                path="/parent"
                element={
                  <ProtectedRoute allowedRoles={['parent']}>
                    <ParentDashboardPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all — redirect to role-appropriate dashboard */}
            <Route path="*" element={<RoleRedirect />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
