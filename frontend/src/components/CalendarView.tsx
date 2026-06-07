import React, { useState } from 'react';
import type { CalendarEvent } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Bookmark } from 'lucide-react';

interface CalendarViewProps {
  events: CalendarEvent[];
  onSelectDate: (date: string) => void;
  selectedDate: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, onSelectDate, selectedDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get days in month
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Format date helper
  const formatDateString = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // Get events for a specific date
  const getEventsForDate = (dateStr: string) => {
    return events.filter(e => e.start.startsWith(dateStr));
  };

  // Generate calendar days
  const calendarCells = [];

  // Previous month padding cells
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const dateStr = formatDateString(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, d);
    calendarCells.push({
      dayNumber: d,
      dateString: dateStr,
      isCurrentMonth: false,
    });
  }

  // Current month cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDateString(year, month, d);
    calendarCells.push({
      dayNumber: d,
      dateString: dateStr,
      isCurrentMonth: true,
    });
  }

  // Next month padding cells
  const remainingCells = 42 - calendarCells.length; // 6 rows of 7
  for (let d = 1; d <= remainingCells; d++) {
    const dateStr = formatDateString(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, d);
    calendarCells.push({
      dayNumber: d,
      dateString: dateStr,
      isCurrentMonth: false,
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="glass-card">
      <div className="flex-between mb-4">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} style={{ color: '#8b5cf6' }} /> Study Calendar
        </h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={prevMonth}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, minWidth: '120px', textAlign: 'center' }}>
            {monthNames[month]} {year}
          </span>
          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={nextMonth}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="calendar-wrapper">
        <div className="calendar-container">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-header-day">{day}</div>
          ))}

          {calendarCells.map((cell, idx) => {
            const dayEvents = getEventsForDate(cell.dateString);
            const isSelected = cell.dateString === selectedDate;
            const isToday = cell.dateString === todayStr;

            // Color coded exams vs sessions
            const examEvents = dayEvents.filter(e => e.title.includes('EXAM') || e.extendedProps.exam_id);
            const studyEvents = dayEvents.filter(e => !e.title.includes('EXAM') && !e.extendedProps.exam_id);

            return (
              <div
                key={idx}
                className={`calendar-day-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}`}
                style={{
                  cursor: 'pointer',
                  borderColor: isSelected ? 'hsl(var(--primary))' : undefined,
                  boxShadow: isSelected ? '0 0 10px rgba(139, 92, 246, 0.4)' : undefined,
                  background: isSelected ? 'rgba(139, 92, 246, 0.12)' : undefined,
                }}
                onClick={() => onSelectDate(cell.dateString)}
              >
                <div className="calendar-day-number">{cell.dayNumber}</div>
                <div className="calendar-events-list">
                  {examEvents.map(e => (
                    <div
                      key={e.id}
                      className="calendar-mini-event"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.25)',
                        borderColor: '#ef4444',
                        borderLeftWidth: '3px',
                        color: '#fca5a5',
                        fontWeight: 'bold',
                      }}
                      title={e.title}
                    >
                      🚨 {e.title.replace('EXAM: ', '')}
                    </div>
                  ))}
                  {studyEvents.map(e => (
                    <div
                      key={e.id}
                      className="calendar-mini-event"
                      style={{
                        backgroundColor: e.backgroundColor || 'rgba(139, 92, 246, 0.2)',
                        borderColor: e.borderColor || '#8b5cf6',
                        borderLeftWidth: '3px',
                        color: '#fff',
                      }}
                      title={e.title}
                    >
                      {e.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '15px', justifyContent: 'center', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'rgba(239, 68, 68, 0.3)', borderLeft: '3px solid #ef4444', borderRadius: '2px' }} />
          <span>Exam Day</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'rgba(139, 92, 246, 0.3)', borderLeft: '3px solid #8b5cf6', borderRadius: '2px' }} />
          <span>Study Session</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'rgba(16, 185, 129, 0.3)', borderLeft: '3px solid #10b981', borderRadius: '2px' }} />
          <span>Completed Session</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
