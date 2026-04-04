import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui';

/**
 * Redirects to the appropriate dashboard based on user role.
 * Students → /dashboard
 * Teachers → /teacher
 * Parents → /parent
 */
export default function RoleRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" label="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (profile?.role === 'teacher') {
    return <Navigate to="/teacher" replace />;
  }

  if (profile?.role === 'parent') {
    return <Navigate to="/parent" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
