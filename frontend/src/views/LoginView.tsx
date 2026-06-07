import React, { useState } from 'react';
import useStore from '../store/useStore';
import { Lock, Mail, UserPlus, LogIn, Award } from 'lucide-react';

const LoginView: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, fullName || undefined);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card text-center">
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
            }}
          >
            <Award size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', color: '#fff' }}>
            Smart Exam Scheduler
          </h2>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem', marginTop: '4px' }}>
            {isRegister ? 'Create an account to start optimization' : 'Log in to optimize your preparation'}
          </p>
        </div>

        {error && (
          <div
            style={{
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.08)',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1.2rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              textAlign: 'left',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {isRegister && (
            <div className="form-group">
              <label>Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <UserPlus
                  size={16}
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '40px' }}
              />
              <Mail
                size={16}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '40px' }}
              />
              <Lock
                size={16}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ height: '45px' }}>
            {loading ? (
              <span className="spinner" style={{ width: '16px', height: '16px' }} />
            ) : isRegister ? (
              <>
                <UserPlus size={18} /> Register Account
              </>
            ) : (
              <>
                <LogIn size={18} /> Log In
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid hsl(var(--card-border))', paddingTop: '1rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'hsl(var(--muted-foreground))' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
          </span>{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#a78bfa',
              fontWeight: 600,
              padding: 0,
              marginLeft: '4px',
              textDecoration: 'underline',
            }}
          >
            {isRegister ? 'Log in here' : 'Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
