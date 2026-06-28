import Task from '../models/Task.js';
import Project from '../models/Project.js';

// ── Helper: verify project exists and user is a member ────────────────────────
const verifyProjectMember = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', status: 404 };

  const isMember = project.members.some((m) => m.toString() === userId);
  if (!isMember) return { error: 'Access denied: you are not a member of this project', status: 403 };

  return { project };
};

// ── Helper: populate task fields ──────────────────────────────────────────────
const populateTask = (query) =>
  query
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

// @desc    Get all tasks for a project
// @route   GET /api/projects/:projectId/tasks
// @access  Private (project member only)
export const getTasksByProject = async (req, res) => {
  try {
    const { error, status } = await verifyProjectMember(req.params.projectId, req.user.userId);
    if (error) return res.status(status).json({ success: false, message: error });

    const tasks = await populateTask(
      Task.find({ project: req.params.projectId }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (err) {
    console.error('Error in getTasksByProject:', err.message);
    return res.status(500).json({ success: false, message: 'Server error fetching tasks' });
  }
};

// @desc    Create a task inside a project
// @route   POST /api/projects/:projectId/tasks
// @access  Private (project member only)
export const createTask = async (req, res) => {
  try {
    const { error, status, project } = await verifyProjectMember(req.params.projectId, req.user.userId);
    if (error) return res.status(status).json({ success: false, message: error });

    const { title, description, status: taskStatus, priority, dueDate, assignedTo } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    // If assignedTo provided, verify that user is a project member
    if (assignedTo) {
      const isAssigneeMember = project.members.some((m) => m.toString() === assignedTo);
      if (!isAssigneeMember) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user must be a project member',
        });
      }
    }

    const task = await Task.create({
      project: req.params.projectId,
      title: title.trim(),
      description: description?.trim() || '',
      status: taskStatus || 'Todo',
      priority: priority || 'Medium',
      dueDate: dueDate || null,
      assignedTo: assignedTo || null,
      createdBy: req.user.userId,
    });

    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task,
    });
  } catch (err) {
    console.error('Error in createTask:', err.message);
    return res.status(500).json({ success: false, message: 'Server error creating task' });
  }
};

// @desc    Get a single task by ID
// @route   GET /api/tasks/:taskId
// @access  Private (project member only)
export const getTaskById = async (req, res) => {
  try {
    const task = await populateTask(Task.findById(req.params.taskId));
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const { error, status } = await verifyProjectMember(task.project.toString(), req.user.userId);
    if (error) return res.status(status).json({ success: false, message: error });

    return res.status(200).json({ success: true, task });
  } catch (err) {
    console.error('Error in getTaskById:', err.message);
    return res.status(500).json({ success: false, message: 'Server error fetching task' });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:taskId
// @access  Private (project member only)
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const { error, status, project } = await verifyProjectMember(task.project.toString(), req.user.userId);
    if (error) return res.status(status).json({ success: false, message: error });

    const { title, description, status: taskStatus, priority, dueDate, assignedTo } = req.body;

    if (assignedTo !== undefined && assignedTo !== null) {
      const isAssigneeMember = project.members.some((m) => m.toString() === assignedTo);
      if (!isAssigneeMember) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user must be a project member',
        });
      }
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (taskStatus !== undefined) task.status = taskStatus;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate || null;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;

    const updated = await task.save();
    await updated.populate('assignedTo', 'name email');
    await updated.populate('createdBy', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task: updated,
    });
  } catch (err) {
    console.error('Error in updateTask:', err.message);
    return res.status(500).json({ success: false, message: 'Server error updating task' });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:taskId
// @access  Private (project member only)
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const { error, status } = await verifyProjectMember(task.project.toString(), req.user.userId);
    if (error) return res.status(status).json({ success: false, message: error });

    await task.deleteOne();

    return res.status(200).json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error in deleteTask:', err.message);
    return res.status(500).json({ success: false, message: 'Server error deleting task' });
  }
};
