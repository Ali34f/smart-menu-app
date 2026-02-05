import React, { useState } from 'react';
import { staffService } from '../services/staffService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';

interface InvitationAcceptanceProps {
  onAccept: () => void;
}

const InvitationAcceptance: React.FC<InvitationAcceptanceProps> = ({ onAccept }) => {
  const { toasts, removeToast, success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    try {
      setLoading(true);
      const response = await staffService.acceptInvitation();
      
      if (response.success) {
        success('Invitation accepted successfully!');
        localStorage.setItem('invitationAccepted', 'true');
        
        // Wait a moment for the success message, then refresh
        setTimeout(() => {
          // Force page reload to ensure all components update
          window.location.reload();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      showError(error.response?.data?.message || 'Failed to accept invitation');
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You've Been Invited!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You have been invited to join this restaurant team. Please accept the invitation to continue.
            </p>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Accepting...</span>
                </>
              ) : (
                <span>Accept Invitation</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvitationAcceptance;
