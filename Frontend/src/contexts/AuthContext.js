import React, { createContext, useContext, useState, useEffect } from 'react';
import { validateToken } from '../api/auth';

const AuthContext = createContext({
  isLoggedIn: false,
  userId: null,
  setIsLoggedIn: () => {},
  checkAuth: async () => {},
  refreshAuthUser: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const refreshAuthUser = async () => {
    const userData = await validateToken();
    if (userData?.user_id) {
      setUserId(userData.user_id);
      return userData.user_id;
    }

    setUserId(null);
    return null;
  };

  const checkAuth = async () => {
    try {
      console.log('🔐 Starting auth check...');
      const resolvedUserId = await refreshAuthUser();
      const authenticated = Boolean(resolvedUserId);
      console.log('✅ Auth check complete:', authenticated);
      setIsLoggedIn(authenticated);
      return authenticated;
    } catch (error) {
      console.error('❌ Auth check error:', error);
      // Log to Sentry if available
      if (typeof Sentry !== 'undefined' && Sentry.captureException) {
        Sentry.captureException(error);
      }
      setIsLoggedIn(false);
      setUserId(null);
      return false;
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    // Delay auth check slightly to allow env vars to be loaded
    const timer = setTimeout(() => {
      checkAuth().catch(err => {
        console.error('❌ Auth check failed on mount:', err);
        setAuthChecked(true);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setUserId(null);
      return;
    }

    refreshAuthUser().catch((error) => {
      console.error('❌ Failed to refresh auth user:', error);
    });
  }, [isLoggedIn]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, userId, setIsLoggedIn, checkAuth, refreshAuthUser, authChecked }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
