import { Router } from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

export default router;
