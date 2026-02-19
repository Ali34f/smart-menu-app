import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations } from '../utils/translations';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('en');

  // Load language from preferences on mount
  useEffect(() => {
    const savedPrefs = localStorage.getItem('userPreferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.language) {
          setLanguageState(prefs.language);
          document.documentElement.lang = prefs.language;
          // Set RTL for Arabic and Urdu
          if (prefs.language === 'ar' || prefs.language === 'ur') {
            document.documentElement.dir = 'rtl';
          } else {
            document.documentElement.dir = 'ltr';
          }
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      }
    }
  }, []);

  // Listen for preference changes from Profile page
  useEffect(() => {
    const handleStorageChange = () => {
      const savedPrefs = localStorage.getItem('userPreferences');
      if (savedPrefs) {
        try {
          const prefs = JSON.parse(savedPrefs);
          if (prefs.language && prefs.language !== language) {
            setLanguageState(prefs.language);
            document.documentElement.lang = prefs.language;
            if (prefs.language === 'ar' || prefs.language === 'ur') {
              document.documentElement.dir = 'rtl';
            } else {
              document.documentElement.dir = 'ltr';
            }
          }
        } catch (error) {
          console.error('Error loading language preference:', error);
        }
      }
    };

    // Check for changes periodically (for same-window updates)
    const interval = setInterval(handleStorageChange, 500);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [language]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    document.documentElement.lang = lang;
    if (lang === 'ar' || lang === 'ur') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }

    // Update localStorage
    const savedPrefs = localStorage.getItem('userPreferences');
    const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
    prefs.language = lang;
    localStorage.setItem('userPreferences', JSON.stringify(prefs));
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
