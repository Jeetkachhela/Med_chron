"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileUp, 
  X, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  File as FileIcon
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface UploaderProps {
  onUploadComplete: (caseId: string) => void;
}

export default function Uploader({ onUploadComplete }: UploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [caseRef, setCaseRef] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,  // 50MB limit
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    if (!patientName) {
      setError('Patient name is required');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      const authToken = localStorage.getItem('auth_token');
      const authHeaders = { Authorization: `Bearer ${authToken}` };
      
      const caseRes = await axios.post(`${API_BASE}/cases/`, {
        patient_name: patientName,
        case_reference: caseRef || undefined,
        primary_complaint: "Medical Review",
        injury_cause: "Unknown"
      }, { headers: authHeaders });
      
      const caseId = caseRes.data.case_id;
      setProgress(40);

      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      await axios.post(`${API_BASE}/cases/${caseId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...authHeaders },
        onUploadProgress: (progressEvent) => {
          const p = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setProgress(40 + (p * 0.6));
        }
      });

      onUploadComplete(caseId);
    } catch (err: unknown) {
      console.error(err);
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Upload failed. Please ensure the backend is running.');
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-slate-900">New Clinical Analysis</h3>
        <p className="mt-2 text-slate-500 text-sm">Fill in the case details and upload medical records to begin extraction.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Patient Name *</label>
          <input
            type="text"
            placeholder="e.g. John Doe"
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            disabled={uploading}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Case Reference (Optional)</label>
          <input
            type="text"
            placeholder="e.g. CASE-2024-001"
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
            value={caseRef}
            onChange={(e) => setCaseRef(e.target.value)}
            disabled={uploading}
          />
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-[2rem] border-2 border-dashed p-12 text-center transition-all ${
          isDragActive ? 'border-blue-500 bg-blue-50/50 shadow-inner' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 mb-6">
          <FileUp className="h-10 w-10" />
        </div>
        <p className="text-lg font-bold text-slate-900">Drop medical records here</p>
        <p className="mt-2 text-sm text-slate-500">Only PDF files are supported. Max 50MB per file.</p>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between ml-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected Files ({files.length})</h4>
              <button onClick={() => setFiles([])} className="text-[10px] font-bold text-red-500 uppercase hover:underline">Clear All</button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {files.map((file, i) => (
                <motion.div
                  key={`${file.name}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                      <FileIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{file.name}</p>
                      <p className="text-[10px] font-medium text-slate-400 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-700 border border-red-100">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        className="w-full flex items-center justify-center gap-3 rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
      >
        {uploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Uploading... {Math.round(progress)}%</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-6 w-6" />
            <span>Process & Generate Chronology</span>
          </>
        )}
      </button>
    </div>
  );
}
