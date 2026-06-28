import { Router } from 'express';
import {
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
} from '../controllers/invitation.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// All invitation routes require authentication
router.use(protect);

// GET  /api/invitations         — list all invitations for logged-in user
router.get('/', getMyInvitations);

// POST /api/invitations/:id/accept — accept a specific invitation
router.post('/:invitationId/accept', acceptInvitation);

// POST /api/invitations/:id/reject — reject a specific invitation
router.post('/:invitationId/reject', rejectInvitation);

export default router;
