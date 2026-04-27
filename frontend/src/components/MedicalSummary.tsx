"use client";

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, History, ChevronDown, ChevronUp, Calendar, User as UserIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#64748B'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-xl text-xs">
        <p className="font-bold text-slate-900">{payload[0].name}</p>
        <p className="text-blue-600 font-semibold">{payload[0].value} occurrences</p>
      </div>
    );
  }
  return null;
};

interface PastTreatment {
  date: string | null;
  provider: string;
  treatment: string;
  notes: string;
}

interface MedicalSummaryProps {
  medicalSummary: string | null;
  past_history?: string | null; // Added for compatibility with ChronologyData
  medical_summary?: string | null; // Added for compatibility with ChronologyData
  pastHistory: string | null;
  pastTreatments?: PastTreatment[];
  events: {
    id: number;
    date: string | null;
    event_type: string;
    description: string;
  }[];
}

export default function MedicalSummary({ medicalSummary, pastHistory, pastTreatments = [], events }: MedicalSummaryProps) {
  const [showPastTable, setShowPastTable] = useState(true);

  const typeDist = useMemo(() => {
    const counts: Record<string, number> = {};
    (events || []).forEach((ev) => {
      const t = ev.event_type || 'Other';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [events]);

  const totalEvents = typeDist.reduce((sum, d) => sum + d.value, 0);

  if (!medicalSummary && !pastHistory && typeDist.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden"
    >
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-5">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5" /> Executive Medical Summary
        </h3>
        <p className="text-blue-100 text-xs mt-1">AI-generated clinical case overview</p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary Text */}
          <div className="lg:col-span-2 space-y-6">
            {medicalSummary && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Case Summary
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{medicalSummary}</p>
              </div>
            )}
            {pastHistory && (
              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  <History className="w-3.5 h-3.5" />
                  Past Medical History
                </h4>
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5">
                  <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{pastHistory}</p>
                </div>
              </div>
            )}
            {!medicalSummary && !pastHistory && (
              <p className="text-sm text-slate-400 italic">Summary will be generated after file processing completes.</p>
            )}
          </div>

          {/* Recap Donut */}
          <div className="flex flex-col items-center">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Event Recap</h4>
            {typeDist.length > 0 ? (
              <>
                <div className="relative">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={typeDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {typeDist.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-slate-900">{totalEvents}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 w-full">
                  {typeDist.slice(0, 5).map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-semibold text-slate-600 truncate">{entry.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 ml-2">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 italic mt-8">No events yet</p>
            )}
          </div>
        </div>

        {/* ── Structured Past Treatment History Table ── */}
        {pastTreatments.length > 0 && (
          <div className="mt-8 border-t border-slate-100 pt-6">
            <button
              onClick={() => setShowPastTable(!showPastTable)}
              className="w-full flex items-center justify-between mb-4 group"
            >
              <h4 className="text-xs font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                Prior Visit Treatment Records
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                  {pastTreatments.length} records
                </span>
              </h4>
              <div className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                {showPastTable ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {showPastTable && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-amber-100 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-amber-50">
                          <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-amber-700 w-[14%]">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" /> Date
                            </div>
                          </th>
                          <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-amber-700 w-[20%]">
                            <div className="flex items-center gap-1.5">
                              <UserIcon className="w-3 h-3" /> Provider
                            </div>
                          </th>
                          <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-amber-700 w-[34%]">Treatment</th>
                          <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-amber-700 w-[32%]">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-50">
                        {pastTreatments.map((pt, i) => (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.2 }}
                            className="hover:bg-amber-50/30 transition-colors"
                          >
                            <td className="px-5 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                              {pt.date || 'TBD'}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-[10px] font-bold text-amber-800 border border-amber-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {pt.provider || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">{pt.treatment}</td>
                            <td className="px-5 py-3.5 text-xs text-slate-500 italic leading-relaxed">{pt.notes || '—'}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
