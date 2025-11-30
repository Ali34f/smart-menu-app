import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/Forgot_Password';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  // Check if user is authenticated
  const isAuthenticated = (): boolean => {
    return localStorage.getItem('authToken') !== null;
  };

  // Protected Route Wrapper Component
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Protected Route - Dashboard */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Default Route - Redirect to Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Catch All - Redirect to Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;