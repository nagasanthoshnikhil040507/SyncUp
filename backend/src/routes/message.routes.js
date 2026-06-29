import { Router } from 'express';
import { deleteMessage } from '../controllers/message.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// All message routes require authentication
router.use(protect);

// DELETE /api/messages/:messageId — sender deletes their own message
router.delete('/:messageId', deleteMessage);

export default router;
