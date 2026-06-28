import mongoose from 'mongoose';

/**
 * ProjectInvitation Model
 *
 * Tracks the full lifecycle of a project membership invitation.
 *
 * Indexes:
 *  - { project, receiver } compound — fast duplicate-invite checks
 *  - { receiver }                   — fast "get my invitations" queries
 *  - { sender }                     — fast "sent invitations" queries
 */
const projectInvitationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Unique per project+receiver so we never have two active invitations
projectInvitationSchema.index({ project: 1, receiver: 1 });
projectInvitationSchema.index({ receiver: 1 });
projectInvitationSchema.index({ sender: 1 });

const ProjectInvitation = mongoose.model('ProjectInvitation', projectInvitationSchema);

export default ProjectInvitation;
