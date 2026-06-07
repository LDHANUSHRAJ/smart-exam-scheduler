import React, { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import CalendarView from '../components/CalendarView';
import ConflictAlert from '../components/ConflictAlert';
import StudySessionCard from '../components/StudySessionCard';
import { Calendar, CheckCircle2, BookOpen, Clock, Settings, Save, AlertTriangle, AlertCircle } from 'lucide-react';
import { authApi } from '../api/client';

const DashboardView: React.FC = () => {
  const {
    user,
    exams,
    conflicts,
    calendarEvents,
    activePlan,
    progress,
    fetchExams,
    fetchConflicts,
    fetchActivePlan,
    fetchCalendarEvents,
    fetchProgress,
    completeSession,
    skipSession,
    fetchUser,
    setView
  } = useStore();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Constraint states
  const [dailyHours, setDailyHours] = useState(user?.daily_study_hours || 6);
  const [sleepStart, setSleepStart] = useState(user?.sleep_start_hour || 23);
  const [sleepEnd, setSleepEnd] = useState(user?.sleep_end_hour || 7);
  const [savingConstraints, setSavingConstraints] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchConflicts();
    fetchActivePlan();
    fetchCalendarEvents();
    fetchProgress();
  }, []);

  // Sync state with user data once loaded
  useEffect(() => {
    if (user) {
      setDailyHours(user.daily_study_hours);
      setSleepStart(user.sleep_start_hour);
      setSleepEnd(user.sleep_end_hour);
    }
  }, [user]);

  const handleSaveConstraints = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConstraints(true);
    setSaveSuccess(false);
    try {
      await authApi.updateConstraints({
        daily_study_hours: Number(dailyHours),
        sleep_start_hour: Number(sleepStart),
        sleep_end_hour: Number(sleepEnd)
      });
      await fetchUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // If plan is active, suggest regenerating to apply new constraints
      if (activePlan) {
        alert("Constraints updated! You should regenerate your study plan in the 'Study Plan' tab to apply the new study hours and sleep boundaries.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update constraints.");
    } finally {
      setSavingConstraints(false);
    }
  };

  // Find all topics across all exams to count
  const store = useStore.getState();
  const totalTopicsCount = Object.values(store.topicsByExam).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  // Filter study sessions for today or selected date
  const getSelectedDaySessions = () => {
    if (!activePlan || !activePlan.sessions_by_date) return [];
    return activePlan.sessions_by_date[selectedDate] || [];
  };

  const selectedSessions = getSelectedDaySessions();

  // Find next pending study session for today
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = activePlan?.sessions_by_date?.[todayStr] || [];
  const nextPendingSession = todaySessions.find(s => s.status === 'pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-header">
        <div>
          <h2 className="section-title">Welcome Back, {user?.full_name || 'Scholar'}!</h2>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
            Here is your optimal exam preparation status and study itinerary.
          </p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => setView('plan-view')}>
            <Calendar size={18} /> Manage Study Plan
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-card flex-between">
          <div>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600, textTransform: 'uppercase' }}>Target Exams</span>
            <h3 style={{ fontSize: '2rem', marginTop: '4px' }}>{exams.length}</h3>
          </div>
          <AlertCircle size={32} style={{ color: '#8b5cf6', opacity: 0.8 }} />
        </div>

        <div className="glass-card flex-between">
          <div>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600, textTransform: 'uppercase' }}>Syllabus Topics</span>
            <h3 style={{ fontSize: '2rem', marginTop: '4px' }}>{progress?.total_topics || totalTopicsCount}</h3>
          </div>
          <BookOpen size={32} style={{ color: '#06b6d4', opacity: 0.8 }} />
        </div>

        <div className="glass-card flex-between">
          <div>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600, textTransform: 'uppercase' }}>Studied Hours</span>
            <h3 style={{ fontSize: '2rem', marginTop: '4px' }}>{progress?.total_hours_studied.toFixed(1) || '0.0'}</h3>
          </div>
          <Clock size={32} style={{ color: '#10b981', opacity: 0.8 }} />
        </div>

        <div className="glass-card flex-between">
          <div>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600, textTransform: 'uppercase' }}>Topics Completed</span>
            <h3 style={{ fontSize: '2rem', marginTop: '4px' }}>
              {progress?.topics_completed || 0} <span style={{ fontSize: '1rem', color: 'hsl(var(--muted-foreground))' }}>/ {progress?.total_topics || 0}</span>
            </h3>
          </div>
          <CheckCircle2 size={32} style={{ color: '#f59e0b', opacity: 0.8 }} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Calendar & Schedule detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Conflict Banner Widget */}
          <ConflictAlert conflicts={conflicts} />

          {/* Monthly Calendar View */}
          <CalendarView
            events={calendarEvents}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* Details for Selected Day */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 600, color: '#fff' }}>
              Schedule for {selectedDate === todayStr ? 'Today' : selectedDate}
            </h3>

            {selectedSessions.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {selectedSessions.map((session) => (
                  <StudySessionCard
                    key={session.id}
                    session={session}
                    onComplete={completeSession}
                    onSkip={skipSession}
                  />
                ))}
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic', fontSize: '0.9rem', border: '1px dashed hsl(var(--card-border))', borderRadius: '8px' }}>
                No study sessions scheduled for this day.
                {!activePlan && (
                  <div style={{ marginTop: '8px' }}>
                    <button className="btn btn-primary btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setView('plan-view')}>
                      Generate Study Plan
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Next Session, Personal Constraints, Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Next Up Study session */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: '#a78bfa' }} /> Next Session Today
            </h3>
            {nextPendingSession ? (
              <StudySessionCard
                session={nextPendingSession}
                onComplete={completeSession}
                onSkip={skipSession}
              />
            ) : todaySessions.length > 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                🎉 You are all caught up on your scheduled sessions for today! Enjoy your break.
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
                No study sessions scheduled for today.
              </div>
            )}
          </div>

          {/* Personal Constraints Solver Settings */}
          <form onSubmit={handleSaveConstraints} className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} style={{ color: '#06b6d4' }} /> Study Constraints
            </h3>

            {saveSuccess && (
              <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                Constraints updated successfully!
              </div>
            )}

            <div className="form-group">
              <label>Daily Study Target: {dailyHours} Hrs</label>
              <input
                type="range"
                min="1"
                max="16"
                step="1"
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                style={{ height: '4px', accentColor: '#06b6d4', padding: 0, cursor: 'ew-resize' }}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Sleep Start (24h)</label>
                <select value={sleepStart} onChange={(e) => setSleepStart(Number(e.target.value))}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Sleep End (24h)</label>
                <select value={sleepEnd} onChange={(e) => setSleepEnd(Number(e.target.value))}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-secondary w-full flex-gap-2" disabled={savingConstraints} style={{ borderColor: 'rgba(6, 182, 212, 0.3)' }}>
              <Save size={15} /> {savingConstraints ? 'Saving...' : 'Update Constraints'}
            </button>
          </form>

          {/* Quick instructions / tips */}
          <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.03)' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '6px' }}>Dynamic Exam Planner Guide</h4>
            <ul style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Schedule exams in <strong>Schedule Exams</strong>.</li>
              <li>Add topics, weightage & past scores in <strong>Syllabus weighting</strong>.</li>
              <li>Generate or adapt your customized study plan in <strong>Study Plan</strong>.</li>
              <li>Mark sessions complete to track preparation in real-time.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
