import React, { useEffect } from 'react';
import useStore from './store/useStore';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import SetupExamsView from './views/SetupExamsView';
import SetupTopicsView from './views/SetupTopicsView';
import PlanView from './views/PlanView';
import ProgressView from './views/ProgressView';
import { Award, LogOut, LayoutDashboard, CalendarRange, BookOpen, BarChart3, Settings } from 'lucide-react';

const App: React.FC = () => {
  const { isAuthenticated, user, currentView, setView, fetchUser, logout } = useStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  }, [isAuthenticated]);

  // If not authenticated, always show Login/Register view
  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <LoginView />
      </div>
    );
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'setup-exams':
        return <SetupExamsView />;
      case 'setup-topics':
        return <SetupTopicsView />;
      case 'plan-view':
        return <PlanView />;
      case 'progress':
        return <ProgressView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="app-container">
      {/* Premium Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setView('dashboard')}>
            <Award size={24} style={{ strokeWidth: 2.5 }} />
            <span>EXAMFLOW</span>
          </div>

          <div className="nav-links">
            <button
              onClick={() => setView('dashboard')}
              className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none' }}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button
              onClick={() => setView('setup-exams')}
              className={`nav-link ${currentView === 'setup-exams' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none' }}
            >
              <CalendarRange size={16} /> Schedule Exams
            </button>
            <button
              onClick={() => setView('setup-topics')}
              className={`nav-link ${currentView === 'setup-topics' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none' }}
            >
              <BookOpen size={16} /> Syllabus Weighting
            </button>
            <button
              onClick={() => setView('plan-view')}
              className={`nav-link ${currentView === 'plan-view' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none' }}
            >
              <CalendarRange size={16} /> Study Plan
            </button>
            <button
              onClick={() => setView('progress')}
              className={`nav-link ${currentView === 'progress' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none' }}
            >
              <BarChart3 size={16} /> Progress
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {user && (
              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>
                {user.full_name || user.email}
              </span>
            )}
            <button
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: 'rgba(239, 68, 68, 0.25)',
                color: '#fca5a5'
              }}
              onClick={logout}
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Render */}
      <main className="main-content">
        {renderActiveView()}
      </main>
    </div>
  );
};

export default App;
