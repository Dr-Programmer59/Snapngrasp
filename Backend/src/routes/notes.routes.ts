import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  toggleFavorite,
  getTags,
} from '../controllers/notes.controller';

const router = Router();

// GET /api/notes - Get all notes
router.get('/', authenticate, getNotes);

// GET /api/notes/tags - Get all tags
router.get('/tags', authenticate, getTags);

// GET /api/notes/:noteId - Get specific note
router.get('/:noteId', authenticate, getNoteById);

// POST /api/notes - Create note
router.post('/', authenticate, createNote);

// PUT /api/notes/:noteId - Update note
router.put('/:noteId', authenticate, updateNote);

// DELETE /api/notes/:noteId - Delete note
router.delete('/:noteId', authenticate, deleteNote);

// PUT /api/notes/:noteId/favorite - Toggle favorite
router.put('/:noteId/favorite', authenticate, toggleFavorite);

export default router;
