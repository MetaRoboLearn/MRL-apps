import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../hooks/useAuth'
import { useEffect } from 'react'

export const Route = createFileRoute('/admin')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && !['admin', 'teacher'].includes(user.role)) {
      navigate({ to: '/' });
    }
  }, [user, loading, navigate]);

  if (loading) return <div>Loading...</div>;
  if (!user || !['admin', 'teacher'].includes(user.role)) return null;

  return <Outlet />;
}