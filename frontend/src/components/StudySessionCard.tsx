import React from 'react';
import type { StudySession } from '../types';
import { CheckCircle, XCircle, Clock, Zap, FileText } from 'lucide-react';

interface StudySessionCardProps {
  session: StudySession;
  onComplete: (id: string) => void;
  onSkip: (id: string, reason?: string) => void;
}

const StudySessionCard: React.FC<StudySessionCardProps> = ({ session, onComplete, onSkip }) => {
  const { id, topic_name, exam_subject, start_time, end_time, duration_minutes, priority_score, status, color_code } = session;

  const cardStyle = {
    '--subject-color': color_code || '#8b5cf6',
  } as React.CSSProperties;

  const handleSkipClick = () => {
    const reason = prompt('Enter reason for skipping (optional):');
    if (reason !== null) {
      onSkip(id, reason || undefined);
    }
  };

  return (
    <div className="glass-card study-card mb-4" style={cardStyle}>
      <div className="study-card-header">
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--subject-color)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            {exam_subject}
          </span>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>{topic_name}</h4>
        </div>
        <span className={`status-badge status-${status}`}>{status}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', margin: '12px 0', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={15} style={{ color: 'var(--subject-color)' }} />
          <span>
            {start_time.slice(0, 5)} - {end_time.slice(0, 5)} ({duration_minutes} mins)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Zap size={15} style={{ color: '#eab308' }} />
          <span>Priority Score: {priority_score.toFixed(1)}</span>
        </div>
      </div>

      {status === 'pending' && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', borderTop: '1px solid hsl(var(--card-border))', paddingTop: '12px' }}>
          <button
            className="btn btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              background: 'var(--success-gradient)',
              boxShadow: '0 4px 12px 0 rgba(16, 185, 129, 0.2)',
              flex: 1,
            }}
            onClick={() => onComplete(id)}
          >
            <CheckCircle size={15} /> Complete
          </button>
          <button
            className="btn btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              flex: 1,
            }}
            onClick={handleSkipClick}
          >
            <XCircle size={15} style={{ color: '#ef4444' }} /> Skip Block
          </button>
        </div>
      )}

      {status === 'completed' && (
        <div style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontWeight: 500 }}>
          <CheckCircle size={14} /> Completed successfully!
        </div>
      )}

      {status === 'skipped' && (
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontStyle: 'italic' }}>
          <XCircle size={14} /> Skipped study block
        </div>
      )}
    </div>
  );
};

export default StudySessionCard;
