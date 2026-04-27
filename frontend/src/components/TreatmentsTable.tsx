"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Treatment {
  id: number;
  date: string | null;
  provider: string;
  treatment: string;
  notes: string;
  source_file: string;
}

const PAGE_SIZE = 8;

export default function TreatmentsTable({ treatments }: { treatments: Treatment[] }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return treatments || [];
    const q = search.toLowerCase();
    return (treatments || []).filter(t =>
      t.treatment?.toLowerCase().includes(q) ||
      t.provider?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q)
    );
  }, [treatments, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!treatments?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden"
    >
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-500" /> Treatment History
          </h3>
          <p className="text-xs text-slate-400 mt-1">{treatments.length} treatment records found</p>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input
            type="text"
            placeholder="Search treatments..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 w-[12%]">Date</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 w-[20%]">Provider</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 w-[35%]">Treatment</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 w-[33%]">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paged.map((trt, i) => (
              <motion.tr 
                key={trt.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="px-6 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {trt.date || 'TBD'}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {trt.provider || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                  {trt.treatment}
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 italic leading-relaxed">
                  {trt.notes || '—'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
