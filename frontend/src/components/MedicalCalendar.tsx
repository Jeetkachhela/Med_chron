"use client";

import React, { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils'; // I'll add this utility if needed, but I'll use a simple helper here

interface Event {
  id: number;
  date: string | null;
  event_type: string;
}

export default function MedicalCalendar({ events }: { events: Event[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach(ev => {
      if (!ev.date) return;
      const d = ev.date; // YYYY-MM-DD
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    });
    return map;
  }, [events]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1);
    setCurrentMonth(newMonth);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = new Date(parseInt(e.target.value), currentMonth.getMonth(), 1);
    setCurrentMonth(newYear);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const selectedDayEvents = eventsByDate[selectedDate] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Monthly View</h4>
        <div className="flex items-center gap-2">
          <select 
            value={currentMonth.getMonth()} 
            onChange={handleMonthChange}
            className="text-[11px] font-bold text-[var(--text-primary)] bg-[var(--input-bg)] border-[var(--input-border)] rounded-lg py-1 px-2 focus:ring-0 cursor-pointer"
          >
            {months.map((month, i) => (
              <option key={month} value={i}>{month.toUpperCase()}</option>
            ))}
          </select>
          <select 
            value={currentMonth.getFullYear()} 
            onChange={handleYearChange}
            className="text-[11px] font-bold text-[var(--text-primary)] bg-[var(--input-bg)] border-[var(--input-border)] rounded-lg py-1 px-2 focus:ring-0 cursor-pointer"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <div className="flex items-center gap-0.5 ml-1">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-[10px] font-black text-[var(--text-muted)] text-center py-1">
            {day}
          </div>
        ))}
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateStr] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const hasEvents = dayEvents.length > 0;
          const isSelected = selectedDate === dateStr;

          return (
            <button 
              key={i} 
              onClick={() => setSelectedDate(dateStr)}
              className={`
                relative flex aspect-square items-center justify-center rounded-lg text-[10px] font-bold transition-all
                ${!isCurrentMonth ? 'text-slate-200' : 'text-[var(--text-secondary)]'}
                ${isSelected ? 'ring-2 ring-[var(--accent)] ring-offset-2' : ''}
                ${hasEvents ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]' : 'hover:bg-[var(--surface-hover)]'}
              `}
            >
              {format(day, 'd')}
              {hasEvents && dayEvents.length > 1 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white ring-1 ring-white">
                  {dayEvents.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Mini Legend */}
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
            {format(parseISO(selectedDate), 'MMM dd')} Events
          </p>
          <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-lighter)] px-1.5 py-0.5 rounded">
            {selectedDayEvents.length} Total
          </span>
        </div>
        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
          {selectedDayEvents.map((e, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />
              <span className="text-[10px] font-medium text-[var(--text-secondary)] truncate group-hover:text-[var(--accent)] transition-colors" title={e.event_type}>
                {e.event_type}
              </span>
            </div>
          ))}
          {selectedDayEvents.length === 0 && (
            <p className="text-[10px] text-[var(--text-muted)] italic">No visits or events for this date.</p>
          )}
        </div>
      </div>
    </div>
  );
}
