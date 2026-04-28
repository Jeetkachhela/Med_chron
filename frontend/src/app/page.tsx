"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Uploader from '@/components/Uploader';
import Timeline from '@/components/Timeline';
import EventCharts from '@/components/EventCharts';
import MedicalCalendar from '@/components/MedicalCalendar';
import DashboardStats from '@/components/DashboardStats';

import DiagnosticsTable from '@/components/DiagnosticsTable';
import TreatmentsTable from '@/components/TreatmentsTable';
import FlagsPanel from '@/components/FlagsPanel';
import Login from '@/components/Login';
import ErrorBoundary from '@/components/ErrorBoundary';
import ConfirmModal from '@/components/ConfirmModal';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { 
  Download, 
  Calendar as CalIcon, 
  Activity, 
  FolderOpen, 
  Plus, 
  ArrowLeft, 
  BarChart2,
  User,
  Hash,
  ChevronRight,
  Stethoscope,
  FileText,
  Trash2,
  FileDown,
  Loader2,
  AlertCircle
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ── Fix #25: Proper TypeScript Interfaces ──────────────────────
interface CaseSummary {
  id: number;
  case_reference: string;
  patient_name: string;
  created_at: string;
  event_count: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface Patient {
  id: number;
  name: string;
  dob: string | null;
  gender: string | null;
}

interface Case {
  id: number;
  case_reference: string;
  primary_complaint: string;
  injury_cause: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface Event {
  id: number;
  date: string | null;
  event_type: string;
  description: string;
  source_file: string;
  confidence: string;
}

interface Diagnostic {
  id: number;
  date: string | null;
  test_name: string;
  findings: string;
  clinical_significance: string;
}

interface Treatment {
  id: number;
  date: string | null;
  provider: string;
  treatment: string;
  notes: string;
}

interface Flag {
  id: number;
  type: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
  source_file: string;
}

interface SourceFile {
  id: number;
  file_name: string;
  file_type: string;
  uploaded_at: string;
}

interface ChronologyData {
  patient: Patient;
  case: Case;
  events: Event[];
  diagnostics: Diagnostic[];
  treatments: Treatment[];
  flags: Flag[];
  files: SourceFile[];
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
}

export default function Dashboard() {
  const { user, isLoading, logout } = useAuth();
  const [activeCaseId, setActiveCaseId] = useState<number | null>(null);
  const [caseData, setCaseData] = useState<ChronologyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [existingCases, setExistingCases] = useState<CaseSummary[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'diagnostics' | 'treatments'>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<number | null>(null);
  
  // Ref for polling interval cleanup
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchCases = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/cases/`);
      setExistingCases(res.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch cases', 'error');
    }
  }, []);

  const fetchChronology = useCallback(async (caseId: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/cases/${caseId}/chronology`);
      setCaseData(res.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load chronology data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fix #20, #40: Polling with cleanup ────────────────────────
  useEffect(() => {
    if (activeCaseId && caseData?.processing_status === 'processing') {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/cases/${activeCaseId}/status`);
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            fetchChronology(activeCaseId);
            fetchCases();
          } else {
            // Partial update of event count if needed
            fetchChronology(activeCaseId);
          }
        } catch (err) {
          console.error('Polling error', err);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      }, 5000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeCaseId, caseData?.processing_status, fetchChronology, fetchCases]);

  useEffect(() => {
    if (user) {
      fetchCases();
    }
  }, [user, fetchCases]);

  const handleUploadComplete = (caseId: string) => {
    const id = parseInt(caseId);
    setActiveCaseId(id);
    setShowUploader(false);
    fetchChronology(id);
    fetchCases();
  };

  const handleSelectCase = (caseId: number) => {
    setActiveCaseId(caseId);
    setActiveTab('overview');
    fetchChronology(caseId);
  };

  const handleDeleteCase = async (e: React.MouseEvent, caseId: number) => {
    e.stopPropagation();
    setCaseToDelete(caseId);
  };

  const executeDelete = async () => {
    if (!caseToDelete) return;
    try {
      await axios.delete(`${API_BASE}/cases/${caseToDelete}`);
      showToast('Case deleted successfully');
      fetchCases();
      if (activeCaseId === caseToDelete) {
        handleBack();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete case', 'error');
    } finally {
      setCaseToDelete(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!activeCaseId) return;
    try {
      setIsDownloading(true);
      const res = await axios.get(`${API_BASE}/cases/${activeCaseId}/pdf`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      
      const safeRef = (caseData?.case?.case_reference || 'Report').replace(/[^a-zA-Z0-9-]/g, '_');
      link.download = `Medical_Chronology_${safeRef}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      showToast('Report downloaded successfully');
    } catch (err) {
      console.error('Failed to download PDF', err);
      showToast('Failed to download report. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportCsv = async (type: 'events' | 'diagnostics' | 'treatments') => {
    if (!activeCaseId) return;
    try {
      const res = await axios.get(`${API_BASE}/cases/${activeCaseId}/export/csv?export_type=${type}`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${caseData?.case?.case_reference || 'case'}_${type}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} exported to CSV`);
    } catch (err) {
      console.error(err);
      showToast('Export failed', 'error');
    }
  };

  const handleBack = () => {
    setActiveCaseId(null);
    setCaseData(null);
    setShowUploader(false);
    setSearchQuery('');
    setActiveTab('overview');
    fetchCases();
  };

  const filteredEvents = useMemo(() => {
    if (!caseData?.events) return [];
    if (!searchQuery) return caseData.events;
    return caseData.events.filter((e) => 
      e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.event_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [caseData?.events, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'diagnostics', label: 'Diagnostics' },
    { key: 'treatments', label: 'Treatments' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleBack}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Chronology<span className="text-blue-600">AI</span>
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Professional Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-900">{user?.full_name || user?.email}</p>
                <button onClick={logout} className="text-[10px] text-slate-500 hover:text-red-500 transition-colors">Sign Out</button>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <AnimatePresence mode="wait">
          {activeCaseId ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Title bar */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={handleBack} className="flex items-center justify-center h-10 w-10 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-all">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-extrabold text-slate-900">{caseData?.patient?.name || 'Loading...'}</h2>
                      {caseData?.processing_status === 'processing' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                      Reference: <span className="ml-1 font-mono text-slate-600">{caseData?.case?.case_reference || '...'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                    >
                      <FileDown className="h-4 w-4" />
                      Export
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-40 p-2">
                      <button onClick={() => handleExportCsv('events')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">Export Events (CSV)</button>
                      <button onClick={() => handleExportCsv('diagnostics')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">Export Diagnostics (CSV)</button>
                      <button onClick={() => handleExportCsv('treatments')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">Export Treatments (CSV)</button>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading || !caseData?.events?.length}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-200 hover:bg-slate-800 focus:outline-none disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download Report
                  </button>
                  <button
                    onClick={(e) => handleDeleteCase(e, activeCaseId)}
                    className="p-3 rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm shadow-red-50"
                    title="Delete Case"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* KPI Stats */}
              <ErrorBoundary>
                <DashboardStats
                  patientName={caseData?.patient?.name || '--'}
                  eventCount={caseData?.events?.length || 0}
                  diagnosticCount={caseData?.diagnostics?.length || 0}
                  treatmentCount={caseData?.treatments?.length || 0}
                  flagCount={caseData?.flags?.length || 0}
                  fileCount={caseData?.files?.length || 0}
                />
              </ErrorBoundary>

              {/* Tab Navigation */}
              <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm w-fit">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      activeTab === tab.key
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content — Fix #37: Optimized rendering */}
              <div className="min-h-[600px]">
                <ErrorBoundary>
                  {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                      {filteredEvents.length > 0 && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold flex items-center text-slate-900">
                              <BarChart2 className="w-5 h-5 mr-2 text-blue-500" /> Analytics
                            </h3>
                            <div className="relative w-64">
                              <input 
                                type="text" 
                                placeholder="Search events..." 
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xs shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                              />
                              <Activity className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                          </div>
                          <EventCharts events={filteredEvents} />
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                          <FlagsPanel flags={caseData?.flags || []} />
                        </div>
                        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                          <h3 className="text-lg font-bold mb-5 text-slate-900 flex items-center">
                            <CalIcon className="w-4 h-4 mr-2 text-blue-500" /> Treatment Calendar
                          </h3>
                          <MedicalCalendar events={caseData?.events || []} />
                        </div>
                      </div>

                      {caseData?.files && caseData.files.length > 0 && (
                        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
                          <h3 className="text-lg font-bold mb-6 text-slate-900 flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-slate-500" /> Source Files
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {caseData.files.map((file) => (
                              <div key={file.id} className="flex items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center mr-4 flex-shrink-0">
                                  <FileText className="h-5 w-5 text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">{file.file_name}</p>
                                  <p className="text-[10px] text-slate-500 uppercase font-medium">{new Date(file.uploaded_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'timeline' && (
                    <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-bold flex items-center text-slate-900">
                            <CalIcon className="w-5 h-5 mr-3 text-blue-500" /> Complete Treatment Timeline
                          </h3>
                          <div className="relative w-64">
                            <input 
                              type="text" 
                              placeholder="Search timeline..." 
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xs shadow-sm"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Activity className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>
                        {loading && !filteredEvents.length ? (
                          <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                            <p className="font-medium">Synthesizing clinical data...</p>
                          </div>
                        ) : (
                          <div className="max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
                            <Timeline events={filteredEvents} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'diagnostics' && (
                    <motion.div key="diagnostics" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <DiagnosticsTable diagnostics={caseData?.diagnostics || []} />
                      {(!caseData?.diagnostics || caseData.diagnostics.length === 0) && (
                        <div className="rounded-3xl border border-slate-100 bg-white p-16 text-center shadow-sm">
                          <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400 font-medium">No diagnostic records found for this case.</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'treatments' && (
                    <motion.div key="treatments" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <TreatmentsTable treatments={caseData?.treatments || []} />
                      {(!caseData?.treatments || caseData.treatments.length === 0) && (
                        <div className="rounded-3xl border border-slate-100 bg-white p-16 text-center shadow-sm">
                          <Stethoscope className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400 font-medium">No treatment records found for this case.</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </ErrorBoundary>
              </div>
            </motion.div>
          ) : showUploader ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="mx-auto max-w-2xl">
                <button 
                  onClick={handleBack} 
                  className="mb-8 flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Intelligence Dashboard
                </button>
                <div className="rounded-[2.5rem] bg-white p-2 shadow-2xl shadow-slate-200 ring-1 ring-slate-100">
                  <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8">
                    <Uploader onUploadComplete={handleUploadComplete} />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">Case Intelligence</h2>
                  <p className="mt-1 text-lg text-slate-500">Manage and analyze your medical chronology records.</p>
                </div>
                <button
                  onClick={() => setShowUploader(true)}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-blue-600 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-blue-300 active:scale-95"
                >
                  <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                  Create New Analysis
                </button>
              </div>

              {existingCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[3rem] border border-slate-100 bg-white p-20 text-center shadow-sm">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-50 text-slate-200">
                    <FolderOpen className="h-12 w-12" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">No records found</h3>
                  <p className="mx-auto mt-2 max-w-sm text-slate-500">Start by uploading medical records. Our AI will automatically extract and structure the timeline for you.</p>
                  <button
                    onClick={() => setShowUploader(true)}
                    className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                  >
                    Get Started Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {existingCases.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleSelectCase(c.id)}
                      className="group relative flex flex-col items-start rounded-[2rem] border border-slate-100 bg-white p-8 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 cursor-pointer"
                    >
                      <div className="mb-6 flex w-full items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <User className="h-6 w-6" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-tighter ${
                            c.processing_status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            c.processing_status === 'failed' ? 'bg-red-50 text-red-600' :
                            'bg-blue-50 text-blue-600 animate-pulse'
                          }`}>
                            {c.processing_status}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                            {c.event_count} EVENTS
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-6 w-full">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{c.patient_name}</h3>
                          <button 
                            onClick={(e) => handleDeleteCase(e, c.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-500 flex items-center">
                          <Hash className="mr-1 h-3 w-3" /> {c.case_reference}
                        </p>
                      </div>

                      <div className="mt-auto w-full border-t border-slate-50 pt-6 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>CREATED: {c.created_at ? new Date(c.created_at).toLocaleDateString() : '--'}</span>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={caseToDelete !== null}
        title="Delete Case"
        message="Are you sure you want to delete this case and all its data? This action cannot be undone."
        onConfirm={executeDelete}
        onCancel={() => setCaseToDelete(null)}
        confirmText="Delete Case"
      />
    </div>
  );
}

// ── Icons for toast ───────────────────────────
function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
