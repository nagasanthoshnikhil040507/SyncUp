import mongoose from 'mongoose';

/**
 * Message Model
 *
 * Stores chat messages scoped to a project.
 * Indexes on { project, createdAt } for efficient pagination.
 */
const messageSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxLength: [2000, 'Message cannot exceed 2000 characters'],
    },
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

// Compound index for fast project message listing (newest first)
messageSchema.index({ project: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
