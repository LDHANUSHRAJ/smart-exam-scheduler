import React from 'react';
import type { ConflictSummary } from '../types';
import { AlertTriangle, Layers, Info } from 'lucide-react';

interface ConflictAlertProps {
  conflicts: ConflictSummary | null;
}

const ConflictAlert: React.FC<ConflictAlertProps> = ({ conflicts }) => {
  if (!conflicts) return null;

  const { conflict_pairs, chromatic_number, total_conflicts } = conflicts;

  if (total_conflicts === 0) {
    return (
      <div className="glass-card mb-4" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.04)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ color: '#10b981', display: 'flex' }}>
            <Info size={24} />
          </div>
          <div>
            <h4 style={{ color: '#a7f3d0', fontSize: '1rem', fontWeight: 600 }}>No Exam Conflicts Detected</h4>
            <p style={{ color: '#a7f3d0', opacity: 0.8, fontSize: '0.85rem', marginTop: '2px' }}>
              Your exam schedule is fully spread out. Chromatic Number: {chromatic_number} (Minimum parallel study slots required: 1).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card mb-4" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.04)' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ color: '#ef4444', display: 'flex', marginTop: '2px' }}>
          <AlertTriangle size={24} />
        </div>
        <div>
          <h4 style={{ color: '#fca5a5', fontSize: '1.05rem', fontWeight: 600 }}>
            Exam Conflicts Detected ({total_conflicts})
          </h4>
          <p style={{ color: '#fca5a5', opacity: 0.85, fontSize: '0.85rem', marginTop: '2px' }}>
            Your exams are clustered. Optimal conflict grouping (Graph Coloring) requires a <strong>chromatic number of {chromatic_number}</strong>. This means you need at least {chromatic_number} distinct study tracks to avoid study congestion.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        {conflict_pairs.map((pair, index) => (
          <div
            key={index}
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem',
            }}
          >
            <div>
              <strong style={{ color: '#fff' }}>{pair.exam_a_name || pair.exam_a}</strong>
              <span style={{ color: 'hsl(var(--muted-foreground))', margin: '0 8px' }}>vs</span>
              <strong style={{ color: '#fff' }}>{pair.exam_b_name || pair.exam_b}</strong>
            </div>
            <span
              className="status-badge"
              style={{
                background: pair.days_apart === 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                color: pair.days_apart === 0 ? '#ef4444' : '#f59e0b',
                border: pair.days_apart === 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(245,158,11,0.2)',
              }}
            >
              {pair.days_apart === 0 ? 'Same Day Overlap' : `${pair.days_apart} Day${pair.days_apart > 1 ? 's' : ''} Apart`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConflictAlert;
