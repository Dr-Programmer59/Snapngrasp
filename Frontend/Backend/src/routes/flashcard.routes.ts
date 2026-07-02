import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireCredit } from '../middlewares/credit.middleware';
import {
  generateFlashcards,
  getFlashcardsByUpload,
  reviewFlashcard,
  deleteFlashcard,
  getFlashcardsDueForReview,
  getFlashcardSetById,
  updateFlashcardSetTitle,
  deleteFlashcardSet,
} from '../controllers/flashcard.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/flashcards/generate/:uploadId
 * @desc    Generate flashcards from uploaded image text
 * @access  Private
 */
router.post('/generate/:uploadId', requireCredit('uploads'), generateFlashcards);

/**
 * @route   GET /api/flashcards/upload/:uploadId
 * @desc    Get all flashcards for a specific upload
 * @access  Private
 */
router.get('/upload/:uploadId', getFlashcardsByUpload);

/**
 * @route   GET /api/flashcards/due
 * @desc    Get flashcards due for review (spaced repetition)
 * @access  Private
 */
router.get('/due', getFlashcardsDueForReview);

/**
 * @route   GET /api/flashcards/set/:setId
 * @desc    Get flashcard set by ID with all flashcards
 * @access  Private
 */
router.get('/set/:setId', getFlashcardSetById);

/**
 * @route   PUT /api/flashcards/set/:setId/title
 * @desc    Update flashcard set title
 * @access  Private
 */
router.put('/set/:setId/title', updateFlashcardSetTitle);

/**
 * @route   DELETE /api/flashcards/set/:setId
 * @desc    Delete entire flashcard set with all flashcards
 * @access  Private
 */
router.delete('/set/:setId', deleteFlashcardSet);

/**
 * @route   PUT /api/flashcards/:flashcardId/review
 * @desc    Update flashcard review statistics
 * @access  Private
 */
router.put('/:flashcardId/review', reviewFlashcard);

/**
 * @route   DELETE /api/flashcards/:flashcardId
 * @desc    Delete a specific flashcard
 * @access  Private
 */
router.delete('/:flashcardId', deleteFlashcard);

export default router;
