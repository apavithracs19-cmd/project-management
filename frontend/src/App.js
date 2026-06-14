import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Topbar from './components/Topbar';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import QCDashboard from './pages/QCDashboard';
import DevDashboard from './pages/DevDashboard';
import { Spinner } from './components/UI';

// Protected route wrapper
function Protected({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{padding:60,textAlign:'center'}}><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// Root redirect based on role
function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{padding:60,textAlign:'center'}}><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin')     return <Navigate to="/admin" replace />;
  if (user.role === 'qc')        return <Navigate to="/qc" replace />;
  return <Navigate to="/dev" replace />;
}

function AppLayout({ children }) {
  return (
    <>
      <Topbar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleRedirect />} />

          <Route path="/admin" element={
            <Protected allowedRoles={['admin']}>
              <AppLayout><AdminDashboard /></AppLayout>
            </Protected>
          } />

          <Route path="/qc" element={
            <Protected allowedRoles={['qc', 'admin']}>
              <AppLayout><QCDashboard /></AppLayout>
            </Protected>
          } />

          <Route path="/dev" element={
            <Protected allowedRoles={['developer', 'admin']}>
              <AppLayout><DevDashboard /></AppLayout>
            </Protected>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
