import { Router } from 'express';
import {
  getTaskById,
  updateTask,
  deleteTask,
} from '../controllers/task.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// All task routes require authentication
router.use(protect);

// Standalone task routes (by taskId)
router.route('/:taskId')
  .get(getTaskById)      // GET    /api/tasks/:taskId
  .put(updateTask)       // PUT    /api/tasks/:taskId
  .delete(deleteTask);   // DELETE /api/tasks/:taskId

export default router;
