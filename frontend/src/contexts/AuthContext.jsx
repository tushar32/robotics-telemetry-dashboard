import React, { createContext, useState, useContext, useEffect } from 'react';
import apiService from '../services/api';
import websocketService from '../services/websocket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (apiService.isAuthenticated()) {
          const userData = await apiService.getCurrentUser();
          setCurrentUser(userData);
          
          const token = apiService.getToken();
          if (token) {
            await websocketService.connect(token);
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        apiService.logout();
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      setAuthLoading(true);
      const authData = await apiService.login(credentials);
      setCurrentUser(authData.user);
      
      await websocketService.connect(authData.token);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    apiService.logout();
    websocketService.disconnect();
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isAuthLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
