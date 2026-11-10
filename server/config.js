const dotenv = require('dotenv');

// Load environment variables from .env file if present
dotenv.config();

/**
 * Application configuration loaded from environment variables with safe development defaults.
 * Centralizing config prevents hardcoded secrets and environment drift across deployments.
 */
module.exports = {
  // HTTP server port (defaults to 5001 to avoid conflicts with macOS AirPlay on 5000)
  PORT: process.env.PORT || 5001,

  // MongoDB connection string
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/candidate_sync',

  // Allowed frontend origin for CORS and Socket.IO handshakes
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

