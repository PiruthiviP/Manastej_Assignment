import React from 'react';
import StatusSelect from './StatusSelect';

/**
 * Calculates a calm, deterministic avatar background hue from the candidate's name.
 */
function getAvatarColor(name) {
  const hues = [
    '#8C4A2F', '#2C614E', '#36537A', '#634A77',
    '#7A3F50', '#3F6175', '#574B72', '#2B6154'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hues[Math.abs(hash) % hues.length];
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Formats timestamps into compact relative strings using mono font.
 */
function formatRelativeTime(dateString) {
  if (!dateString) return 'just now';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * CandidateCard
 * 
 * Presentational card displaying candidate metadata, version pill,
 * relative update time, drag handles, and stage progression dropdown.
 */
export function CandidateCard({
  candidate,
  onSelectCandidate,
  onStatusChange,
  isRemoteUpdated,
  isRollback,
  onDragStart,
  onDragEnd,
}) {
  const avatarColor = getAvatarColor(candidate.name);
  const initials = getInitials(candidate.name);

  // Prevent card click when clicking interactive dropdown controls
  const handleCardClick = (e) => {
    if (e.target.closest('.status-select-container')) {
      return;
    }
    onSelectCandidate(candidate);
  };

  return (
    <div
      className={`candidate-card ${isRemoteUpdated ? 'remote-flash' : ''} ${
        isRollback ? 'rollback-shake' : ''
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, candidate)}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick(e);
        }
      }}
      aria-label={`View ${candidate.name}, ${candidate.role}`}
    >
      <div className="card-header">
        <div
          className="avatar-circle"
          style={{ backgroundColor: avatarColor }}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="card-title-group">
          <div className="candidate-name">{candidate.name}</div>
          <div className="candidate-role">{candidate.role}</div>
          <div className="candidate-email">{candidate.email}</div>
        </div>
      </div>

      <div className="card-footer">
        <div className="card-meta-left">
          <span className="version-pill" title={`OCC Version ${candidate.version}`}>
            v{candidate.version}
          </span>
          <span className="timestamp-text" title={new Date(candidate.updatedAt).toLocaleString()}>
            {formatRelativeTime(candidate.updatedAt)}
          </span>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            currentStatus={candidate.status}
            onSelectStatus={(newStatus) => onStatusChange(candidate._id, newStatus)}
          />
        </div>
      </div>
    </div>
  );
}

export default CandidateCard;

