import React, { useState, useEffect } from 'react';
import { useCandidateSync } from './hooks/useCandidateSync';
import CandidateBoard from './components/CandidateBoard';
import ConnectionBadge from './components/ConnectionBadge';

const RECRUITER_IDENTITIES = [
  'Aisha (Recruiter)',
  'Marcus (Recruiter)',
  'Elena (Talent Lead)',
  'Sarah (Engineering VP)',
];

export function App() {
  const [currentUser, setCurrentUser] = useState(RECRUITER_IDENTITIES[0]);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('folio-theme') || 'system';
  });

  // Apply data-theme attribute to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('folio-theme', 'dark');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('folio-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
      localStorage.removeItem('folio-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'dark'; // From system to dark
    });
  };

  const {
    candidates,
    loading,
    connected,
    error,
    clearError,
    changeStatus,
    refreshCandidates,
    remoteUpdateInfo,
    clearRemoteUpdate,
    rollbackCandidateId,
  } = useCandidateSync(currentUser);

  return (
    <div className="app-container">
      {/* Slim Editorial Top Navigation Bar */}
      <header className="top-bar">
        <div className="brand-section">
          <div className="brand-logo">
            <span>Folio</span>
            <span className="brand-tag">OCC Sync</span>
          </div>

          <div className="candidate-counter">
            {loading ? 'Loading...' : `${candidates.length} candidates`}
          </div>
        </div>

        <div className="top-bar-actions">
          {/* Active Recruiter Attribution Switcher */}
          <div className="user-selector" title="Active user for audit trail and socket attribution">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <select
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value)}
              aria-label="Active user attribution"
            >
              {RECRUITER_IDENTITIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Real-Time WebSocket Connection Indicator */}
          <ConnectionBadge connected={connected} />

          {/* Theme Toggle (Light / Dark) */}
          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            aria-label="Toggle theme mode"
            title={`Current theme: ${theme}. Click to toggle.`}
          >
            {theme === 'dark' ? (
              // Sun icon
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              // Moon icon
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <CandidateBoard
        candidates={candidates}
        loading={loading}
        error={error}
        clearError={clearError}
        changeStatus={changeStatus}
        refreshCandidates={refreshCandidates}
        remoteUpdateInfo={remoteUpdateInfo}
        clearRemoteUpdate={clearRemoteUpdate}
        rollbackCandidateId={rollbackCandidateId}
      />
    </div>
  );
}

export default App;

