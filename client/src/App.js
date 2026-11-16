import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AIAgents from './pages/AIAgents';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import Calls from './pages/Calls';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { Sparkles } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#171819] flex flex-col items-center justify-center text-[#C3C2BE] gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#292B2D] border border-[#AD8A62]/30 flex items-center justify-center shadow-lg shadow-black/40">
          <Sparkles className="w-5 h-5 text-[#AD8A62] animate-pulse" />
        </div>
        <span className="text-xs font-medium tracking-wide text-[#A1A09B]">
          Authenticating TalkPilot AI Session...
        </span>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Protected App Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agents" element={<AIAgents />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/calls" element={<Calls />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
