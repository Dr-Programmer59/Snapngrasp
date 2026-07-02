import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireCredit } from '../middlewares/credit.middleware';
import { generateMCQs, getMCQsByUpload, submitMCQAnswer, deleteMCQ, getMCQSetById, updateMCQSetTitle, deleteMCQSet } from '../controllers/mcq.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/mcqs/generate/:uploadId
 * @desc    Generate MCQs from uploaded image text
 * @access  Private
 */
router.post('/generate/:uploadId', requireCredit('uploads'), generateMCQs);

/**
 * @route   GET /api/mcqs/upload/:uploadId
 * @desc    Get all MCQs for a specific upload
 * @access  Private
 */
router.get('/upload/:uploadId', getMCQsByUpload);

/**
 * @route   GET /api/mcqs/set/:setId
 * @desc    Get MCQ set by ID with all questions
 * @access  Private
 */
router.get('/set/:setId', getMCQSetById);

/**
 * @route   PUT /api/mcqs/set/:setId/title
 * @desc    Update MCQ set title
 * @access  Private
 */
router.put('/set/:setId/title', updateMCQSetTitle);

/**
 * @route   DELETE /api/mcqs/set/:setId
 * @desc    Delete entire MCQ set with all questions
 * @access  Private
 */
router.delete('/set/:setId', deleteMCQSet);

/**
 * @route   POST /api/mcqs/:mcqId/answer
 * @desc    Submit answer for a specific MCQ
 * @access  Private
 */
router.post('/:mcqId/answer', submitMCQAnswer);

/**
 * @route   DELETE /api/mcqs/:mcqId
 * @desc    Delete a specific MCQ
 * @access  Private
 */
router.delete('/:mcqId', deleteMCQ);

export default router;
