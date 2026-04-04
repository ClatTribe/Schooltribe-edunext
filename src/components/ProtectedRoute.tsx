import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" label="Checking authentication..." />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile?.onboardingComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to role-appropriate dashboard
    const roleHome = profile.role === 'admin' ? '/admin' : profile.role === 'teacher' ? '/teacher' : profile.role === 'parent' ? '/parent' : '/dashboard';
    return <Navigate to={roleHome} replace />;
  }

  return <>{children}</>;
}
