import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getRecentActivity,
  getDashboardStats,
} from '../controllers/activity.controller';

const router = Router();

// Logging middleware for activity routes
router.use((req, _res, next) => {
  console.log(`\n🌐 [Activity Routes] ========================================`);
  console.log(`🌐 [Activity Routes] Incoming Request`);
  console.log(`🌐 [Activity Routes] Method: ${req.method}`);
  console.log(`🌐 [Activity Routes] URL: ${req.originalUrl}`);
  console.log(`🌐 [Activity Routes] Full path: ${req.path}`);
  console.log(`🌐 [Activity Routes] Authorization header:`, req.headers.authorization ? `Present (${req.headers.authorization.substring(0, 30)}...)` : 'MISSING');
  console.log(`🌐 [Activity Routes] Content-Type:`, req.headers['content-type'] || 'Not set');
  console.log(`🌐 [Activity Routes] ========================================\n`);
  next();
});

// Get recent activity for dashboard
router.get('/recent', authenticate, getRecentActivity);

// Get dashboard statistics
router.get('/stats', authenticate, getDashboardStats);

export default router;
