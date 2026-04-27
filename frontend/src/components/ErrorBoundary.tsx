"use client";

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Fix #22: Error Boundary to prevent white-screen crashes.
 * Catches render errors in child components and shows a friendly fallback.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-3xl border border-red-100 bg-red-50/50 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500 mb-6">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            An unexpected error occurred while rendering this section. Please try refreshing.
          </p>
          {this.state.error && (
            <p className="text-xs text-red-400 font-mono mb-6 max-w-lg truncate">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 transition-all active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
