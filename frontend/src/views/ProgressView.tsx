import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import ProgressHeatmap from '../components/ProgressHeatmap';
import { progressApi } from '../api/client';
import type { HeatmapEntry } from '../types';
import { BarChart3, Award, Clock, CheckCircle2, AlertOctagon, TrendingUp } from 'lucide-react';

const ProgressView: React.FC = () => {
  const { progress, fetchProgress } = useStore();
  const [heatmapData, setHeatmapData] = useState<{ entries: HeatmapEntry[]; subjects: string[] }>({
    entries: [],
    subjects: [],
  });
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  const loadHeatmap = async () => {
    setLoadingHeatmap(true);
    try {
      const { data } = await progressApi.getHeatmap();
      setHeatmapData(data);
    } catch (err) {
      console.error('Failed to load heatmap data', err);
    } finally {
      setLoadingHeatmap(false);
    }
  };

  useEffect(() => {
    fetchProgress();
    loadHeatmap();
  }, []);

  const overallPercent = progress?.overall_completion_percent || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 className="section-title">Preparation Tracker</h2>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
          Analyze your syllabus preparation progress, study statistics, and topic weighting heatmaps.
        </p>
      </div>

      {progress ? (
        <>
          {/* Key Progress Metrics */}
          <div className="grid-3">
            {/* Completion Rate Card */}
            <div className="glass-card">
              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600, textTransform: 'uppercase' }}>Overall syllabus completion</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 700 }}>{Math.round(overallPercent)}%</h2>
                <TrendingUp size={20} style={{ color: '#10b981' }} />
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${overallPercent}%` }} />
              </div>
            </div>

            {/* Preparation Hours Card */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: '12px', color: '#10b981' }}>
                <Clock size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
                  Studied Time
                </span>
                <h3 style={{ fontSize: '1.8rem', margin: '4px 0 0' }}>
                  {progress.total_hours_studied.toFixed(1)}{' '}
                  <span style={{ fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>Hrs</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                  across {progress.total_sessions} sessions
                </span>
              </div>
            </div>

            {/* Study Block Stats Card */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '12px', borderRadius: '12px', color: '#a78bfa' }}>
                <Award size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
                  Session Performance
                </span>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>Completed</span>
                    <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>{progress.sessions_completed}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>Skipped</span>
                    <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '1.1rem' }}>{progress.sessions_skipped}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>Pending</span>
                    <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: '1.1rem' }}>{progress.sessions_pending}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Heatmap Area */}
          <div className="glass-card">
            <div className="flex-between mb-4">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={20} style={{ color: '#8b5cf6' }} /> Interactive Syllabus Heatmap
                </h3>
                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem', marginTop: '2px' }}>
                  Adjust the sliders to update topic preparation progress in real-time. Shading represents completion strength.
                </p>
              </div>
              {loadingHeatmap && <span className="spinner" style={{ width: '16px', height: '16px' }} />}
            </div>

            <ProgressHeatmap
              entries={heatmapData.entries}
              subjects={heatmapData.subjects}
              onRefresh={loadHeatmap}
            />
          </div>
        </>
      ) : (
        <div className="glass-card text-center" style={{ padding: '3rem' }}>
          <AlertOctagon size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '10px' }} />
          <h3>No Preparation Data Found</h3>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem', marginTop: '8px' }}>
            Generate a study plan and execute study sessions to begin logging progress statistics.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgressView;
