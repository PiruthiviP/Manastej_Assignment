const express = require('express');
const {
  getAllCandidates,
  getCandidateHistory,
  changeStatus,
} = require('../services/statusService');

const router = express.Router();

/**
 * Async handler utility to capture rejected promises and forward errors
 * to Express next() without repetitive try/catch boilerplate.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/candidates
 * Returns all candidates in lean format, ordered by updatedAt descending.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const candidates = await getAllCandidates();
    res.json(candidates);
  })
);

/**
 * PATCH /api/candidates/:id/status
 * Updates a candidate's pipeline status using atomic compare-and-set.
 * On success, broadcasts the 'candidate:updated' event to all connected WebSocket clients.
 */
router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { status, version } = req.body;
    const changedBy = req.headers['x-user'] || 'Recruiter';

    const updatedCandidate = await changeStatus({
      id: req.params.id,
      to: status,
      expectedVersion: version,
      changedBy,
    });

    // Broadcast the update in real time to all connected frontend clients
    const io = req.app.get('io');
    if (io) {
      io.emit('candidate:updated', updatedCandidate);
    }

    res.json(updatedCandidate);
  })
);

/**
 * GET /api/candidates/:id/history
 * Returns the immutable audit trail of status transitions for a specific candidate.
 */
router.get(
  '/:id/history',
  asyncHandler(async (req, res) => {
    const history = await getCandidateHistory(req.params.id);
    res.json(history);
  })
);

module.exports = router;

