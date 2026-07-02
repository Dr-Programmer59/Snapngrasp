import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getProfile,
  updateProfile,
  changePassword,
  changeEmail,
  uploadAvatar,
  uploadAvatarMiddleware,
  removeAvatar,
  updateVoiceStyle,
} from '../controllers/profile.controller';

const router = Router();

// GET /api/profile - Get current user's profile
router.get('/', authenticate, getProfile);

// PUT /api/profile - Update profile
router.put('/', authenticate, updateProfile);

// PUT /api/profile/password - Change password
router.put('/password', authenticate, changePassword);

// PUT /api/profile/email - Change email
router.put('/email', authenticate, changeEmail);

// POST /api/profile/avatar - Upload avatar
router.post('/avatar', authenticate, uploadAvatarMiddleware, uploadAvatar);

// DELETE /api/profile/avatar - Remove avatar
router.delete('/avatar', authenticate, removeAvatar);

// PUT /api/profile/voice-style - Update voice style
router.put('/voice-style', authenticate, updateVoiceStyle);

export default router;
