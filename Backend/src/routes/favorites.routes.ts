import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
} from '../controllers/favorites.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all favorites for current user
router.get('/', getUserFavorites);

// Add to favorites
router.post('/', addFavorite);

// Remove from favorites
router.delete('/', removeFavorite);

// Check if favorited
router.get('/check', checkFavorite);

export default router;
