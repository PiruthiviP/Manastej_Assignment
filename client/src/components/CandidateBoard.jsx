import React, { useState, useEffect } from 'react';
import StatusColumn from './StatusColumn';
import Drawer from './Drawer';
import Toast from './Toast';
import { STATUS_LABELS } from './StatusSelect';

const PIPELINE_STATUSES = [
  'applied',
  'screening',
  'assignment',
  'interview',
  'offer',
  'rejected',
];

/**
 * CandidateBoard
 * 
 * Orchestrates the Kanban board columns, mobile responsive tabs,
 * native drag-and-drop state, candidate drawer inspection, and toasts.
 */
export function CandidateBoard({
  candidates,
  loading,
  error,
  clearError,
  changeStatus,
  refreshCandidates,
  remoteUpdateInfo,
  clearRemoteUpdate,
  rollbackCandidateId,
}) {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activeDraggedCandidate, setActiveDraggedCandidate] = useState(null);
  const [activeMobileStage, setActiveMobileStage] = useState('applied');
  const [toasts, setToasts] = useState([]);

  // Sync selected candidate if updated by server or local move
  useEffect(() => {
    if (selectedCandidate) {
      const fresh = candidates.find((c) => c._id === selectedCandidate._id);
      if (fresh && fresh !== selectedCandidate) {
        setSelectedCandidate(fresh);
      }
    }
  }, [candidates, selectedCandidate]);

  // Handle remote updates by appending a calm toast message
  useEffect(() => {
    if (remoteUpdateInfo) {
      const stageName = STATUS_LABELS[remoteUpdateInfo.to] || remoteUpdateInfo.to;
      const toastId = `remote-${Date.now()}`;
      const newToast = {
        id: toastId,
        message: `${remoteUpdateInfo.name} moved to ${stageName}.`,
        isConflict: false,
        isError: false,
      };

      setToasts((prev) => [...prev.slice(-3), newToast]);
      clearRemoteUpdate();

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [remoteUpdateInfo, clearRemoteUpdate]);

  // Handle errors / conflicts by popping a toast
  useEffect(() => {
    if (error) {
      const toastId = `err-${error.id}`;
      const isStale = error.isConflict;
      const message = isStale
        ? 'Someone else updated this candidate. Refresh to see the latest.'
        : error.message;

      const newToast = {
        id: toastId,
        message,
        isConflict: isStale,
        isError: !isStale,
      };

      setToasts((prev) => [...prev.slice(-3), newToast]);

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDragStart = (e, candidate) => {
    setActiveDraggedCandidate(candidate);
    e.dataTransfer.setData('text/plain', candidate._id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setActiveDraggedCandidate(null);
  };

  const handleDropCandidate = async (candidateId, targetStatus) => {
    setActiveDraggedCandidate(null);
    try {
      await changeStatus(candidateId, targetStatus);
    } catch {
      // Error is caught and surfaced via useCandidateSync error state & toast
    }
  };

  return (
    <>
      {/* Mobile Stage Selector Tabs (<700px viewport) */}
      <nav className="mobile-stage-nav" aria-label="Pipeline stages">
        {PIPELINE_STATUSES.map((status) => {
          const count = candidates.filter((c) => c.status === status).length;
          return (
            <button
              key={status}
              type="button"
              className={`mobile-tab-btn ${activeMobileStage === status ? 'active' : ''}`}
              onClick={() => setActiveMobileStage(status)}
            >
              <span>{STATUS_LABELS[status] || status}</span>
              <span className="font-mono">({count})</span>
            </button>
          );
        })}
      </nav>

      {/* Board Layout */}
      <main className="board-wrapper">
        <div className="board-columns">
          {PIPELINE_STATUSES.map((status) => {
            const columnCandidates = candidates.filter((c) => c.status === status);

            if (loading) {
              return (
                <div key={status} className="status-column">
                  <div className="column-header">
                    <div className="column-title-group">
                      <span className={`status-indicator ${status}`} />
                      <span className="column-title">{STATUS_LABELS[status]}</span>
                    </div>
                  </div>
                  <div className="column-content">
                    <div className="skeleton-card">
                      <div className="skeleton-line medium" />
                      <div className="skeleton-line short" />
                      <div className="skeleton-line full" />
                    </div>
                    <div className="skeleton-card">
                      <div className="skeleton-line short" />
                      <div className="skeleton-line medium" />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <StatusColumn
                key={status}
                status={status}
                candidates={columnCandidates}
                onSelectCandidate={setSelectedCandidate}
                onStatusChange={changeStatus}
                activeDraggedCandidate={activeDraggedCandidate}
                remoteUpdatedCandidateId={remoteUpdateInfo?.candidateId}
                rollbackCandidateId={rollbackCandidateId}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDropCandidate={handleDropCandidate}
                isActiveMobile={activeMobileStage === status}
              />
            );
          })}
        </div>
      </main>

      {/* Candidate History Drawer */}
      {selectedCandidate && (
        <Drawer
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {/* Real-Time and Error Toasts */}
      <Toast
        toasts={toasts}
        onDismiss={dismissToast}
        onRefresh={refreshCandidates}
      />
    </>
  );
}

export default CandidateBoard;

