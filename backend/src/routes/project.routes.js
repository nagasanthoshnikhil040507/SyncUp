import { Router } from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from '../controllers/project.controller.js';
import { getTasksByProject, createTask } from '../controllers/task.controller.js';
import { inviteUser, removeMember } from '../controllers/invitation.controller.js';
import { getProjectFiles, uploadFile } from '../controllers/file.controller.js';
import { upload } from '../config/multer.js';
import { getMessages, postMessage } from '../controllers/message.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// All project routes require authentication
router.use(protect);

router.route('/')
  .get(getProjects)       // GET  /api/projects
  .post(createProject);   // POST /api/projects

router.route('/:id')
  .get(getProjectById)    // GET    /api/projects/:id
  .put(updateProject)     // PUT    /api/projects/:id
  .delete(deleteProject); // DELETE /api/projects/:id

// Nested task routes
router.route('/:projectId/tasks')
  .get(getTasksByProject)  // GET  /api/projects/:projectId/tasks
  .post(createTask);       // POST /api/projects/:projectId/tasks

// ── Team Collaboration routes ─────────────────────────────────────────────────
// POST   /api/projects/:projectId/invite            — owner invites user by email
router.post('/:projectId/invite', inviteUser);

// DELETE /api/projects/:projectId/members/:memberId — owner removes a member
router.delete('/:projectId/members/:memberId', removeMember);

// ── File routes ───────────────────────────────────────────────────────────────
// GET  /api/projects/:projectId/files  — list all project files (members only)
router.get('/:projectId/files', getProjectFiles);

// POST /api/projects/:projectId/files  — upload a file (members only)
router.post('/:projectId/files', upload.single('file'), uploadFile);

// ── Message routes ────────────────────────────────────────────────────────────
// GET  /api/projects/:projectId/messages             — paginated chat history
router.get('/:projectId/messages', getMessages);

// POST /api/projects/:projectId/messages             — send a message via REST
router.post('/:projectId/messages', postMessage);

export default router;
