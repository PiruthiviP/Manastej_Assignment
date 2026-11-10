const mongoose = require('mongoose');

/**
 * StatusEvent Schema (Append-only Audit Log)
 * 
 * Records every status change immutably for compliance, candidate timeline inspection,
 * and debugging. By storing 'from', 'to', and 'changedBy', the recruitment timeline
 * can be accurately reconstructed without relying on mutating documents.
 */
const statusEventSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      index: true,
    },
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      required: true,
    },
    changedBy: {
      type: String,
      default: 'anonymous',
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Append-only collection; disable automatic updatedAt since events never mutate
    timestamps: false,
    versionKey: false,
  }
);

// Compound index to fetch candidate history timeline sorted newest to oldest efficiently
statusEventSchema.index({ candidateId: 1, at: -1 });

module.exports = mongoose.model('StatusEvent', statusEventSchema);

