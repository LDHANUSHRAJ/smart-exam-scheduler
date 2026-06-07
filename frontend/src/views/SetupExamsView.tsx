import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { Calendar, Trash2, Plus, Clock, Award, ChevronRight } from 'lucide-react';

const SetupExamsView: React.FC = () => {
  const { exams, createExam, deleteExam, fetchExams, fetchConflicts, setView } = useStore();
  const [subjectName, setSubjectName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('09:00');
  const [duration, setDuration] = useState('120');
  const [totalMarks, setTotalMarks] = useState('100');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!subjectName.trim()) {
      setError('Subject name is required.');
      setLoading(false);
      return;
    }
    if (!examDate) {
      setError('Exam date is required.');
      setLoading(false);
      return;
    }

    try {
      await createExam({
        subject_name: subjectName.trim(),
        exam_date: examDate,
        duration_minutes: duration ? Number(duration) : undefined,
        total_marks: totalMarks ? Number(totalMarks) : undefined,
      });

      // Reset form on success
      setSubjectName('');
      setExamDate('');
      setExamTime('09:00');
      setDuration('120');
      setTotalMarks('100');
      fetchConflicts(); // Refresh conflicts when schedule changes
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create exam.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this exam? This will also delete all associated topics and study sessions.')) {
      try {
        await deleteExam(id);
        fetchConflicts();
      } catch (err) {
        alert('Failed to delete exam.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 className="section-title">Schedule Exams</h2>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
          Add your examination dates to detect calendar conflicts and optimize your revision windows.
        </p>
      </div>

      <div className="grid-2">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} style={{ color: '#8b5cf6' }} /> Schedule New Exam
          </h3>

          {error && (
            <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Subject / Exam Title</label>
            <input
              type="text"
              placeholder="e.g. Advanced Calculus, Organic Chemistry"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Exam Date</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              required
            />
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label>Start Time (Optional)</label>
              <input
                type="time"
                value={examTime}
                onChange={(e) => setExamTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Duration (Mins)</label>
              <input
                type="number"
                min="10"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Total Marks</label>
              <input
                type="number"
                min="1"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
            {loading ? 'Scheduling...' : 'Add Exam to Calendar'}
          </button>
        </form>

        {/* Exams List Column */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.2rem', fontWeight: 600, color: '#fff' }}>
            Scheduled Exams ({exams.length})
          </h3>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="list-item"
                style={{
                  borderLeft: `4px solid ${exam.color_code || '#8b5cf6'}`,
                }}
              >
                <div>
                  <div className="list-item-title" style={{ fontWeight: 600, color: '#fff' }}>
                    {exam.subject_name}
                  </div>
                  <div className="list-item-meta" style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> {exam.exam_date}
                    </span>
                    {exam.duration_minutes && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> {exam.duration_minutes}m
                      </span>
                    )}
                    {exam.total_marks && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={13} /> {exam.total_marks} marks
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '0.8rem', borderColor: 'rgba(139, 92, 246, 0.3)' }}
                    onClick={() => {
                      setView('setup-topics');
                      // Wait, we can pass context, or set a selected exam in Zustand!
                      // In useStore, topicsByExam tracks topics, let's select this exam for adding topics.
                      // Let's implement active selection by writing to localStorage or similar, or simple state.
                      localStorage.setItem('selected_exam_id_nav', exam.id);
                    }}
                  >
                    Topics <ChevronRight size={13} />
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '8px', minWidth: 'auto' }}
                    onClick={() => handleDelete(exam.id)}
                    title="Delete Exam"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}

            {exams.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic', border: '1px dashed hsl(var(--card-border))', borderRadius: '8px' }}>
                No exams scheduled yet. Use the form on the left to add one!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupExamsView;
