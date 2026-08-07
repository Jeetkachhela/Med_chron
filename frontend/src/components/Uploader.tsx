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
import { API_BASE } from '@/lib/api';

interface UploaderProps {
  onUploadComplete: (caseId: string) => void;
}

// Retry helper with exponential backoff
async function uploadWithRetry(
  url: string,
  formData: FormData,
  headers: Record<string, string>,
  onProgress: (loaded: number, total: number) => void,
  maxRetries = 2
): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await axios.post(url, formData, {
        headers,
        timeout: 300000, // 5 minutes
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (progressEvent) => {
          onProgress(progressEvent.loaded, progressEvent.total || 1);
        }
      });
      return; // Success
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryable = axios.isAxiosError(err) && (
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ECONNABORTED' ||
        err.message?.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
        (!err.response && err.message?.includes('timeout'))
      );

      if (isLastAttempt || !isRetryable) throw err;
      
      // Wait before retry (exponential backoff: 2s, 4s)
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

function getUploadErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.data?.detail) return err.response.data.detail;
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'Upload timed out. The file may be too large for the current connection. Please try again.';
    }
    if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
      return 'Network error during upload. Please check your internet connection and try again.';
    }
    if (err.message?.includes('ERR_HTTP2_PROTOCOL_ERROR')) {
      return 'Connection was reset during upload. Please try again — the server may have been busy.';
    }
  }
  return 'Upload failed. Please ensure the backend is running and try again.';
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
    maxSize: 50 * 1024 * 1024,
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
      const authToken = sessionStorage.getItem('auth_token');
      const authHeaders = { Authorization: `Bearer ${authToken}` };
      
      const caseRes = await axios.post(`${API_BASE}/cases/`, {
        patient_name: patientName,
        case_reference: caseRef || undefined,
        primary_complaint: "Medical Review",
        injury_cause: "Unknown"
      }, { headers: authHeaders, timeout: 30000 });
      
      const caseId = caseRes.data.case_id;
      setProgress(40);

      // Upload each file individually with retry logic
      const totalFiles = files.length;
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const singleFormData = new FormData();
        singleFormData.append('files', file);
        
        await uploadWithRetry(
          `${API_BASE}/cases/${caseId}/upload`,
          singleFormData,
          authHeaders,
          (loaded, total) => {
            const currentFileProgress = (loaded / total) * (55 / totalFiles);
            const baseProgress = 40 + (i * (55 / totalFiles));
            setProgress(Math.min(98, Math.round(baseProgress + currentFileProgress)));
          }
        );
      }
      setProgress(100);

      onUploadComplete(caseId);
    } catch (err: unknown) {
      console.error(err);
      setError(getUploadErrorMessage(err));
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-[var(--text-primary)]">New Clinical Analysis</h3>
        <p className="mt-2 text-[var(--text-secondary)] text-sm">Fill in the case details and upload medical records to begin extraction.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Patient Name *</label>
          <input
            type="text"
            placeholder="e.g. John Doe"
            className="w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-5 py-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] outline-none shadow-sm transition-all"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            disabled={uploading}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Case Reference (Optional)</label>
          <input
            type="text"
            placeholder="e.g. CASE-2024-001"
            className="w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-5 py-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] outline-none shadow-sm transition-all"
            value={caseRef}
            onChange={(e) => setCaseRef(e.target.value)}
            disabled={uploading}
          />
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-[2rem] border-2 border-dashed p-12 text-center transition-all ${
          isDragActive ? 'border-[var(--accent)] bg-[var(--accent-lighter)] shadow-inner' : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]'
        }`}
      >
        <input {...getInputProps()} />
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--accent-lighter)] text-[var(--accent)] mb-6">
          <FileUp className="h-10 w-10" />
        </div>
        <p className="text-lg font-bold text-[var(--text-primary)]">Drop medical records here</p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Only PDF files are supported. Max 50MB per file.</p>
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Selected Files ({files.length})</h4>
              <button onClick={() => setFiles([])} className="text-[10px] font-bold text-[var(--danger)] uppercase hover:underline">Clear All</button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {files.map((file, i) => (
                <motion.div
                  key={`${file.name}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                      <FileIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">{file.name}</p>
                      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
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
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--danger-light)] p-4 text-[var(--danger-text)] border border-[var(--danger-border)]">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[var(--accent)] py-4 text-lg font-bold text-white shadow-[var(--shadow-accent)] transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
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
