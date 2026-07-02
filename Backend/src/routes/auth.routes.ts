import { Router } from 'express';
import {
  validateToken,
  logout,
  logoutAll,
  emailSignup,
  emailLogin,
  getOAuthUrl,
  refreshToken,
  deleteAccount,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// GET /auth/validate - Verify bearer token and return profile
router.get('/validate', authenticate, validateToken);

// POST /auth/logout - Device sign-out
router.post('/logout', logout);

// POST /auth/logout-all - Revoke all refresh tokens (admin or self)
router.post('/logout-all', authenticate, logoutAll);

// POST /auth/delete-account - Permanently delete user account and all data
router.post('/delete-account', authenticate, deleteAccount);

// POST /auth/email/signup - Email signup
router.post('/email/signup', emailSignup);

// POST /auth/email/login - Email login
router.post('/email/login', emailLogin);

// POST /auth/refresh - Refresh access token
router.post('/refresh', refreshToken);

// GET /auth/oauth/url - Get OAuth URL for Google/Apple
router.get('/oauth/url', getOAuthUrl);

export default router;
