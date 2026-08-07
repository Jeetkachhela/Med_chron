"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Diagnostic {
  id: number;
  date: string | null;
  test_name: string;
  findings: string;
  clinical_significance: string;
  source_file: string;
}

const PAGE_SIZE = 8;

const getSignificanceBadge = (sig: string) => {
  const s = (sig || '').toLowerCase();
  if (s.includes('critical') || s.includes('severe') || s.includes('urgent'))
    return { dot: 'bg-red-500', bg: 'bg-[var(--danger-light)]', text: 'text-[var(--danger)]', label: 'Critical' };
  if (s.includes('significant') || s.includes('abnormal') || s.includes('moderate'))
    return { dot: 'bg-amber-500', bg: 'bg-[var(--warning-light)]', text: 'text-[var(--warning)]', label: 'Moderate' };
  return { dot: 'bg-emerald-500', bg: 'bg-[var(--success-light)]', text: 'text-[var(--success)]', label: 'Normal' };
};

export default function DiagnosticsTable({ diagnostics }: { diagnostics: Diagnostic[] }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return diagnostics || [];
    const q = search.toLowerCase();
    return (diagnostics || []).filter(d =>
      d.test_name?.toLowerCase().includes(q) ||
      d.findings?.toLowerCase().includes(q) ||
      d.clinical_significance?.toLowerCase().includes(q)
    );
  }, [diagnostics, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!diagnostics?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] overflow-hidden"
    >
      <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-500" /> Diagnostic Highlights
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">{diagnostics.length} diagnostic records found</p>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search diagnostics..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-xs focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg)]/80">
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-[12%]">Date</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-[20%]">Test Name</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-[35%]">Findings</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-[23%]">Significance</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-[10%]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paged.map((diag, i) => {
              const badge = getSignificanceBadge(diag.clinical_significance);
              return (
                <tr key={diag.id || i} className="hover:bg-[var(--surface-hover)] transition-colors">
                  <td className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                    {diag.date || 'TBD'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{diag.test_name}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-[var(--text-secondary)] leading-relaxed max-w-md">
                    {diag.findings}
                  </td>
                  <td className="px-6 py-4 text-xs text-[var(--text-secondary)] leading-relaxed">
                    {diag.clinical_significance}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-8 py-4 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
