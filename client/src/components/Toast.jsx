import React from 'react';

/**
 * Toast Notification Component
 * 
 * Renders brief, calm microcopy for socket updates and conflict alerts.
 * Supports action buttons (e.g. Refresh on 409 conflict).
 */
export function Toast({ toasts, onDismiss, onRefresh }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.isConflict ? 'toast-conflict' : ''} ${
            toast.isError ? 'toast-error' : ''
          }`}
          role="status"
        >
          <span className="toast-message">{toast.message}</span>

          {toast.isConflict && (
            <button
              type="button"
              className="toast-action-btn"
              onClick={() => {
                onRefresh();
                onDismiss(toast.id);
              }}
            >
              Refresh
            </button>
          )}

          <button
            type="button"
            className="icon-button"
            style={{ width: '22px', height: '22px', border: 'none' }}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toast;

