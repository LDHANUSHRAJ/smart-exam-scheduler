import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import TopicWeightForm from '../components/TopicWeightForm';
import { BookOpen, Trash2, AlertTriangle, AlertCircle, Sparkles, Upload, FileText, CheckCircle2 } from 'lucide-react';

const SetupTopicsView: React.FC = () => {
  const { exams, topicsByExam, fetchExams, fetchTopics, createTopic, deleteTopic, uploadTopics } = useStore();
  const [selectedExamId, setSelectedExamId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    fetchExams();
  }, []);

  // Set initial selected exam from navigation context or first exam
  useEffect(() => {
    const navExamId = localStorage.getItem('selected_exam_id_nav');
    if (navExamId) {
      setSelectedExamId(navExamId);
      localStorage.removeItem('selected_exam_id_nav');
    } else if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams]);

  // Fetch topics whenever selected exam changes
  useEffect(() => {
    if (selectedExamId) {
      fetchTopics(selectedExamId);
    }
  }, [selectedExamId]);

  const currentTopics = selectedExamId ? (topicsByExam[selectedExamId] || []) : [];

  // Calculate sum of weightages
  const totalWeightage = currentTopics.reduce((sum, t) => sum + t.weightage_percent, 0);

  const handleDeleteTopic = async (id: string) => {
    if (confirm('Are you sure you want to delete this topic?')) {
      try {
        await deleteTopic(id, selectedExamId);
      } catch (err) {
        alert('Failed to delete topic.');
      }
    }
  };

  const handleCreateTopic = async (data: any) => {
    await createTopic(data);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 className="section-title">Syllabus Weighting Manager</h2>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
          Deconstruct your exams into individual topics, assign relative weights, and specify difficulty to run the 0/1 Knapsack optimization engine.
        </p>
      </div>

      {exams.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '3rem' }}>
          <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '10px' }} />
          <h3>No Exams Scheduled Yet</h3>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem', margin: '8px 0 16px' }}>
            You must schedule at least one exam before managing syllabus topics.
          </p>
          <button className="btn btn-primary" onClick={() => {
            const storeState = useStore.getState();
            storeState.setView('setup-exams');
          }}>
            Go to Schedule Exams
          </button>
        </div>
      ) : (
        <>
          {/* Select Exam Dropdown */}
          <div className="glass-card" style={{ padding: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: '8px', textTransform: 'uppercase' }}>
              Select Exam to Manage
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ maxWidth: '400px' }}
            >
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.subject_name} ({exam.exam_date})
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            {/* Left: Form & Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <TopicWeightForm
                exams={exams}
                selectedExamId={selectedExamId}
                onSubmit={handleCreateTopic}
              />
              
              {/* File Upload card */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={18} style={{ color: '#a78bfa' }} /> Upload Syllabus File
                </h3>
                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', marginBottom: '12px' }}>
                  Upload a <strong>JSON</strong>, <strong>CSV</strong>, or plain <strong>TXT</strong> file to batch-import topics.
                </p>

                {uploadSuccess && (
                  <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '10px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} /> Topics imported successfully!
                  </div>
                )}

                {uploadError && (
                  <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {uploadError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    border: '1.5px dashed hsl(var(--card-border))',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.01)',
                    position: 'relative'
                  }}>
                    <input
                      type="file"
                      accept=".json,.csv,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setUploadFile(e.target.files[0]);
                          setUploadError('');
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <FileText size={24} style={{ color: '#a78bfa', margin: '0 auto 8px', opacity: 0.8 }} />
                    <span style={{ fontSize: '0.8rem', color: '#fff', display: 'block' }}>
                      {uploadFile ? uploadFile.name : 'Click to select or drag file here'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                      Supports .json, .csv, .txt
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {uploadFile && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => setUploadFile(null)}
                        disabled={uploading}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      disabled={!uploadFile || uploading || !selectedExamId}
                      onClick={async () => {
                        if (!uploadFile || !selectedExamId) return;
                        setUploading(true);
                        setUploadSuccess(false);
                        setUploadError('');
                        try {
                          await uploadTopics(selectedExamId, uploadFile);
                          setUploadSuccess(true);
                          setUploadFile(null);
                          setTimeout(() => setUploadSuccess(false), 3000);
                        } catch (err: any) {
                          const msg = err.response?.data?.detail || 'Failed to parse or upload file.';
                          setUploadError(msg);
                        } finally {
                          setUploading(false);
                        }
                      }}
                    >
                      {uploading ? 'Importing...' : 'Import Topics'}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '12px', borderTop: '1px solid hsl(var(--card-border))', paddingTop: '8px' }}>
                  <details style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}>
                    <summary style={{ outline: 'none', fontWeight: 600 }}>File Format Guide</summary>
                    <div style={{ marginTop: '6px', lineHeight: '1.4' }}>
                      <p><strong>TXT:</strong> One topic per line. E.g.:<br/><code>Topic Name, Difficulty(1-5), Weight(%), PastScore(%)</code></p>
                      <p style={{ marginTop: '4px' }}><strong>CSV:</strong> Must include a column containing 'name'. Optional columns: difficulty_score, weightage_percent, past_score_percent.</p>
                      <p style={{ marginTop: '4px' }}><strong>JSON:</strong> Array of objects:<br/><code>[{"{"}"name": "Topic A", "difficulty_score": 4, "weightage_percent": 25{"}"}]</code></p>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {/* Right: Topics List */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                  Syllabus Topics ({currentTopics.length})
                </h3>
                <span className="badge" style={{
                  background: totalWeightage === 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: totalWeightage === 100 ? '#10b981' : '#f59e0b',
                  border: totalWeightage === 100 ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.2)'
                }}>
                  Total Weight: {totalWeightage}%
                </span>
              </div>

              {totalWeightage > 0 && totalWeightage !== 100 && (
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(245, 158, 11, 0.06)', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8rem', color: '#fca5a5', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                  <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Current topic weights sum to <strong>{totalWeightage}%</strong>. While the scheduler works with any configuration, standard academic syllabus weights sum to 100% for full coverage.
                  </span>
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentTopics.map((topic) => (
                  <div key={topic.id} className="list-item" style={{ padding: '12px 14px' }}>
                    <div style={{ flex: 1 }}>
                      <div className="flex-between">
                        <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                          {topic.name}
                        </span>
                        <span className={`badge badge-difficulty-${topic.difficulty_score}`}>
                          Diff: {topic.difficulty_score}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                        <span>Weight: <strong>{topic.weightage_percent}%</strong></span>
                        {topic.estimated_hours && (
                          <span>Est: <strong>{topic.estimated_hours}h</strong></span>
                        )}
                        {topic.past_score_percent !== null && (
                          <span>Past Score: <strong>{topic.past_score_percent}%</strong></span>
                        )}
                        {topic.priority_score && (
                          <span style={{ color: '#c084fc', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Sparkles size={11} /> Priority: <strong>{topic.priority_score.toFixed(1)}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      className="btn btn-danger"
                      style={{ padding: '8px', minWidth: 'auto', marginLeft: '12px' }}
                      onClick={() => handleDeleteTopic(topic.id)}
                      title="Delete Topic"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                {currentTopics.length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic', border: '1px dashed hsl(var(--card-border))', borderRadius: '8px' }}>
                    No topics added for this exam yet. Add a topic using the form!
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SetupTopicsView;
