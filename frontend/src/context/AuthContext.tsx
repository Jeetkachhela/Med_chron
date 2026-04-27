"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface User {
  id: number;
  email: string;
  full_name: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("auth_token");
    delete axios.defaults.headers.common["Authorization"];
  }, []);

  const fetchUserProfile = useCallback(async (authToken: string) => {
    try {
      const res = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(res.data);
      setToken(authToken);
    } catch (err) {
      console.error("Failed to fetch user profile", err);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // Check for saved token
    const savedToken = sessionStorage.getItem("auth_token");
    if (savedToken) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
      fetchUserProfile(savedToken);
    } else {
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    sessionStorage.setItem("auth_token", newToken);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
