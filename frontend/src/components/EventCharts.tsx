"use client";

import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';

interface Event {
  id: number;
  date: string | null;
  event_type: string;
  description: string;
  source_file: string;
}

const COLORS = [
  '#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE',
  '#10B981', '#34D399', '#6EE7B7', '#F59E0B', '#FBBF24',
  '#EF4444', '#F87171'
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white/95 backdrop-blur-sm p-3 shadow-2xl ring-1 ring-black/5">
        <p className="text-xs font-bold text-slate-900">{payload[0].name || payload[0].payload.month}</p>
        <p className="text-sm font-semibold text-blue-600">
          {payload[0].value} {payload[0].value === 1 ? 'Event' : 'Events'}
        </p>
      </div>
    );
  }
  return null;
};

export default function EventCharts({ events }: { events: Event[] }) {
  // ── Event Type Distribution (Donut) ──
  const typeDist = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(ev => {
      const t = ev.event_type || 'Unknown';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [events]);

  // ── Monthly Frequency (Area) ──
  const monthlyFreq = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(ev => {
      if (!ev.date) return;
      const d = new Date(ev.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        const [y, m] = month.split('-');
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        return { month: label, visits: count };
      });
  }, [events]);

  const totalEvents = events.length;

  if (events.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Area chart - spans 2 cols */}
      <div className="lg:col-span-2 rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Treatment Analytics</h3>
            <p className="text-xs text-slate-400 mt-1">Patient visit frequency over time</p>
          </div>
          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-bold text-blue-300 uppercase tracking-wider">
            {monthlyFreq.length} Months
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyFreq} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }} 
              dy={10}
            />
            <YAxis 
              allowDecimals={false} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="visits"
              stroke="#3B82F6"
              strokeWidth={2.5}
              fill="url(#colorVisits)"
              dot={{ r: 4, fill: '#3B82F6', stroke: '#1E293B', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#60A5FA', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-slate-500 mt-4 italic">
          Insight: {monthlyFreq.length > 0 ? `Peak activity in ${monthlyFreq.reduce((a, b) => a.visits > b.visits ? a : b).month} with ${monthlyFreq.reduce((a, b) => a.visits > b.visits ? a : b).visits} visits.` : 'No data available.'}
        </p>
      </div>

      {/* Donut chart */}
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Distribution</h3>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
            {typeDist.length} Types
          </span>
        </div>
        
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={typeDist}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
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
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: 0, height: 220 }}>
            <span className="text-3xl font-extrabold text-slate-900">{totalEvents}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {typeDist.slice(0, 6).map((entry, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[11px] font-semibold text-slate-600 truncate">{entry.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-900">{entry.value}</span>
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(entry.value / totalEvents) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
