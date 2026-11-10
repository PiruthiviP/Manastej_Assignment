const { AppError } = require('../services/statusService');

/**
 * Centralized Express Error Handling Middleware
 * 
 * Ensures uniform error payload shape `{ error: string }` across all endpoints:
 * - Mongoose CastError (e.g. invalid MongoDB ObjectId format) maps to HTTP 400.
 * - Application-level AppError maps to its assigned HTTP status code.
 * - Uncaught exceptions map to HTTP 500 while masking internal server details.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Invalid ObjectId parameter
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid candidate ID format' });
  }

  // Known domain or validation AppErrors (e.g. 400, 404, 409)
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Schema validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // JSON parse errors in body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }

  // Log full stack trace for internal debugging, but return safe generic message to client
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;

