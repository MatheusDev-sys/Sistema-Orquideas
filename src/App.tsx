import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './screens/Login';
import { Home } from './screens/Home';
import { ItemDetail } from './screens/ItemDetail';
import { Logs } from './screens/Logs';
import { Admin } from './screens/Admin';
import { BottomNav } from './components/BottomNav';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-stone-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <Outlet />
      <BottomNav />
    </div>
  );
};

const AdminRoute = () => {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!profile?.is_admin) return <Navigate to="/" replace />;

  return <Outlet />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/logs" element={<Logs />} />
            
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
