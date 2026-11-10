import React from 'react';

/**
 * ConnectionBadge
 * 
 * Displays real-time WebSocket connection telemetry with a pulsing status dot.
 * Communicates live connection state without loud visual elements.
 */
export function ConnectionBadge({ connected }) {
  return (
    <div
      className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}
      role="status"
      aria-live="polite"
    >
      <span className="pulse-dot" aria-hidden="true" />
      <span>{connected ? 'Live' : 'Reconnecting...'}</span>
    </div>
  );
}

export default ConnectionBadge;

