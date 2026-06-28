import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minLength: [2, 'Title must be at least 2 characters'],
      maxLength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxLength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Ensure owner is always in members (defensive index-level guarantee)
projectSchema.pre('save', function (next) {
  const ownerStr = this.owner.toString();
  const alreadyMember = this.members.some((m) => m.toString() === ownerStr);
  if (!alreadyMember) {
    this.members.unshift(this.owner);
  }
  next();
});

const Project = mongoose.model('Project', projectSchema);

export default Project;
