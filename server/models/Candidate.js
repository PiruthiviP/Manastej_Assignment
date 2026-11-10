const mongoose = require('mongoose');

/**
 * Candidate Schema
 * 
 * Tracks a candidate's current pipeline state and an integer version number.
 * The version field powers optimistic concurrency control (OCC) to prevent lost updates
 * during concurrent edits by multiple recruiters.
 */
const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Candidate email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['applied', 'screening', 'assignment', 'interview', 'offer', 'rejected'],
      default: 'applied',
    },
    version: {
      type: Number,
      default: 0,
      // version increments on every successful state change to detect race conditions
    },
  },
  {
    // Automatically record createdAt and updatedAt ISO timestamps
    timestamps: true,
  }
);

// Compound index to optimize queries grouping candidates by stage sorted by most recently updated
candidateSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model('Candidate', candidateSchema);

