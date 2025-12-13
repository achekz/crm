import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { loadUserFromStorage } from '../../store/slices/authSlice';

import ProtectedRoute from './ProtectedRoute';
import LoadingFallback from './LoadingFallback';

// Lazy load components
const LoginPage = lazy(() => import('../auth/LoginPage'));
const VitrinePage = lazy(() => import('../VitrinePage'));
const AdminLayout = lazy(() => import('../layout/AdminLayout'));
const ClientLayout = lazy(() => import('../layout/ClientLayout'));

const AppRouter: React.FC = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Route publique pour la vitrine */}
        <Route path="/" element={<VitrinePage />} />
        
        {/* Route publique pour la connexion */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate 
                to={user?.role === 'admin' ? '/admin/dashboard' : '/client/dashboard'} 
                replace 
              />
            ) : (
              <LoginPage />
            )
          } 
        />

        {/* Routes protégées pour l'administration */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        />

        {/* Routes protégées pour les clients */}
        <Route
          path="/client/*"
          element={
            <ProtectedRoute role="client">
              <ClientLayout />
            </ProtectedRoute>
          }
        />

        {/* Redirection par défaut pour les utilisateurs authentifiés */}
        <Route
          path="*"
          element={
            isAuthenticated ? (
              <Navigate 
                to={user?.role === 'admin' ? '/admin/dashboard' : '/client/dashboard'} 
                replace 
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;