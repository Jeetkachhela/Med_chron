"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, Activity, Stethoscope, AlertTriangle, FileText, FolderOpen 
} from 'lucide-react';

interface DashboardStatsProps {
  patientName: string;
  eventCount: number;
  diagnosticCount: number;
  treatmentCount: number;
  flagCount: number;
  fileCount: number;
}

const stats = [
  { key: 'patient', label: 'Patient', icon: User, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' },
  { key: 'events', label: 'Clinical Events', icon: Activity, gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
  { key: 'diagnostics', label: 'Diagnostics', icon: Activity, gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100' },
  { key: 'treatments', label: 'Treatments', icon: Stethoscope, gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', ring: 'ring-cyan-100' },
  { key: 'flags', label: 'Critical Flags', icon: AlertTriangle, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', ring: 'ring-amber-100' },
  { key: 'files', label: 'Source Files', icon: FolderOpen, gradient: 'from-slate-500 to-slate-600', bg: 'bg-slate-50', ring: 'ring-slate-100' },
];

export default function DashboardStats({ patientName, eventCount, diagnosticCount, treatmentCount, flagCount, fileCount }: DashboardStatsProps) {
  const values: Record<string, string | number> = {
    patient: patientName || '--',
    events: eventCount,
    diagnostics: diagnosticCount,
    treatments: treatmentCount,
    flags: flagCount,
    files: fileCount,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.35 }}
          className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ${stat.ring} hover:shadow-md transition-shadow`}
        >
          {/* Accent bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
          
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} mb-3`}>
            <stat.icon className={`h-5 w-5 ${
              stat.key === 'flags' ? 'text-amber-600' : 
              stat.key === 'patient' ? 'text-blue-600' : 
              'text-slate-600'
            }`} />
          </div>
          
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
          <p className={`font-extrabold text-slate-900 ${stat.key === 'patient' ? 'text-sm truncate' : 'text-2xl'}`}>
            {values[stat.key]}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
