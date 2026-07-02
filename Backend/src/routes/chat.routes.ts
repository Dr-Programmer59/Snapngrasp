// src/routes/chat.routes.ts

import { Router } from 'express';
import { sendChatMessage, getHistory } from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// POST /api/chat/message - Send chat message to AI tutor
router.post('/message', sendChatMessage);

// GET /api/chat/history - Get chat history
router.get('/history', getHistory);

export default router;
