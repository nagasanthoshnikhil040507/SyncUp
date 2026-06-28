import { Router } from 'express';
import { deleteFile, downloadFile } from '../controllers/file.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// All file routes require authentication
router.use(protect);

// GET    /api/files/:fileId/download  — stream / download a file
router.get('/:fileId/download', downloadFile);

// DELETE /api/files/:fileId           — delete a file (uploader or owner)
router.delete('/:fileId', deleteFile);

export default router;
