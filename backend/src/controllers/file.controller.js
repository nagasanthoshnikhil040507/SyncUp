import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Project from '../models/Project.js';
import ProjectFile from '../models/ProjectFile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Helper: verify project exists + user is a member ─────────────────────────
const verifyMember = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', status: 404 };

  const isMember = project.members.some((m) => m.toString() === userId);
  if (!isMember)
    return { error: 'Access denied: you are not a member of this project', status: 403 };

  return { project };
};

// ── Helper: populate uploadedBy ───────────────────────────────────────────────
const populateFile = (query) => query.populate('uploadedBy', 'name email');

// ── @desc    List all files for a project
// ── @route   GET /api/projects/:projectId/files
// ── @access  Private (members only)
export const getProjectFiles = async (req, res) => {
  try {
    const { error, status } = await verifyMember(
      req.params.projectId,
      req.user.userId
    );
    if (error) return res.status(status).json({ success: false, message: error });

    const files = await populateFile(
      ProjectFile.find({ project: req.params.projectId }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: files.length,
      files,
    });
  } catch (err) {
    console.error('Error in getProjectFiles:', err.message);
    return res.status(500).json({ success: false, message: 'Server error fetching files' });
  }
};

// ── @desc    Upload a file to a project
// ── @route   POST /api/projects/:projectId/files
// ── @access  Private (members only)
export const uploadFile = async (req, res) => {
  try {
    // Multer has already run at this point — file is on disk if valid
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const { error, status } = await verifyMember(
      req.params.projectId,
      req.user.userId
    );
    if (error) {
      // Remove orphaned file from disk
      fs.unlink(req.file.path, () => {});
      return res.status(status).json({ success: false, message: error });
    }

    const record = await ProjectFile.create({
      project:      req.params.projectId,
      uploadedBy:   req.user.userId,
      originalName: req.file.originalname,
      fileName:     req.file.filename,
      fileType:     req.file.mimetype,
      fileSize:     req.file.size,
      storagePath:  req.file.path,
    });

    const populated = await populateFile(ProjectFile.findById(record._id));

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: populated,
    });
  } catch (err) {
    // Clean up if DB write fails
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error('Error in uploadFile:', err.message);
    return res.status(500).json({ success: false, message: 'Server error uploading file' });
  }
};

// ── @desc    Delete a file
// ── @route   DELETE /api/files/:fileId
// ── @access  Private (uploader or project owner)
export const deleteFile = async (req, res) => {
  try {
    const file = await ProjectFile.findById(req.params.fileId);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });

    // Must be a project member
    const { error, status, project } = await verifyMember(
      file.project.toString(),
      req.user.userId
    );
    if (error) return res.status(status).json({ success: false, message: error });

    // Only the uploader or project owner may delete
    const isUploader = file.uploadedBy.toString() === req.user.userId;
    const isOwner    = project.owner.toString() === req.user.userId;
    if (!isUploader && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the uploader or project owner can delete this file',
      });
    }

    // Remove from disk (non-fatal if file already gone)
    fs.unlink(file.storagePath, (unlinkErr) => {
      if (unlinkErr) console.warn('Could not delete file from disk:', unlinkErr.message);
    });

    await file.deleteOne();

    return res.status(200).json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error in deleteFile:', err.message);
    return res.status(500).json({ success: false, message: 'Server error deleting file' });
  }
};

// ── @desc    Download / stream a file
// ── @route   GET /api/files/:fileId/download
// ── @access  Private (members only)
export const downloadFile = async (req, res) => {
  try {
    const file = await ProjectFile.findById(req.params.fileId);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });

    const { error, status } = await verifyMember(
      file.project.toString(),
      req.user.userId
    );
    if (error) return res.status(status).json({ success: false, message: error });

    // Verify the file still exists on disk
    if (!fs.existsSync(file.storagePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    // For images and PDFs: inline display (allows modal preview)
    // For everything else: attachment download
    const isInlinable = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(
      file.fileType
    );

    res.setHeader('Content-Type', file.fileType);
    res.setHeader(
      'Content-Disposition',
      `${isInlinable ? 'inline' : 'attachment'}; filename="${encodeURIComponent(file.originalName)}"`
    );
    res.setHeader('Content-Length', file.fileSize);

    const stream = fs.createReadStream(file.storagePath);
    stream.on('error', () =>
      res.status(500).json({ success: false, message: 'Error reading file' })
    );
    stream.pipe(res);
  } catch (err) {
    console.error('Error in downloadFile:', err.message);
    return res.status(500).json({ success: false, message: 'Server error downloading file' });
  }
};
