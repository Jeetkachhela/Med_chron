"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Flag {
  id: number;
  type: string;
  description: string;
  severity: string;
  source_file: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; text: string; ring: string; chartColor: string }> = {
  High: { color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-100', chartColor: '#EF4444' },
  Medium: { color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-100', chartColor: '#F59E0B' },
  Low: { color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-100', chartColor: '#10B981' },
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-xl text-xs">
        <p className="font-bold text-slate-900">{payload[0].name} Severity</p>
        <p className="text-slate-600 font-semibold">{payload[0].value} flags</p>
      </div>
    );
  }
  return null;
};

export default function FlagsPanel({ flags }: { flags: Flag[] }) {
  const severityDist = useMemo(() => {
    const counts: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
    (flags || []).forEach(f => {
      const sev = f.severity || 'Medium';
      counts[sev] = (counts[sev] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [flags]);

  if (!flags?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden"
    >
      <div className="px-8 py-6 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" /> Risk & Flags Analysis
        </h3>
        <p className="text-xs text-slate-400 mt-1">{flags.length} clinical flags identified</p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Severity Donut */}
          <div className="lg:col-span-2 flex flex-col items-center">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Severity Distribution</h4>
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={severityDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {severityDist.map((entry, i) => (
                      <Cell key={i} fill={SEVERITY_CONFIG[entry.name]?.chartColor || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-slate-900">{flags.length}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Flags</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              {severityDist.map(entry => {
                const config = SEVERITY_CONFIG[entry.name] || SEVERITY_CONFIG.Medium;
                return (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
                    <span className="text-[10px] font-bold text-slate-500">{entry.name} ({entry.value})</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flags List */}
          <div className="lg:col-span-3 space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {flags.map((flag, i) => {
              const config = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.Medium;
              return (
                <motion.div
                  key={flag.id || i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`p-4 rounded-2xl border ${config.bg} ${config.ring} ring-1`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${config.text}`} />
                      <span className={`text-xs font-bold uppercase ${config.text}`}>{flag.type}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.bg} ${config.text}`}>
                      {flag.severity}
                    </span>
                  </div>
                  <p className={`text-sm font-medium ${config.text}`}>{flag.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
