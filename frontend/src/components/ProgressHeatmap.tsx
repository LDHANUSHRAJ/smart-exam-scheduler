import React from 'react';
import type { HeatmapEntry } from '../types';
import { Award, ShieldAlert, BarChart3 } from 'lucide-react';
import { topicsApi } from '../api/client';
import useStore from '../store/useStore';

interface ProgressHeatmapProps {
  entries: HeatmapEntry[];
  subjects: string[];
  onRefresh: () => void;
}

const ProgressHeatmap: React.FC<ProgressHeatmapProps> = ({ entries, subjects, onRefresh }) => {
  const fetchProgress = useStore((state) => state.fetchProgress);
  const fetchActivePlan = useStore((state) => state.fetchActivePlan);

  const getHeatmapColor = (percent: number) => {
    if (percent === 0) return 'rgba(239, 68, 68, 0.15)'; // Reddish
    if (percent < 40) return 'rgba(245, 158, 11, 0.2)'; // Orange-ish
    if (percent < 75) return 'rgba(59, 130, 246, 0.25)'; // Blueish
    return 'rgba(16, 185, 129, 0.3)'; // Greenish
  };

  const getHeatmapBorderColor = (percent: number) => {
    if (percent === 0) return 'rgba(239, 68, 68, 0.4)';
    if (percent < 40) return 'rgba(245, 158, 11, 0.5)';
    if (percent < 75) return 'rgba(59, 130, 246, 0.6)';
    return 'rgba(16, 185, 129, 0.8)';
  };

  const handleSliderChange = async (topicName: string, subject: string, value: number) => {
    // Find matching topic in entries to find database ID
    // Wait, entries contain topic names, but to update progress we need the Topic ID.
    // We can fetch from store.topicsByExam. Let's look up in our global state!
    const store = useStore.getState();
    let topicIdToUpdate = '';
    
    // Find the exam ID for this subject
    const exam = store.exams.find(e => e.subject_name === subject);
    if (exam) {
      const examTopics = store.topicsByExam[exam.id] || [];
      const topic = examTopics.find(t => t.name === topicName);
      if (topic) {
        topicIdToUpdate = topic.id;
      }
    }

    if (topicIdToUpdate) {
      try {
        await topicsApi.updateProgress(topicIdToUpdate, value);
        // Refresh local component data & global state
        onRefresh();
        fetchProgress();
        if (exam) {
          store.fetchTopics(exam.id);
        }
      } catch (err) {
        console.error('Failed to update progress', err);
      }
    }
  };

  if (subjects.length === 0) {
    return (
      <div className="glass-card text-center" style={{ padding: '2rem' }}>
        <BarChart3 size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '10px' }} />
        <h4 style={{ color: 'hsl(var(--muted-foreground))' }}>No progress data available</h4>
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>
          Add exams and syllabus topics to view preparation heatmaps.
        </p>
      </div>
    );
  }

  return (
    <div className="heatmap">
      {subjects.map((subject) => {
        const subjectEntries = entries.filter((e) => e.exam_subject === subject);
        
        // Calculate average completion for subject
        const avgCompletion = subjectEntries.length > 0 
          ? Math.round(subjectEntries.reduce((sum, e) => sum + e.completion_percent, 0) / subjectEntries.length)
          : 0;

        return (
          <div key={subject} className="heatmap-subject-card">
            <div className="heatmap-subject-title flex-between">
              <span>{subject}</span>
              <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                {avgCompletion}% Complete
              </span>
            </div>
            
            <div className="heatmap-topics-list">
              {subjectEntries.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    background: getHeatmapColor(entry.completion_percent),
                    border: `1px solid ${getHeatmapBorderColor(entry.completion_percent)}`,
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div className="flex-between">
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                      {entry.topic_name}
                    </span>
                    <span className={`badge badge-difficulty-${entry.difficulty_score}`}>
                      D{entry.difficulty_score}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    <span>Weight: {entry.priority_score.toFixed(1)}</span>
                    <span>•</span>
                    <span>Progress: {entry.completion_percent}%</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={entry.completion_percent}
                      onChange={(e) => handleSliderChange(entry.topic_name, subject, Number(e.target.value))}
                      style={{
                        height: '4px',
                        accentColor: '#8b5cf6',
                        padding: 0,
                        margin: 0,
                        cursor: 'ew-resize',
                      }}
                    />
                  </div>
                </div>
              ))}
              {subjectEntries.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                  No topics defined.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProgressHeatmap;
