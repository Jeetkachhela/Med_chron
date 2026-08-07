"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stethoscope, Lock, Mail, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { API_BASE } from '@/lib/api';

import { ArrowLeft } from 'lucide-react';

interface LoginProps {
  onBackToLanding?: () => void;
  initialRegister?: boolean;
}

export default function Login({ onBackToLanding, initialRegister = false }: LoginProps) {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(initialRegister);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Register the user
        await axios.post(`${API_BASE}/auth/register`, {
          email,
          password,
          full_name: fullName
        });

        // Automatically log them in immediately using the credentials they just provided
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        
        const res = await axios.post(`${API_BASE}/auth/login`, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const token = res.data.access_token;
        const user = res.data.user;
        if (user) {
          login(token, user);
        } else {
          const userRes = await axios.get(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          login(token, userRes.data);
        }
      } else {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        
        const res = await axios.post(`${API_BASE}/auth/login`, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const token = res.data.access_token;
        const user = res.data.user;
        if (user) {
          login(token, user);
        } else {
          const userRes = await axios.get(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          login(token, userRes.data);
        }
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 relative">
      {onBackToLanding && (
        <button 
          onClick={onBackToLanding}
          className="absolute top-6 left-6 flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] bg-[var(--glass-bg)] backdrop-blur-md px-4 py-2 rounded-xl border border-[var(--border)] shadow-sm transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>
      )}

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }}></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-[var(--shadow-accent)] mb-6">
            <Stethoscope className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Chronology<span className="text-[var(--accent)]">AI</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] font-medium">Professional Medical Intelligence Platform</p>
        </div>

        <div className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-[2.5rem] p-8 shadow-[var(--shadow-lg)] border border-[var(--border)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">
            {isRegister ? 'Create an Account' : 'Welcome Back'}
          </h2>

          {error && (
            <div className={`p-4 mb-6 rounded-2xl text-sm font-semibold flex items-center gap-3 ${
              error.includes('successful') ? 'bg-[var(--success-light)] text-[var(--success-text)]' : 'bg-[var(--danger-light)] text-[var(--danger)]'
            }`}>
              <ShieldCheck className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="popLayout">
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                    <input 
                      type="text" 
                      required={isRegister}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Dr. John Doe"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="name@hospital.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[var(--accent-shadow)] disabled:opacity-50 mt-8"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? 'Create Account' : 'Secure Login'}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
            >
              {isRegister ? 'Already have an account? Log in' : "Don't have an account? Register"}
            </button>
          </div>
        </div>
        
        {/* Fix #27: Removed false "HIPAA-compliant" claim */}
        <p className="text-center text-xs text-[var(--text-muted)] font-medium mt-8">
          Secure Medical Intelligence Processing
        </p>
      </motion.div>
    </div>
  );
}
