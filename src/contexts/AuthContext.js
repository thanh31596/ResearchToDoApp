// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on app start
        const token = localStorage.getItem('auth_token');
        if (token) {
            apiService.setToken(token);
            // Set basic user info (you might want to verify token with backend)
            setUser({ token });
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const result = await apiService.login(email, password);
            setUser(result.user);
            return result;
        } catch (error) {
            throw error;
        }
    };

    const register = async (email, password, fullName) => {
        try {
            const result = await apiService.register(email, password, fullName);
            setUser(result.user);
            return result;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        apiService.logout();
        setUser(null);
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};