import mongoose from 'mongoose';

/**
 * ProjectFile Model
 *
 * Stores metadata for files uploaded to a project.
 * Actual file bytes are stored on disk at storagePath.
 *
 * Indexes:
 *  - { project } — fast listing by project
 *  - { uploadedBy } — fast "my uploads" queries
 */
const projectFileSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      // the name stored on disk (uuid-based, collision-safe)
      type: String,
      required: true,
    },
    fileType: {
      // MIME type, e.g. 'application/pdf'
      type: String,
      required: true,
    },
    fileSize: {
      // bytes
      type: Number,
      required: true,
    },
    storagePath: {
      // absolute or relative path on disk
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,         // createdAt === uploadedAt
  }
);

const ProjectFile = mongoose.model('ProjectFile', projectFileSchema);

export default ProjectFile;
