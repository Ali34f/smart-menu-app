import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/Forgot_Password';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import AddMenuItem from './pages/AddMenuItem';
import ViewMenuItem from './pages/ViewMenuItem';
import EditMenuItem from './pages/EditMenuItem';
import Profile from './pages/Profile';
import Staff from './pages/Staff';
import InvitationAcceptance from './components/InvitationAcceptance';
import './App.css';

function App() {
  const [invitationAccepted, setInvitationAccepted] = useState<string | null>(null);
  const [showInvitationModal, setShowInvitationModal] = useState(false);

  // Apply saved preferences on app load and check invitation status
  useEffect(() => {
    const savedPrefs = localStorage.getItem('userPreferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        // Apply dark mode
        if (prefs.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        // Apply language
        if (prefs.language) {
          document.documentElement.lang = prefs.language;
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }

    // Check invitation status on mount
    checkInvitationStatus();
    
    // Listen for storage changes (when login happens)
    const handleStorageChange = () => {
      checkInvitationStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case localStorage was updated in same window
    const interval = setInterval(checkInvitationStatus, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const checkInvitationStatus = () => {
    const invitationStatus = localStorage.getItem('invitationAccepted');
    const userRole = localStorage.getItem('userRole');
    const isAuthenticated = localStorage.getItem('authToken') !== null;
    
    // Only show modal if user is authenticated, not an owner, and invitation not accepted
    if (isAuthenticated && userRole !== 'owner' && invitationStatus === 'false') {
      setInvitationAccepted('false');
      setShowInvitationModal(true);
    } else {
      setInvitationAccepted(invitationStatus);
      setShowInvitationModal(false);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = (): boolean => {
    return localStorage.getItem('authToken') !== null;
  };

  // Protected Route Wrapper Component
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }

    // Check invitation status synchronously (owners are always accepted)
    const userRole = localStorage.getItem('userRole');
    const invitationStatus = localStorage.getItem('invitationAccepted');

    // Debug logging
    console.log('[PROTECTED_ROUTE] userRole:', userRole);
    console.log('[PROTECTED_ROUTE] invitationStatus:', invitationStatus);
    console.log('[PROTECTED_ROUTE] Check result:', userRole !== 'owner' && invitationStatus === 'false');

    // Block access if invitation not accepted (except for owners)
    if (userRole !== 'owner' && invitationStatus === 'false') {
      console.log('[PROTECTED_ROUTE] Showing invitation modal');
      return (
        <>
          <InvitationAcceptance
            onAccept={() => {
              // This will be handled by the component itself
            }}
          />
          {/* Block all interactions with the app */}
          <div className="pointer-events-none opacity-30 select-none">
            {children}
          </div>
        </>
      );
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

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <Staff />
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