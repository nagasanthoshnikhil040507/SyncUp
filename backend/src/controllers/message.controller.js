import Project from '../models/Project.js';
import Message from '../models/Message.js';

const PAGE_LIMIT = 50; // messages per page load

// ── Helper: verify project exists + user is a member ─────────────────────────
const verifyMember = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', status: 404 };

  const isMember = project.members.some((m) => m.toString() === userId);
  if (!isMember)
    return { error: 'Access denied: you are not a member of this project', status: 403 };

  return { project };
};

// ── Helper: populate sender ───────────────────────────────────────────────────
const populateMessage = (query) => query.populate('sender', 'name email');

// ── @desc    Get paginated messages for a project
// ── @route   GET /api/projects/:projectId/messages?before=<messageId>
// ── @access  Private (members only)
export const getMessages = async (req, res) => {
  try {
    const { error, status } = await verifyMember(
      req.params.projectId,
      req.user.userId
    );
    if (error) return res.status(status).json({ success: false, message: error });

    // Optional cursor-based pagination: load messages older than `before`
    const query = { project: req.params.projectId };
    if (req.query.before) {
      const pivot = await Message.findById(req.query.before).select('createdAt');
      if (pivot) query.createdAt = { $lt: pivot.createdAt };
    }

    const messages = await populateMessage(
      Message.find(query).sort({ createdAt: -1 }).limit(PAGE_LIMIT)
    );

    // Return in chronological order (oldest first for display)
    return res.status(200).json({
      success: true,
      count: messages.length,
      hasMore: messages.length === PAGE_LIMIT,
      messages: messages.reverse(),
    });
  } catch (err) {
    console.error('Error in getMessages:', err.message);
    return res.status(500).json({ success: false, message: 'Server error fetching messages' });
  }
};

// ── @desc    Post a new message to a project
// ── @route   POST /api/projects/:projectId/messages
// ── @access  Private (members only)
export const postMessage = async (req, res) => {
  try {
    const { error, status } = await verifyMember(
      req.params.projectId,
      req.user.userId
    );
    if (error) return res.status(status).json({ success: false, message: error });

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const doc = await Message.create({
      project: req.params.projectId,
      sender:  req.user.userId,
      message: message.trim(),
    });

    const populated = await populateMessage(Message.findById(doc._id));

    return res.status(201).json({
      success: true,
      message: 'Message sent',
      data: populated,
    });
  } catch (err) {
    console.error('Error in postMessage:', err.message);
    return res.status(500).json({ success: false, message: 'Server error sending message' });
  }
};

// ── @desc    Delete a message (sender only)
// ── @route   DELETE /api/messages/:messageId
// ── @access  Private (sender only)
export const deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    if (msg.sender.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages',
      });
    }

    await msg.deleteOne();

    return res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('Error in deleteMessage:', err.message);
    return res.status(500).json({ success: false, message: 'Server error deleting message' });
  }
};
