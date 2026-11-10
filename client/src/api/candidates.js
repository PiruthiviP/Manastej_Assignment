/**
 * Candidate API Client
 * 
 * Communicates with the Express backend. Non-2xx responses are parsed
 * and thrown as Error instances preserving the server's exact error message.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/**
 * Fetch all candidate records sorted by recent updates.
 */
export async function fetchCandidates() {
  const res = await fetch(`${API_BASE}/api/candidates`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.error || `Failed to fetch candidates (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

/**
 * Update a candidate's pipeline status using atomic CAS with version checking.
 * 
 * @param {string} id - Candidate MongoDB ObjectId
 * @param {string} status - New target status
 * @param {number} version - Expected current version for optimistic locking
 * @param {string} [changedBy] - User attribution header for the audit trail
 */
export async function updateStatus(id, status, version, changedBy = 'Recruiter') {
  const res = await fetch(`${API_BASE}/api/candidates/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user': changedBy,
    },
    body: JSON.stringify({ status, version }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.error || `Update failed with status ${res.status}`);
    error.status = res.status;
    throw error;
  }

  return res.json();
}

/**
 * Fetch the complete audit history timeline for a candidate.
 */
export async function fetchHistory(id) {
  const res = await fetch(`${API_BASE}/api/candidates/${id}/history`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.error || `Failed to fetch history (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

