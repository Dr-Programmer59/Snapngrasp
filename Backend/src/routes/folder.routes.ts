import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveNoteToFolder,
} from '../controllers/folder.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/folders
 * @desc    Get all folders for a user
 * @access  Private
 */
router.get('/', getFolders);

/**
 * @route   POST /api/folders
 * @desc    Create a new folder
 * @access  Private
 */
router.post('/', createFolder);

/**
 * @route   PUT /api/folders/:folderId
 * @desc    Update a folder
 * @access  Private
 */
router.put('/:folderId', updateFolder);

/**
 * @route   DELETE /api/folders/:folderId
 * @desc    Delete a folder
 * @access  Private
 */
router.delete('/:folderId', deleteFolder);

/**
 * @route   PUT /api/folders/:folderId/notes/:noteId
 * @desc    Move note to folder
 * @access  Private
 */
router.put('/:folderId/notes/:noteId', moveNoteToFolder);

export default router;
