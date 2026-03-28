import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AppHeaderBrandingProps {
  /** Main title (e.g. translated "Smart Menu") */
  title: string;
  /** Second line under the title */
  subtitle: string;
}

/**
 * Green logo tile (dashboard home) + title block. Logo click → /dashboard (same as before).
 */
const AppHeaderBranding: React.FC<AppHeaderBrandingProps> = ({ title, subtitle }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center space-x-4">
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center hover:bg-green-600 transition cursor-pointer flex-shrink-0"
        title="Go to Dashboard"
      >
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
        </svg>
      </button>
      <div className="text-left min-w-0">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white truncate">{title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
      </div>
    </div>
  );
};

export default AppHeaderBranding;
