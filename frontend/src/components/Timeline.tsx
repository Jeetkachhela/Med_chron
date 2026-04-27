"use client";

import React, { useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Clock, FileText, Activity, Stethoscope, Pill, Syringe, ClipboardList, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface Event {
  id: number;
  date: string;
  event_type: string;
  description: string;
  source_file: string;
  confidence: string;
}

interface TimelineProps {
  events: Event[];
}

const getEventIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('imaging') || t.includes('x-ray') || t.includes('mri')) return <Activity className="w-4 h-4" />;
  if (t.includes('surgery') || t.includes('procedure')) return <Syringe className="w-4 h-4" />;
  if (t.includes('prescription') || t.includes('medication')) return <Pill className="w-4 h-4" />;
  if (t.includes('visit') || t.includes('consultation') || t.includes('follow')) return <Stethoscope className="w-4 h-4" />;
  return <ClipboardList className="w-4 h-4" />;
};

const getEventAccent = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('imaging')) return { border: 'border-l-violet-500', badge: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' };
  if (t.includes('surgery')) return { border: 'border-l-red-500', badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' };
  if (t.includes('prescription') || t.includes('medication')) return { border: 'border-l-emerald-500', badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
  if (t.includes('follow')) return { border: 'border-l-cyan-500', badge: 'bg-cyan-50 text-cyan-700', dot: 'bg-cyan-500' };
  if (t.includes('visit') || t.includes('initial')) return { border: 'border-l-blue-500', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' };
  if (t.includes('therapy') || t.includes('chiro')) return { border: 'border-l-amber-500', badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
  if (t.includes('lab')) return { border: 'border-l-pink-500', badge: 'bg-pink-50 text-pink-700', dot: 'bg-pink-500' };
  return { border: 'border-l-slate-400', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };
};

export default function Timeline({ events }: TimelineProps) {
  // Group events by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    const sorted = [...(events || [])].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    sorted.forEach(event => {
      const dateObj = event.date ? parseISO(event.date) : null;
      const monthKey = dateObj && isValid(dateObj) ? format(dateObj, 'MMMM yyyy') : 'Date Unknown';
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(event);
    });
    return groups;
  }, [events]);

  if (!events || events.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-4">
          <Clock className="h-8 w-8" />
        </div>
        <p className="text-slate-500 font-medium italic">No events found for this case yet.</p>
      </div>
    );
  }

  const monthKeys = Object.keys(groupedByMonth);

  return (
    <div className="space-y-8">
      {monthKeys.map((month, mi) => (
        <div key={month}>
          {/* Month Header */}
          <div className="sticky top-0 z-10 mb-4">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">{month}</span>
              <span className="text-[10px] font-medium bg-white/20 rounded-full px-2 py-0.5 ml-1">
                {groupedByMonth[month].length} events
              </span>
            </div>
          </div>

          {/* Events */}
          <div className="space-y-3 ml-2">
            {groupedByMonth[month].map((event, index) => {
              const dateObj = event.date ? parseISO(event.date) : null;
              const formattedDate = dateObj && isValid(dateObj) ? format(dateObj, 'MMM dd, yyyy') : 'Date TBD';
              const accent = getEventAccent(event.event_type);

              return (
                <motion.div
                  key={event.id || `${mi}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all border-l-4 ${accent.border}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${accent.badge}`}>
                          {getEventIcon(event.event_type)}
                          {event.event_type}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">#{event.id}</span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">{event.description}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-100">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-600">{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50 text-[10px]">
                    <div className="flex items-center text-slate-400 font-bold uppercase tracking-wider">
                      <FileText className="w-3 h-3 mr-1" />
                      <span className="text-slate-500">{event.source_file}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
