// contract/frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const setAuthData = useCallback((userData, userToken) => {
    localStorage.setItem('userInfo', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
    setUser(userData);
    setToken(userToken);
    API.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
    console.log('AuthContext: setAuthData - Token set in Axios defaults:', userToken ? 'Set' : 'Not Set');
  }, []);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    delete API.defaults.headers.common['Authorization'];
    console.log('AuthContext: clearAuthData - Token removed from Axios defaults.');
  }, []);


  useEffect(() => {
    const checkAuthStatus = async () => {
      const storedUserInfo = localStorage.getItem('userInfo');
      const storedToken = localStorage.getItem('token');

      console.log('AuthContext: checkAuthStatus - Stored User Info:', storedUserInfo ? 'Exists' : 'Not Found');
      console.log('AuthContext: checkAuthStatus - Stored Token:', storedToken ? storedToken.substring(0, 10) + '...' : 'Not Found');

      if (storedUserInfo && storedToken) {
        const userInfo = JSON.parse(storedUserInfo);
        setAuthData(userInfo, storedToken);

        try {
          console.log('AuthContext: Attempting profile fetch to validate token...');
          const res = await API.get('/auth/profile');
          setUser(res.data);
          console.log('AuthContext: Profile fetched successfully. Token is valid.');
        } catch (error) {
          console.error('AuthContext: Token validation failed during profile fetch:', error.response?.status, error.message);
          // Only show toast if it's not a dev environment or a specific login error
          // The issue might be that a failed profile fetch on load is toast-ing after a successful login toast.
          // This toast is fine here for session expiry.
          toast.error('Session expired or invalid. Please log in again.');
          clearAuthData();
          navigate('/login');
        }
      } else {
        clearAuthData();
      }
      setLoading(false);
      console.log('AuthContext: Finished initial auth check. Loading is now false.');
    };

    checkAuthStatus();
  }, [navigate, setAuthData, clearAuthData]);

  const login = async (username, password) => {
    try {
      console.log('AuthContext: Attempting login for user:', username);
      const res = await API.post('/auth/login', { username, password });
      const { user: userData, token: userToken } = res.data;

      setAuthData(userData, userToken);
      // Let LoginPage handle the success toast, to avoid potential double toasts with initial profile check
      // OR, keep it here and remove from LoginPage. For clarity, let's keep it here.
      toast.success('Login successful!'); 
      console.log('AuthContext: Login successful. User role:', userData.role);
      if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (userData.role === 'supervisor') {
        navigate('/supervisor/dashboard');
      } else {
        navigate('/');
      }
      return { success: true }; // Return success status
    } catch (error) {
      clearAuthData();
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(message); // Let AuthContext handle the error toast
      console.error('AuthContext: Login error details:', error.response?.status, error.response?.data?.message || error.message);
      return { success: false, message }; // Return failure status and message
    }
  };

  const logout = useCallback(() => {
    console.log('AuthContext: Logging out...');
    clearAuthData();
    toast.info('You have been logged out.');
    navigate('/login');
  }, [navigate, clearAuthData]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};