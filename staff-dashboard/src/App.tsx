import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import AddMenuItem from './pages/AddMenuItem';
import ViewMenuItem from './pages/ViewMenuItem';
import EditMenuItem from './pages/EditMenuItem';
import Profile from './pages/Profile';
import Staff from './pages/Staff';
import Ingredients from './pages/Ingredients';
import AddIngredient from './pages/AddIngredient';
import ViewIngredient from './pages/ViewIngredient';
import EditIngredient from './pages/EditIngredient';
import InvitationAcceptance from './components/InvitationAcceptance';
import './App.css';

function App() {
  // Apply saved preferences on app load
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
  }, []);

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

    // Block access if invitation not accepted (except for owners)
    // invitationStatus 'false' = invited staff/manager who hasn't accepted yet
    // invitationStatus null = stale session; require non-owners to accept
    const needsToAccept =
      userRole !== 'owner' && invitationStatus !== 'true';

    if (needsToAccept) {
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
    <LanguageProvider>
      <Router>
        <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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

        <Route
          path="/ingredients"
          element={
            <ProtectedRoute>
              <Ingredients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ingredients/new"
          element={
            <ProtectedRoute>
              <AddIngredient />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ingredients/edit/:id"
          element={
            <ProtectedRoute>
              <EditIngredient />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ingredients/:id"
          element={
            <ProtectedRoute>
              <ViewIngredient />
            </ProtectedRoute>
          }
        />

        {/* Default Route - Redirect to Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Catch All - Redirect to Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;