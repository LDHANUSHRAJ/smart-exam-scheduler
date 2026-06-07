import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { Calendar, Clock, AlertTriangle, Sparkles, Play, RefreshCw, Layers } from 'lucide-react';

const PlanView: React.FC = () => {
  const {
    user,
    exams,
    activePlan,
    isLoading,
    generatePlan,
    fetchActivePlan,
    setView
  } = useStore();

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyHours, setDailyHours] = useState(user?.daily_study_hours || 6);
  const [bufferDays, setBufferDays] = useState(1);
  const [includeWeekends, setIncludeWeekends] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivePlan();
  }, []);

  useEffect(() => {
    if (user) {
      setDailyHours(user.daily_study_hours);
    }
  }, [user]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await generatePlan({
        start_date: startDate,
        daily_study_hours: Number(dailyHours),
        buffer_days_before_exam: Number(bufferDays),
        include_weekends: includeWeekends,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate study plan. Make sure you have scheduled exams and added topics.');
    }
  };

  // Convert sessions_by_date Record to sorted list of dates
  const sortedDates = activePlan?.sessions_by_date
    ? Object.keys(activePlan.sessions_by_date).sort()
    : [];

  const totalSessions = activePlan?.sessions_by_date
    ? Object.values(activePlan.sessions_by_date).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 className="section-title">Optimal Study Plan</h2>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
          Execute the 0/1 Knapsack DP allocator and Conflict-Free scheduling engine to build your study schedule.
        </p>
      </div>

      {exams.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '3rem' }}>
          <AlertTriangle size={40} style={{ color: '#f59e0b', marginBottom: '10px' }} />
          <h3>No Exams Scheduled</h3>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem', margin: '8px 0 16px' }}>
            Schedule your exams first before running the plan generator.
          </p>
          <button className="btn btn-primary" onClick={() => setView('setup-exams')}>
            Go to Schedule Exams
          </button>
        </div>
      ) : (
        <div className="grid-2" style={{ gridTemplateColumns: activePlan ? '1fr 2fr' : '1fr' }}>
          {/* Plan Settings Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <form onSubmit={handleGenerate} className="glass-card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} style={{ color: '#8b5cf6' }} /> {activePlan ? 'Regenerate Study Plan' : 'Generate Study Plan'}
              </h3>

              {error && (
                <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label>Plan Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Daily Study Target: {dailyHours} Hrs</label>
                <input
                  type="range"
                  min="1"
                  max="16"
                  step="1"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Number(e.target.value))}
                  style={{ height: '4px', accentColor: '#8b5cf6', padding: 0, cursor: 'ew-resize' }}
                />
              </div>

              <div className="form-group">
                <label>Exam Buffer Days</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={bufferDays}
                  onChange={(e) => setBufferDays(Number(e.target.value))}
                  title="Number of rest/final review days before each exam"
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1.2rem' }}>
                <input
                  type="checkbox"
                  id="includeWeekends"
                  checked={includeWeekends}
                  onChange={(e) => setIncludeWeekends(e.target.checked)}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                <label htmlFor="includeWeekends" style={{ margin: 0, cursor: 'pointer' }}>
                  Study on Weekends
                </label>
              </div>

              <button type="submit" className="btn btn-primary w-full mt-4" disabled={isLoading} style={{ height: '45px' }}>
                {isLoading ? (
                  <span className="spinner" style={{ width: '16px', height: '16px' }} />
                ) : activePlan ? (
                  <>
                    <RefreshCw size={16} /> Regenerate/Adapt Plan
                  </>
                ) : (
                  <>
                    <Play size={16} /> Run Algorithmic Solver
                  </>
                )}
              </button>
            </form>

            {/* Quick Algorithm Info */}
            <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.03)', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
              <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} style={{ color: '#06b6d4' }} /> Engine Pipeline
              </h4>
              <p style={{ marginBottom: '6px' }}>
                1. <strong>Graph Coloring:</strong> Scans target exams and resolves timetable overlaps.
              </p>
              <p style={{ marginBottom: '6px' }}>
                2. <strong>0/1 Knapsack DP:</strong> Distributes study time across topics relative to difficulty & exam weightage.
              </p>
              <p>
                3. <strong>Greedy Replanner:</strong> Fits sessions within your daily hour limits and sleep schedule boundaries.
              </p>
            </div>
          </div>

          {/* Active Plan Detail Column */}
          {activePlan && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="flex-between" style={{ borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '12px', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Active Schedule</h3>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                    Range: {activePlan.valid_from} to {activePlan.valid_until}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6' }}>
                    {activePlan.total_study_hours.toFixed(1)} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'hsl(var(--muted-foreground))' }}>Hrs</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                    {totalSessions} Study Blocks
                  </span>
                </div>
              </div>

              {/* Plan Warnings */}
              {activePlan.warnings && activePlan.warnings.length > 0 && (
                <div className="mb-4" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activePlan.warnings.map((warn, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#fca5a5' }}>
                      <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Day-by-Day Timeline */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Timeline Itinerary
              </h4>
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '450px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sortedDates.map((dateStr) => {
                  const daySessions = activePlan.sessions_by_date[dateStr];
                  return (
                    <div key={dateStr} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '10px' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          color: '#a78bfa',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Calendar size={14} /> {dateStr}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '20px' }}>
                        {daySessions.map((s) => (
                          <div
                            key={s.id}
                            style={{
                              background: 'rgba(30, 41, 59, 0.2)',
                              border: '1px solid hsl(var(--card-border))',
                              borderLeft: `3px solid ${s.color_code || '#8b5cf6'}`,
                              borderRadius: '6px',
                              padding: '8px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div>
                              <strong style={{ color: '#fff' }}>{s.topic_name}</strong>
                              <span style={{ color: 'hsl(var(--muted-foreground))', marginLeft: '6px' }}>
                                ({s.exam_subject})
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'hsl(var(--muted-foreground))' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={12} /> {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                              </span>
                              <span className={`status-badge status-${s.status}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                {s.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlanView;
