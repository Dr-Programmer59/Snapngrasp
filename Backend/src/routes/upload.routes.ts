import { Router } from 'express';
import {
  uploadImage,
  uploadText,
  getUploadHistory,
  getUploadById,
  deleteUpload,
  uploadMiddleware,
  createUploadFromNote,
} from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireCredit } from '../middlewares/credit.middleware';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

// POST /api/uploads/image - Upload image and extract text
router.post('/image', requireCredit('uploads'), uploadMiddleware, uploadImage);

// POST /api/uploads/text - Upload manually typed/pasted text
router.post('/text', requireCredit('uploads'), uploadText);

// POST /api/uploads/from-note/:noteId - Create upload from existing note
router.post('/from-note/:noteId', requireCredit('uploads'), createUploadFromNote);

// GET /api/uploads/history - Get user's upload history
router.get('/history', getUploadHistory);

// GET /api/uploads/:uploadId - Get single upload
router.get('/:uploadId', getUploadById);

// DELETE /api/uploads/:uploadId - Delete upload
router.delete('/:uploadId', deleteUpload);

export default router;
