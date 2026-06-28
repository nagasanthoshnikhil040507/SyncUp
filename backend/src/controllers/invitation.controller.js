import Project from '../models/Project.js';
import User from '../models/User.js';
import ProjectInvitation from '../models/ProjectInvitation.js';

// ── Helper: simple email format check ─────────────────────────────────────────
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ── Helper: populate invitation with project + sender + receiver ───────────────
const populateInvitation = (query) =>
  query
    .populate('project', 'title description owner')
    .populate('sender', 'name email')
    .populate('receiver', 'name email');

// @desc    Invite a user to a project by email
// @route   POST /api/projects/:projectId/invite
// @access  Private (owner only)
export const inviteUser = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email } = req.body;
    const senderId = req.user.userId;

    // 1. Validate email presence and format
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    // 2. Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // 3. Only owner can invite
    if (project.owner.toString() !== senderId) {
      return res.status(403).json({
        success: false,
        message: 'Only the project owner can invite members',
      });
    }

    // 4. Find the receiver by email
    const receiver = await User.findOne({ email: email.trim().toLowerCase() });
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that email address',
      });
    }

    // 5. Cannot invite yourself
    if (receiver._id.toString() === senderId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot invite yourself to your own project',
      });
    }

    // 6. Cannot invite an existing member
    const isAlreadyMember = project.members.some(
      (m) => m.toString() === receiver._id.toString()
    );
    if (isAlreadyMember) {
      return res.status(409).json({
        success: false,
        message: `${receiver.name} is already a member of this project`,
      });
    }

    // 7. Cannot send duplicate pending invitation
    const existingInvitation = await ProjectInvitation.findOne({
      project: projectId,
      receiver: receiver._id,
      status: 'Pending',
    });
    if (existingInvitation) {
      return res.status(409).json({
        success: false,
        message: `A pending invitation has already been sent to ${receiver.email}`,
      });
    }

    // 8. Create the invitation
    const invitation = await ProjectInvitation.create({
      project: projectId,
      sender: senderId,
      receiver: receiver._id,
      status: 'Pending',
    });

    const populated = await populateInvitation(
      ProjectInvitation.findById(invitation._id)
    );

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${receiver.email}`,
      invitation: populated,
    });
  } catch (error) {
    console.error('Error in inviteUser:', error.message);
    return res.status(500).json({ success: false, message: 'Server error sending invitation' });
  }
};

// @desc    Get all invitations for the logged-in user (pending + history)
// @route   GET /api/invitations
// @access  Private
export const getMyInvitations = async (req, res) => {
  try {
    const invitations = await populateInvitation(
      ProjectInvitation.find({ receiver: req.user.userId }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: invitations.length,
      invitations,
    });
  } catch (error) {
    console.error('Error in getMyInvitations:', error.message);
    return res.status(500).json({ success: false, message: 'Server error fetching invitations' });
  }
};

// @desc    Accept an invitation
// @route   POST /api/invitations/:invitationId/accept
// @access  Private (receiver only)
export const acceptInvitation = async (req, res) => {
  try {
    const invitation = await ProjectInvitation.findById(req.params.invitationId);

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    // Only the receiver can accept
    if (invitation.receiver.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept this invitation',
      });
    }

    // Must still be pending
    if (invitation.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `This invitation has already been ${invitation.status.toLowerCase()}`,
      });
    }

    // Add receiver to project members (idempotent with $addToSet)
    await Project.findByIdAndUpdate(invitation.project, {
      $addToSet: { members: invitation.receiver },
    });

    // Mark as accepted
    invitation.status = 'Accepted';
    await invitation.save();

    const updated = await populateInvitation(
      ProjectInvitation.findById(invitation._id)
    );

    return res.status(200).json({
      success: true,
      message: 'Invitation accepted. You are now a member of the project.',
      invitation: updated,
    });
  } catch (error) {
    console.error('Error in acceptInvitation:', error.message);
    return res.status(500).json({ success: false, message: 'Server error accepting invitation' });
  }
};

// @desc    Reject an invitation
// @route   POST /api/invitations/:invitationId/reject
// @access  Private (receiver only)
export const rejectInvitation = async (req, res) => {
  try {
    const invitation = await ProjectInvitation.findById(req.params.invitationId);

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    // Only the receiver can reject
    if (invitation.receiver.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reject this invitation',
      });
    }

    // Must still be pending
    if (invitation.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `This invitation has already been ${invitation.status.toLowerCase()}`,
      });
    }

    invitation.status = 'Rejected';
    await invitation.save();

    const updated = await populateInvitation(
      ProjectInvitation.findById(invitation._id)
    );

    return res.status(200).json({
      success: true,
      message: 'Invitation rejected.',
      invitation: updated,
    });
  } catch (error) {
    console.error('Error in rejectInvitation:', error.message);
    return res.status(500).json({ success: false, message: 'Server error rejecting invitation' });
  }
};

// @desc    Remove a member from a project
// @route   DELETE /api/projects/:projectId/members/:memberId
// @access  Private (owner only)
export const removeMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only owner can remove members
    if (project.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the project owner can remove members',
      });
    }

    // Owner cannot remove themselves
    if (memberId === project.owner.toString()) {
      return res.status(400).json({
        success: false,
        message: 'The project owner cannot be removed from their own project',
      });
    }

    // Verify the target is actually a member
    const isMember = project.members.some((m) => m.toString() === memberId);
    if (!isMember) {
      return res.status(404).json({
        success: false,
        message: 'This user is not a member of the project',
      });
    }

    // Remove the member
    await Project.findByIdAndUpdate(projectId, {
      $pull: { members: memberId },
    });

    return res.status(200).json({
      success: true,
      message: 'Member removed from project successfully',
    });
  } catch (error) {
    console.error('Error in removeMember:', error.message);
    return res.status(500).json({ success: false, message: 'Server error removing member' });
  }
};
