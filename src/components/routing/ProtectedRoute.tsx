import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { RootState } from '../../store';
import { getCurrentUser } from '../../store/slices/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'admin' | 'client';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { isAuthenticated, user, token, loading } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const dispatch = useDispatch();

  // Fetch user data if we have token but no user
  useEffect(() => {
    if (token && !user && !loading) {
      dispatch(getCurrentUser() as any);
    }
  }, [dispatch, token, user, loading]);

  // Show loading if we're checking authentication
  if (loading) {
    return <div>Loading...</div>; // Optionally replace with a proper loading component
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a specific role is required and the user doesn't have it
  if (role && user?.role !== role) {
    // Redirect to the appropriate dashboard based on user role
    const redirectPath = user?.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;