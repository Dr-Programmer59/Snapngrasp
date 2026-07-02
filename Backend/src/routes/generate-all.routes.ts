import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { generateAll } from '../controllers/generate-all.controller';

const router = Router();

router.use(authenticate);

// POST /api/generate-all/:uploadId - Generate MCQs, Flashcards, and Visuals in parallel
// If diagram credits are exhausted, visuals are skipped while MCQs/Flashcards still generate
router.post('/:uploadId', generateAll);

export default router;
