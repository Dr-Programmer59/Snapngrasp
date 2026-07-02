// src/controllers/chat.controller.ts

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { sendChatMessage as sendChatMessageService, saveChatMessage, getChatHistory as getChatHistoryService } from '../services/chat.service';

/**
 * Chat with AI tutor
 * POST /api/chat/message
 */
export const sendChatMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Message is required',
      });
      return;
    }

    logger.info({ userId, messagePreview: message.substring(0, 50) }, '[Chat] Processing message');

    // Save user message
    await saveChatMessage(userId, 'user', message);

    // Get AI response with full user context (progress, topics, weak areas, etc.)
    const aiResponse = await sendChatMessageService(userId, message, conversationHistory || []);

    // Save AI response
    await saveChatMessage(userId, 'assistant', aiResponse.message);

    logger.info({ responseLength: aiResponse.message.length }, '[Chat] Response sent');

    res.status(200).json({
      status: 'success',
      data: {
        message: aiResponse.message,
        timestamp: aiResponse.timestamp,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, '[Chat] Error sending message');
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to send message',
    });
  }
};

/**
 * Get chat history
 * GET /api/chat/history
 */
export const getHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 50;

    logger.info({ userId, limit }, '[Chat] Getting chat history');

    const history = await getChatHistoryService(userId, limit);

    res.status(200).json({
      status: 'success',
      data: history,
    });
  } catch (error: any) {
    logger.error({ err: error }, '[Chat] Error getting history');
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get chat history',
    });
  }
};

export default {
  sendChatMessage,
  getHistory,
};
