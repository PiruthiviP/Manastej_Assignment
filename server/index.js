const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const candidatesRouter = require('./routes/candidates');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

/**
 * Socket.IO setup:
 * Restrict CORS origins strictly to CLIENT_URL (reject wildcard '*') to protect
 * against unauthorized cross-origin WebSocket connections.
 */
const io = new Server(server, {
  cors: {
    origin: config.CLIENT_URL,
    methods: ['GET', 'PATCH', 'POST'],
    credentials: true,
  },
});

// Expose io instance via Express settings so route handlers can broadcast events
app.set('io', io);

// Security & Parsing Middleware
app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());

// Candidate API Routes
app.use('/api/candidates', candidatesRouter);

// Centralized error handler (must be registered after routes)
app.use(errorHandler);

// Socket.IO connection telemetry
io.on('connection', (socket) => {
  // Useful for tracking active recruiter sessions in multi-client deployments
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
  });
});

/**
 * Server startup:
 * Connect to MongoDB before accepting HTTP or WebSocket traffic.
 * If the database connection fails, exit gracefully with code 1 rather than running in a degraded state.
 */
async function startServer() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log(`[MongoDB] Connected successfully to ${config.MONGO_URI}`);

    server.listen(config.PORT, () => {
      console.log(`[Server] Candidate Sync service running on http://localhost:${config.PORT}`);
    });
  } catch (err) {
    console.error(`[MongoDB] Connection failed: ${err.message}`);
    process.exit(1);
  }
}

// Start server if executed directly
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io, startServer };

