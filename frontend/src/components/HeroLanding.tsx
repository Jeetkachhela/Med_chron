"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Stethoscope, 
  ArrowRight, 
  ShieldCheck, 
  FileText, 
  Zap, 
  Brain, 
  AlertTriangle, 
  Download, 
  Scale, 
  Building2, 
  FileCheck, 
  UserCheck, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  Search,
  Lock,
  Clock
} from 'lucide-react';

interface HeroLandingProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  isAuthenticated: boolean;
  onGoToWorkspace: () => void;
}

export default function HeroLanding({ 
  onGetStarted, 
  onSignIn, 
  isAuthenticated, 
  onGoToWorkspace 
}: HeroLandingProps) {
  return (
    <div className="min-h-screen bg-[var(--hero-bg)] text-[var(--hero-text)] font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden">
      {/* Background Glow Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px]"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-sky-600/15 rounded-full blur-[128px]"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      {/* Navigation Header */}
      <header className="relative z-20 border-b border-[var(--hero-border)] bg-[var(--hero-bg)]/70 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
              <Stethoscope className="h-6 w-6" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[var(--hero-text)]">
              Chronology<span className="text-blue-500">AI</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--hero-text-muted)]">
            <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
            <a href="#use-cases" className="hover:text-blue-400 transition-colors">Use Cases</a>
            <a href="#how-it-works" className="hover:text-blue-400 transition-colors">How It Works</a>
            <a href="#security" className="hover:text-blue-400 transition-colors">Security</a>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <button
                onClick={onGoToWorkspace}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all active:scale-95"
              >
                Go to Workspace
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={onSignIn}
                  className="text-[var(--hero-text-muted)] hover:text-[var(--hero-text)] font-semibold text-sm px-4 py-2 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={onGetStarted}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/25 flex items-center gap-2 text-sm transition-all active:scale-95"
                >
                  Get Started
                  <Sparkles className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-24 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8"
        >
          <Sparkles className="h-3.5 w-3.5" /> Next-Generation Medical Intelligence Platform
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] max-w-5xl mx-auto text-[var(--hero-text)]"
        >
          Turn Thousands of Medical Pages into <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">Court-Ready Timelines</span> in Seconds
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-[var(--hero-text-muted)] max-w-3xl mx-auto leading-relaxed"
        >
          Automate medical record extraction with AI. Instantly identify clinical events, diagnostic imaging, treatment histories, and pre-existing condition flags with 100% data privacy.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={isAuthenticated ? onGoToWorkspace : onGetStarted}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:opacity-95 text-white font-extrabold text-base px-8 py-4 rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            {isAuthenticated ? 'Open Workspace' : 'Get Started Free'}
            <ArrowRight className="h-5 w-5" />
          </button>
          
          <a
            href="#demo-preview"
            className="w-full sm:w-auto bg-[var(--hero-surface)] hover:bg-[var(--hero-surface)] text-[var(--hero-text)] border border-[var(--hero-border)] font-bold text-base px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
          >
            See Live Demo
          </a>
        </motion.div>

        {/* Feature Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs font-semibold text-[var(--hero-text-muted)] border-t border-b border-[var(--hero-border)] py-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Automated ICD-10 Categorization
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Red Flag & Treatment Gap Alerts
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Court-Ready PDF & CSV Export
          </div>
        </div>

        {/* Interactive Mockup Graphic */}
        <motion.div 
          id="demo-preview"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 relative max-w-5xl mx-auto rounded-3xl p-3 bg-gradient-to-b from-blue-500/20 via-[var(--hero-surface)] to-[var(--hero-bg)] border border-[var(--hero-border)] shadow-2xl shadow-blue-900/20"
        >
          <div className="bg-[var(--hero-surface)] rounded-2xl border border-[var(--hero-border)] p-6 text-left overflow-hidden">
            {/* Mockup Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--hero-border)]">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                <span className="text-xs font-mono text-[var(--hero-text-muted)] ml-2">CASE #2026-9481 | John Doe (Trauma Record Review)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Processed (142 Events Extracted)
                </span>
              </div>
            </div>

            {/* Mockup Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--hero-bg)] p-4 rounded-xl border border-[var(--hero-border)]">
                <p className="text-xs font-bold text-[var(--hero-text-muted)] uppercase tracking-wider mb-1">Total Records Analyzed</p>
                <p className="text-2xl font-black text-[var(--hero-text)]">418 Pages</p>
                <p className="text-xs text-blue-400 mt-1">Processed in 4.2s</p>
              </div>
              <div className="bg-[var(--hero-bg)] p-4 rounded-xl border border-[var(--hero-border)]">
                <p className="text-xs font-bold text-[var(--hero-text-muted)] uppercase tracking-wider mb-1">Diagnostics Found</p>
                <p className="text-2xl font-black text-indigo-400">14 MRI / CT Scans</p>
                <p className="text-xs text-[var(--hero-text-muted)] mt-1">L4-L5 herniation identified</p>
              </div>
              <div className="bg-[var(--hero-bg)] p-4 rounded-xl border border-[var(--hero-border)]">
                <p className="text-xs font-bold text-[var(--hero-text-muted)] uppercase tracking-wider mb-1">Critical Flags</p>
                <p className="text-2xl font-black text-amber-400">3 Red Flags</p>
                <p className="text-xs text-[var(--hero-text-muted)] mt-1">Pre-existing lumbar degeneration</p>
              </div>
            </div>

            {/* Timeline Mock snippet */}
            <div className="mt-6 space-y-3">
              <div className="p-3.5 bg-[var(--hero-bg)] rounded-xl border border-blue-500/20 flex items-start gap-4">
                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-lg font-mono">2025-11-14</span>
                <div>
                  <h4 className="text-sm font-bold text-[var(--hero-text)]">Emergency Room Visit - Trauma Center</h4>
                  <p className="text-xs text-[var(--hero-text-muted)] mt-0.5">Initial evaluation following motor vehicle accident. Patient presented with acute cervical and lumbar spinal pain.</p>
                </div>
              </div>
              <div className="p-3.5 bg-[var(--hero-bg)] rounded-xl border border-indigo-500/20 flex items-start gap-4">
                <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-lg font-mono">2025-11-18</span>
                <div>
                  <h4 className="text-sm font-bold text-[var(--hero-text)]">Lumbar Spine MRI Scan - Imaging Center</h4>
                  <p className="text-xs text-[var(--hero-text-muted)] mt-0.5">Findings: 4mm posterior disc herniation at L4-L5 encroaching upon bilateral exiting nerve roots.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-[var(--hero-border)]">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Engineered For Accuracy</h2>
          <p className="text-3xl sm:text-5xl font-extrabold text-[var(--hero-text)] tracking-tight">Everything You Need for Medical Chronologies</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[var(--hero-surface)] p-8 rounded-3xl border border-[var(--hero-border)] hover:border-blue-500/40 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-[var(--hero-text)] mb-3">AI Clinical OCR & Parsing</h3>
            <p className="text-[var(--hero-text-muted)] text-sm leading-relaxed">
              Extract unstructured doctor notes, handwritten charts, discharge summaries, and prescription logs into structured digital data.
            </p>
          </div>

          <div className="bg-[var(--hero-surface)] p-8 rounded-3xl border border-[var(--hero-border)] hover:border-indigo-500/40 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-[var(--hero-text)] mb-3">Red Flag & Discrepancy Spotting</h3>
            <p className="text-[var(--hero-text-muted)] text-sm leading-relaxed">
              Automatically flag treatment gaps, pre-existing spinal degeneration, unverified diagnoses, and billing discrepancies.
            </p>
          </div>

          <div className="bg-[var(--hero-surface)] p-8 rounded-3xl border border-[var(--hero-border)] hover:border-sky-500/40 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-6">
              <Download className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-[var(--hero-text)] mb-3">1-Click PDF & CSV Export</h3>
            <p className="text-[var(--hero-text-muted)] text-sm leading-relaxed">
              Export court-ready medical chronology reports formatted with professional headers, page citations, and summary tables.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="relative z-10 py-24 px-6 bg-[var(--hero-surface)] border-t border-[var(--hero-border)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Built For Legal & Medical Experts</h2>
            <p className="text-3xl sm:text-5xl font-extrabold text-[var(--hero-text)] tracking-tight">Tailored to Your Workflow</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-[var(--hero-bg)] border border-[var(--hero-border)] flex items-start gap-6">
              <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 shrink-0">
                <Scale className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--hero-text)] mb-2">Personal Injury Law Firms</h3>
                <p className="text-[var(--hero-text-muted)] text-sm leading-relaxed">
                  Prepare demand letters 10x faster. Quickly digest thousands of medical records and pinpoint causation, treatment duration, and injury severity.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-[var(--hero-bg)] border border-[var(--hero-border)] flex items-start gap-6">
              <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 shrink-0">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--hero-text)] mb-2">Insurance Claims Adjusters</h3>
                <p className="text-[var(--hero-text-muted)] text-sm leading-relaxed">
                  Audit claim validity effortlessly. Identify prior medical history, treatment pauses, and unverified provider charges before settling.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-[var(--hero-bg)] border border-[var(--hero-border)] flex items-start gap-6">
              <div className="p-4 rounded-2xl bg-sky-500/10 text-sky-400 shrink-0">
                <UserCheck className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--hero-text)] mb-2">Independent Medical Examiners</h3>
                <p className="text-[var(--hero-text-muted)] text-sm leading-relaxed">
                  Streamline IME record reviews. Instantly sort treatment records chronologically by provider, diagnostic imaging, and operative reports.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-[var(--hero-bg)] border border-[var(--hero-border)] flex items-start gap-6">
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <FileCheck className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--hero-text)] mb-2">Medical Legal Analysts</h3>
                <p className="text-[var(--hero-text-muted)] text-sm leading-relaxed">
                  Eliminate repetitive manual data entry. Generate polished, comprehensive summaries with source document page numbers attached to every event.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-[var(--hero-border)] text-center">
        <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Simple 3-Step Process</h2>
        <p className="text-3xl sm:text-5xl font-extrabold text-[var(--hero-text)] tracking-tight mb-16">From PDF to Chronology in Minutes</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative p-8 rounded-3xl bg-[var(--hero-surface)] border border-[var(--hero-border)] text-left">
            <span className="text-5xl font-black text-blue-500/20 absolute top-6 right-6">01</span>
            <h3 className="text-xl font-bold text-[var(--hero-text)] mb-2">Upload PDF Files</h3>
            <p className="text-[var(--hero-text-muted)] text-sm">Drag and drop raw medical records, hospital charts, or scan bundles into your secure workspace.</p>
          </div>

          <div className="relative p-8 rounded-3xl bg-[var(--hero-surface)] border border-[var(--hero-border)] text-left">
            <span className="text-5xl font-black text-indigo-500/20 absolute top-6 right-6">02</span>
            <h3 className="text-xl font-bold text-[var(--hero-text)] mb-2">AI Clinical Extraction</h3>
            <p className="text-[var(--hero-text-muted)] text-sm">Our AI parses medical terminology, sorts dates, extracts diagnostics, and flags inconsistencies.</p>
          </div>

          <div className="relative p-8 rounded-3xl bg-[var(--hero-surface)] border border-[var(--hero-border)] text-left">
            <span className="text-5xl font-black text-sky-500/20 absolute top-6 right-6">03</span>
            <h3 className="text-xl font-bold text-[var(--hero-text)] mb-2">Review & Export</h3>
            <p className="text-[var(--hero-text-muted)] text-sm">Filter events, view diagnostic tables, and export polished PDFs or CSV files with a single click.</p>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="relative z-10 py-20 px-6 max-w-5xl mx-auto text-center">
        <div className="p-12 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-2xl shadow-blue-600/30">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ready to Transform Your Medical Record Workflow?</h2>
          <p className="mt-4 text-blue-100 text-base max-w-2xl mx-auto">
            Join legal and medical professionals who save hours on every case review.
          </p>
          <button
            onClick={isAuthenticated ? onGoToWorkspace : onGetStarted}
            className="mt-8 bg-white text-blue-900 font-extrabold px-8 py-4 rounded-2xl shadow-xl hover:bg-slate-100 transition-all active:scale-95 inline-flex items-center gap-2"
          >
            {isAuthenticated ? 'Go to Workspace' : 'Get Started Now'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--hero-border)] py-10 px-6 text-center text-xs text-[var(--hero-text-muted)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-blue-500" />
            <span className="font-bold text-[var(--hero-text-muted)]">ChronologyAI</span> — Medical Intelligence Platform
          </div>
          <p>© 2026 ChronologyAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
