import Project from '../models/Project.js';

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project title is required',
      });
    }

    const project = await Project.create({
      title: title.trim(),
      description: description?.trim() || '',
      owner: req.user.userId,
      members: [req.user.userId], // owner is first member
    });

    // Populate owner details for the response
    await project.populate('owner', 'name email');
    await project.populate('members', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project,
    });
  } catch (error) {
    console.error('Error in createProject:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error creating project',
    });
  }
};

// @desc    Get all projects where current user is a member
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ members: req.user.userId })
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error('Error in getProjects:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching projects',
    });
  }
};

// @desc    Get a single project by ID
// @route   GET /api/projects/:id
// @access  Private (must be a member)
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Verify the requesting user is a member
    const isMember = project.members.some(
      (m) => m._id.toString() === req.user.userId
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: you are not a member of this project',
      });
    }

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Error in getProjectById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching project',
    });
  }
};

// @desc    Update a project (owner only)
// @route   PUT /api/projects/:id
// @access  Private (owner only)
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    if (project.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: only the project owner can update it',
      });
    }

    const { title, description } = req.body;

    if (title !== undefined) project.title = title.trim();
    if (description !== undefined) project.description = description.trim();

    const updated = await project.save();
    await updated.populate('owner', 'name email');
    await updated.populate('members', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project: updated,
    });
  } catch (error) {
    console.error('Error in updateProject:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating project',
    });
  }
};

// @desc    Delete a project (owner only)
// @route   DELETE /api/projects/:id
// @access  Private (owner only)
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    if (project.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: only the project owner can delete it',
      });
    }

    await project.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteProject:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting project',
    });
  }
};
