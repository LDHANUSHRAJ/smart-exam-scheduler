import React, { useState } from 'react';
import type { Exam } from '../types';
import { Plus, Info } from 'lucide-react';

interface TopicWeightFormProps {
  exams: Exam[];
  selectedExamId?: string;
  onSubmit: (data: {
    exam_id: string;
    name: string;
    weightage_percent: number;
    difficulty_score: number;
    estimated_hours?: number;
    past_score_percent?: number;
  }) => Promise<void>;
}

const TopicWeightForm: React.FC<TopicWeightFormProps> = ({ exams, selectedExamId = '', onSubmit }) => {
  const [examId, setExamId] = useState(selectedExamId || (exams[0]?.id || ''));
  const [name, setName] = useState('');
  const [weightagePercent, setWeightagePercent] = useState<number>(20);
  const [difficultyScore, setDifficultyScore] = useState<number>(3);
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [pastScorePercent, setPastScorePercent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selectedExamId prop
  React.useEffect(() => {
    if (selectedExamId) {
      setExamId(selectedExamId);
    } else if (exams.length > 0 && !examId) {
      setExamId(exams[0].id);
    }
  }, [selectedExamId, exams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId) {
      setError('Please select an exam first.');
      return;
    }
    if (!name.trim()) {
      setError('Topic name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        exam_id: examId,
        name: name.trim(),
        weightage_percent: Number(weightagePercent),
        difficulty_score: Number(difficultyScore),
        estimated_hours: estimatedHours ? Number(estimatedHours) : undefined,
        past_score_percent: pastScorePercent ? Number(pastScorePercent) : undefined,
      });

      // Reset form on success
      setName('');
      setEstimatedHours('');
      setPastScorePercent('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add topic. Check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card">
      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Plus size={20} style={{ color: '#8b5cf6' }} /> Add Syllabus Topic
      </h3>

      {error && (
        <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      {!selectedExamId && (
        <div className="form-group">
          <label>Target Exam</label>
          <select value={examId} onChange={(e) => setExamId(e.target.value)} required>
            <option value="" disabled>Select an exam</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.subject_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label>Topic Name</label>
        <input
          type="text"
          placeholder="e.g. Dynamic Programming, Gas Laws, Organic Synthesis"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>Syllabus Weightage (%)</label>
          <input
            type="number"
            min="1"
            max="100"
            value={weightagePercent}
            onChange={(e) => setWeightagePercent(Number(e.target.value))}
            required
          />
        </div>

        <div className="form-group">
          <label>Difficulty Rating (1-5)</label>
          <select
            value={difficultyScore}
            onChange={(e) => setDifficultyScore(Number(e.target.value))}
            required
          >
            <option value="1">1 - Very Easy (Low Effort)</option>
            <option value="2">2 - Easy</option>
            <option value="3">3 - Moderate</option>
            <option value="4">4 - Hard</option>
            <option value="5">5 - Very Hard (High Effort)</option>
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>Est. Hours (Optional)</label>
          <input
            type="number"
            min="1"
            placeholder="Auto-calculated if blank"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Past Score % (Optional)</label>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="Prioritizes weak subjects"
            value={pastScorePercent}
            onChange={(e) => setPastScorePercent(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
        <Info size={16} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: '2px' }} />
        <span>
          <strong>Algorithmic priority:</strong> Harder topics, higher weightages, and lower past scores receive a higher weight in the 0/1 Knapsack optimization, yielding more study hours.
        </span>
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Adding Topic...' : 'Add Topic to Syllabus'}
      </button>
    </form>
  );
};

export default TopicWeightForm;
