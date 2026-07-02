import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireCredit } from '../middlewares/credit.middleware';
import {
  generateVisuals,
  getVisualsByUpload,
  getVisualById,
  submitAnswer,
  updateVisualTitle,
  deleteVisual,
} from '../controllers/visual.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/visuals/generate/:uploadId
 * @desc    Generate visual question cards from upload text
 * @access  Private
 */
router.post('/generate/:uploadId', requireCredit('diagrams'), generateVisuals);

/**
 * @route   GET /api/visuals/upload/:uploadId
 * @desc    Get all visuals for a specific upload
 * @access  Private
 */
router.get('/upload/:uploadId', getVisualsByUpload);

/**
 * @route   GET /api/visuals/:visualId
 * @desc    Get a specific visual by ID
 * @access  Private
 */
router.get('/:visualId', getVisualById);

/**
 * @route   POST /api/visuals/:visualId/answer
 * @desc    Submit answer for a visual label
 * @access  Private
 */
router.post('/:visualId/answer', submitAnswer);

/**
 * @route   PUT /api/visuals/:visualId/title
 * @desc    Update visual title
 * @access  Private
 */
router.put('/:visualId/title', updateVisualTitle);

/**
 * @route   DELETE /api/visuals/:visualId
 * @desc    Delete a visual
 * @access  Private
 */
router.delete('/:visualId', deleteVisual);

export default router;
