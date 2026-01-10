import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/Forgot_Password';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import AddMenuItem from './pages/AddMenuItem';
import ViewMenuItem from './pages/ViewMenuItem';
import EditMenuItem from './pages/EditMenuItem';
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
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        <Route
          path="/menu-items"
          element={
            <ProtectedRoute>
              <Menu />
            </ProtectedRoute>
          }
        />

        <Route
          path="/menu-items/new"
          element={
            <ProtectedRoute>
              <AddMenuItem />
            </ProtectedRoute>
          }
        />

        <Route
          path="/menu-items/:id"
          element={
            <ProtectedRoute>
              <ViewMenuItem />
            </ProtectedRoute>
          }
        />

        <Route
          path="/menu-items/edit/:id"
          element={
            <ProtectedRoute>
              <EditMenuItem />
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