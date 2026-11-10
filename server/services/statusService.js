const Candidate = require('../models/Candidate');
const StatusEvent = require('../models/StatusEvent');

/**
 * Custom error class with an HTTP status code for explicit, predictable error responses.
 */
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

/**
 * Hiring pipeline state machine transition rules.
 * Candidates must progress forward sequentially or transition to 'rejected' at any stage.
 * Once rejected, no further transitions are permitted.
 */
const TRANSITIONS = {
  applied: ['screening', 'rejected'],
  screening: ['assignment', 'rejected'],
  assignment: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['rejected'],
  rejected: [],
};

const VALID_STATUSES = Object.keys(TRANSITIONS);

/**
 * Performs an atomic status update using optimistic concurrency control (CAS).
 * 
 * WHY THIS APPROACH:
 * Including `status: { $in: allowedFromStatuses }` directly in the atomic `findOneAndUpdate` filter
 * guarantees at the database engine level that an illegal transition will NEVER persist,
 * even under intense concurrent race conditions, without requiring expensive distributed locks.
 * 
 * Setting `{ new: false }` returns the document PRE-update, which provides the authoritative
 * `from` status required for the immutable StatusEvent audit log.
 * 
 * If the atomic CAS returns null, we perform a lean read to differentiate between:
 * - 404: candidate does not exist
 * - 409: version mismatch / stale update from another client
 * - 400: illegal status transition from the current state
 */
async function changeStatus({ id, to, expectedVersion, changedBy = 'Recruiter' }) {
  // Validate target status
  if (!VALID_STATUSES.includes(to)) {
    throw new AppError(400, `Invalid target status: ${to}`);
  }

  // Validate expectedVersion is a valid number for optimistic locking
  if (typeof expectedVersion !== 'number') {
    throw new AppError(400, 'Version number is required for optimistic concurrency control');
  }

  // Determine all source statuses allowed to transition into `to`
  const allowedFromStatuses = Object.entries(TRANSITIONS)
    .filter(([, allowedTargets]) => allowedTargets.includes(to))
    .map(([fromStatus]) => fromStatus);

  // If no source status can lead to `to` (e.g. 'applied' is initial-only, or 'rejected' has no targets)
  if (allowedFromStatuses.length === 0) {
    const candidate = await Candidate.findById(id).lean();
    if (!candidate) {
      throw new AppError(404, 'Candidate not found');
    }
    throw new AppError(400, `Invalid transition from ${candidate.status} to ${to}`);
  }

  // Atomic Compare-and-Set: only update if version matches AND status is in allowedFromStatuses
  const prevCandidate = await Candidate.findOneAndUpdate(
    {
      _id: id,
      version: expectedVersion,
      status: { $in: allowedFromStatuses },
    },
    {
      $set: { status: to },
      $inc: { version: 1 },
    },
    {
      new: false, // returns the pre-update document
    }
  );

  // If null, the atomic condition was not met
  if (!prevCandidate) {
    const current = await Candidate.findById(id).lean();
    if (!current) {
      throw new AppError(404, 'Candidate not found');
    }

    // Stale update: someone else already modified this candidate
    if (current.version !== expectedVersion) {
      throw new AppError(409, 'Stale update, refresh and retry');
    }

    // Version was right, but transition from current status is illegal
    if (!allowedFromStatuses.includes(current.status)) {
      throw new AppError(400, `Invalid transition from ${current.status} to ${to}`);
    }

    // Edge-case concurrent race where document changed between atomic CAS and findById
    throw new AppError(409, 'Stale update, refresh and retry');
  }

  // Record immutable audit event with previous status, new status, author, and timestamp
  await StatusEvent.create({
    candidateId: id,
    from: prevCandidate.status,
    to,
    changedBy: changedBy || 'Recruiter',
    at: new Date(),
  });

  // Construct and return the updated candidate object (status: to, version: old + 1)
  const updatedCandidate = {
    ...prevCandidate.toObject(),
    status: to,
    version: prevCandidate.version + 1,
    updatedAt: new Date(),
  };

  return updatedCandidate;
}

/**
 * Fetch all candidates sorted by most recently updated first.
 */
async function getAllCandidates() {
  return Candidate.find().sort({ updatedAt: -1 }).lean();
}

/**
 * Fetch append-only audit history for a candidate, newest first.
 */
async function getCandidateHistory(candidateId) {
  return StatusEvent.find({ candidateId }).sort({ at: -1 }).lean();
}

module.exports = {
  AppError,
  TRANSITIONS,
  VALID_STATUSES,
  changeStatus,
  getAllCandidates,
  getCandidateHistory,
};

