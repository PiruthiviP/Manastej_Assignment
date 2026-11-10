import React, { useState } from 'react';
import CandidateCard from './CandidateCard';
import { STATUS_LABELS, TRANSITIONS } from './StatusSelect';

/**
 * StatusColumn
 * 
 * Renders a pipeline stage column with drag-and-drop zone management.
 * Dynamically highlights valid drop targets and dims invalid targets based on TRANSITIONS.
 */
export function StatusColumn({
  status,
  candidates,
  onSelectCandidate,
  onStatusChange,
  activeDraggedCandidate,
  remoteUpdatedCandidateId,
  rollbackCandidateId,
  onDragStart,
  onDragEnd,
  onDropCandidate,
  isActiveMobile,
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  // Determine if this column is a valid drop target for the currently dragged card
  let dropTargetClass = '';
  let isValidDropTarget = false;

  if (activeDraggedCandidate) {
    const allowed = TRANSITIONS[activeDraggedCandidate.status] || [];
    if (allowed.includes(status)) {
      dropTargetClass = 'drop-target-valid';
      isValidDropTarget = true;
    } else if (activeDraggedCandidate.status !== status) {
      dropTargetClass = 'drop-target-invalid';
    }
  }

  const handleDragOver = (e) => {
    if (isValidDropTarget) {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
      if (!isDragOver) setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    if (isValidDropTarget && activeDraggedCandidate) {
      onDropCandidate(activeDraggedCandidate._id, status);
    }
  };

  return (
    <div
      className={`status-column ${dropTargetClass} ${isDragOver ? 'is-drag-over' : ''} ${
        isActiveMobile ? 'mobile-active' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label={`${STATUS_LABELS[status] || status} column`}
    >
      <div className="column-header">
        <div className="column-title-group">
          <span className={`status-indicator ${status}`} aria-hidden="true" />
          <h2 className="column-title">{STATUS_LABELS[status] || status}</h2>
        </div>
        <span className="column-count">{candidates.length}</span>
      </div>

      <div className="column-content">
        {candidates.length === 0 ? (
          <div className="column-empty">No candidates in this stage.</div>
        ) : (
          candidates.map((candidate) => (
            <CandidateCard
              key={candidate._id}
              candidate={candidate}
              onSelectCandidate={onSelectCandidate}
              onStatusChange={onStatusChange}
              isRemoteUpdated={remoteUpdatedCandidateId === candidate._id}
              isRollback={rollbackCandidateId === candidate._id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default StatusColumn;

