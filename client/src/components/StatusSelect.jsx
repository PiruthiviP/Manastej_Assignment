import React, { useState } from 'react';

/**
 * Mirror of backend TRANSITIONS state machine.
 * Defines permitted forward progression and reject paths for each stage.
 */
export const TRANSITIONS = {
  applied: ['screening', 'rejected'],
  screening: ['assignment', 'rejected'],
  assignment: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['rejected'],
  rejected: [],
};

export const STATUS_LABELS = {
  applied: 'Applied',
  screening: 'Screening',
  assignment: 'Assignment',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

/**
 * StatusSelect
 * 
 * Accessible dropdown providing direct transition controls.
 * Strictly restricts options to valid next transitions per TRANSITIONS map.
 * Serves as keyboard/touch fallback alongside drag-and-drop.
 */
export function StatusSelect({ currentStatus, onSelectStatus, disabled = false }) {
  const [inlineError, setInlineError] = useState(null);
  const allowedNext = TRANSITIONS[currentStatus] || [];
  const isTerminal = allowedNext.length === 0;

  const handleChange = async (e) => {
    const nextStatus = e.target.value;
    if (!nextStatus || nextStatus === currentStatus) return;

    try {
      setInlineError(null);
      await onSelectStatus(nextStatus);
    } catch (err) {
      setInlineError(err.message || 'Transition rejected');
      setTimeout(() => setInlineError(null), 3500);
    } finally {
      // Reset select back to current placeholder
      e.target.value = '';
    }
  };

  return (
    <div className="status-select-container">
      <select
        className="status-dropdown"
        value=""
        onChange={handleChange}
        disabled={disabled || isTerminal}
        aria-label={`Advance candidate from ${STATUS_LABELS[currentStatus] || currentStatus}`}
      >
        <option value="" disabled>
          {isTerminal ? 'Stage Closed' : 'Move stage...'}
        </option>
        {allowedNext.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status] || status}
          </option>
        ))}
      </select>
      <svg
        className="status-select-arrow"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
      {inlineError && (
        <span className="status-inline-error" role="alert">
          {inlineError}
        </span>
      )}
    </div>
  );
}

export default StatusSelect;

