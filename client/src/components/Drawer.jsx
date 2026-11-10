import React, { useEffect, useState } from 'react';
import { fetchHistory } from '../api/candidates';
import { STATUS_LABELS } from './StatusSelect';

/**
 * Drawer Component
 * 
 * Slides out from the right viewport edge to display comprehensive candidate details
 * and the complete immutable audit trail of stage transitions fetched via REST.
 */
export function Drawer({ candidate, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!candidate?._id) return;

    let isMounted = true;
    setLoading(true);
    setFetchError(null);

    fetchHistory(candidate._id)
      .then((data) => {
        if (isMounted) {
          setHistory(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setFetchError(err.message || 'Failed to load timeline');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [candidate?._id]);

  // Handle escape key to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!candidate) return null;

  return (
    <div
      className="drawer-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-candidate-title"
    >
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <h2 id="drawer-candidate-title" className="drawer-title">
              {candidate.name}
            </h2>
            <div className="drawer-subtitle">{candidate.role}</div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close candidate details drawer"
          >
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          <div className="drawer-meta-grid">
            <div className="drawer-meta-item">
              <span className="meta-label">Current Stage</span>
              <span className="meta-value">
                {STATUS_LABELS[candidate.status] || candidate.status}
              </span>
            </div>
            <div className="drawer-meta-item">
              <span className="meta-label">OCC Version</span>
              <span className="meta-value font-mono">v{candidate.version}</span>
            </div>
            <div className="drawer-meta-item">
              <span className="meta-label">Email</span>
              <span className="meta-value" style={{ wordBreak: 'break-all' }}>
                {candidate.email}
              </span>
            </div>
            <div className="drawer-meta-item">
              <span className="meta-label">Candidate ID</span>
              <span className="meta-value font-mono" style={{ fontSize: '11px' }}>
                {candidate._id}
              </span>
            </div>
          </div>

          <div>
            <div className="history-section-title">Audit Trail & History</div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton-line full" />
                <div className="skeleton-line medium" />
                <div className="skeleton-line short" />
              </div>
            ) : fetchError ? (
              <div style={{ color: 'var(--status-rejected)', fontSize: '13px' }}>
                {fetchError}
              </div>
            ) : history.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                No recorded transitions yet.
              </div>
            ) : (
              <div className="timeline">
                {history.map((event, index) => (
                  <div key={event._id || index} className="timeline-item">
                    <span className="timeline-dot" aria-hidden="true" />
                    <div className="timeline-content">
                      <div className="timeline-title">
                        <span className="timeline-tag">{event.from || 'none'}</span>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                        <span className="timeline-tag">{event.to}</span>
                      </div>
                      <div className="timeline-meta">
                        <span>by {event.changedBy || 'System'}</span>
                        <span>•</span>
                        <span className="font-mono" title={new Date(event.at).toLocaleString()}>
                          {new Date(event.at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Drawer;

