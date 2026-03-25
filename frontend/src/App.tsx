import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from './contexts/LanguageContext';
import Login from './pages/Login';
import PlatformLogin from './pages/PlatformLogin';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PlatformDashboard from './pages/PlatformDashboard';
import Menu from './pages/Menu';
import AddMenuItem from './pages/AddMenuItem';
import ViewMenuItem from './pages/ViewMenuItem';
import EditMenuItem from './pages/EditMenuItem';
import Profile from './pages/Profile';
import Staff from './pages/Staff';
import Ingredients from './pages/Ingredients';
import Allergens from './pages/Allergens';
import QRCodes from './pages/QRCodes';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AllergenComplianceReport from './pages/AllergenComplianceReport';
import AddIngredient from './pages/AddIngredient';
import ViewIngredient from './pages/ViewIngredient';
import EditIngredient from './pages/EditIngredient';
import InvitationAcceptance from './components/InvitationAcceptance';
import PublicMenu from './pages/PublicMenu';
import './App.css';

function App() {
  useEffect(() => {
    const savedPrefs = localStorage.getItem('userPreferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        if (prefs.language) {
          document.documentElement.lang = prefs.language;
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }, []);

  const isAuthenticated = (): boolean => {
    return localStorage.getItem('authToken') !== null;
  };

  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }

    const userRole = localStorage.getItem('userRole');
    const invitationStatus = localStorage.getItem('invitationAccepted');
    // Owners and super owners skip; staff/manager must have accepted invite
    const needsToAccept =
      userRole !== 'owner' &&
      userRole !== 'super_owner' &&
      userRole !== 'platform_admin' &&
      invitationStatus !== 'true';

    if (needsToAccept) {
      return (
        <>
          <InvitationAcceptance onAccept={() => {}} />
          <div className="pointer-events-none opacity-30 select-none">
            {children}
          </div>
        </>
      );
    }

    return <>{children}</>;
  };

  const PlatformRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/platform/login" replace />;
    }
    const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
    if (userRole !== 'platform_admin' && userRole !== 'super_owner') {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  };

  return (
    <LanguageProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2500,
            style: {
              borderRadius: '10px',
              border: '1px solid #d1fae5'
            }
          }}
        />
        <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/platform/login" element={<PlatformLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/public/menu/:restaurantId" element={<PublicMenu />} />

        {/* Protected Routes */}
        <Route 
          path="/platform/dashboard"
          element={
            <PlatformRoute>
              <PlatformDashboard />
            </PlatformRoute>
          }
        />

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
          path="/allergens"
          element={
            <ProtectedRoute>
              <Allergens />
            </ProtectedRoute>
          }
        />

        <Route
          path="/allergens/compliance"
          element={
            <ProtectedRoute>
              <AllergenComplianceReport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/qr-codes"
          element={
            <ProtectedRoute>
              <QRCodes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
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