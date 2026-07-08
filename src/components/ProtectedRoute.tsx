import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PendingActivation from '../pages/PendingActivation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (profile.status === 'pending') {
    return <PendingActivation />;
  }

  if (superAdminOnly && profile.role !== 'superadmin') {
    return <Navigate to="/pos" replace />;
  }

  if (adminOnly && profile.role !== 'admin' && profile.role !== 'superadmin') {
    return <Navigate to="/pos" replace />;
  }
  
  // Sellers should only access POS and Customers. If they try to access anything else, redirect to POS.
  if (profile.role === 'seller' && location.pathname !== '/pos' && location.pathname !== '/customers') {
    return <Navigate to="/pos" replace />;
  }

  return <>{children}</>;
}
