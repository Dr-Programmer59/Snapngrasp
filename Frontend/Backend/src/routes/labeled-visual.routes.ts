import express from 'express';
import { generateLabeledVisual } from '../controllers/labeled-visual.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * POST /api/labeled-visuals/generate/:uploadId
 * Generate interactive labeled visual with hidden labels
 */
router.post('/generate/:uploadId', generateLabeledVisual);

export default router;
