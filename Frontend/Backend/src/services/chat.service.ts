import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServer } from './supabase.service';
import logger from '../utils/logger';
import env from '../utils/env';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = getSupabaseServer();

/**
 * Get user's learning context from database
 */
const getUserContext = async (userId: string) => {
  try {
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, learning_style')
      .eq('user_id', userId)
      .single();

    // Get user progress stats
    const { data: progressStats } = await supabase
      .from('user_progress')
      .select('activity_type, score, total, subject, topic, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(20);

    // Get user streak
    const { data: streak } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('user_id', userId)
      .single();

    // Get weak areas
    const { data: weakAreas } = await supabase
      .from('user_weak_areas')
      .select('subject, topic, accuracy, attempts, status')
      .eq('user_id', userId)
      .eq('status', 'needs_practice')
      .order('accuracy', { ascending: true })
      .limit(5);

    // Get recent uploads/topics
    const { data: recentUploads } = await supabase
      .from('uploads')
      .select('title, subject, upload_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Calculate overall stats
    const totalActivities = progressStats?.length || 0;
    const totalCorrect = progressStats?.reduce((sum, item) => sum + item.score, 0) || 0;
    const totalAttempted = progressStats?.reduce((sum, item) => sum + item.total, 0) || 0;
    const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    // Get activity breakdown
    const activityBreakdown = {
      mcq: progressStats?.filter(p => p.activity_type === 'mcq').length || 0,
      flashcard: progressStats?.filter(p => p.activity_type === 'flashcard').length || 0,
      visual: progressStats?.filter(p => p.activity_type === 'visual').length || 0,
    };

    // Get subject performance
    const subjectPerformance: any = {};
    progressStats?.forEach(item => {
      if (item.subject) {
        if (!subjectPerformance[item.subject]) {
          subjectPerformance[item.subject] = { correct: 0, total: 0 };
        }
        subjectPerformance[item.subject].correct += item.score;
        subjectPerformance[item.subject].total += item.total;
      }
    });

    const subjectStats = Object.entries(subjectPerformance).map(([subject, stats]: any) => ({
      subject,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      attempts: stats.total,
    }));

    return {
      displayName: profile?.display_name || 'Student',
      learningStyle: profile?.learning_style || 'not set',
      currentStreak: streak?.current_streak || 0,
      longestStreak: streak?.longest_streak || 0,
      totalActivities,
      overallAccuracy,
      activityBreakdown,
      recentTopics: progressStats?.slice(0, 5).map(p => `${p.subject || 'General'}: ${p.topic || 'Practice'}`),
      weakAreas: weakAreas?.map(w => `${w.subject} - ${w.topic} (${w.accuracy}% accuracy, ${w.attempts} attempts)`),
      subjectPerformance: subjectStats,
      recentUploads: recentUploads?.map(u => `${u.title} (${u.subject || 'General'})`),
    };
  } catch (error) {
    logger.error({ err: error }, '[Chat] Error getting user context');
    return null;
  }
};

/**
 * Generate system prompt with user context
 */
const generateSystemPrompt = (userContext: any) => {
  if (!userContext) {
    return `You are an AI tutor assistant for SnapNGrasp, a learning platform. You help students with their studies, answer questions, provide explanations, and offer encouragement. Be friendly, supportive, and educational.`;
  }

  return `You are an AI tutor assistant for SnapNGrasp, a personalized learning platform. You're chatting with ${userContext.displayName}.

STUDENT PROFILE:
- Learning Style: ${userContext.learningStyle}
- Current Streak: ${userContext.currentStreak} days 🔥
- Longest Streak: ${userContext.longestStreak} days
- Overall Accuracy: ${userContext.overallAccuracy}%
- Total Activities: ${userContext.totalActivities}

ACTIVITY BREAKDOWN:
- MCQ Quizzes: ${userContext.activityBreakdown.mcq}
- Flashcards: ${userContext.activityBreakdown.flashcard}
- Visual Learning: ${userContext.activityBreakdown.visual}

RECENT TOPICS STUDIED:
${userContext.recentTopics?.join('\n') || 'None yet'}

${userContext.weakAreas && userContext.weakAreas.length > 0 ? `AREAS NEEDING IMPROVEMENT:
${userContext.weakAreas.join('\n')}` : ''}

${userContext.subjectPerformance && userContext.subjectPerformance.length > 0 ? `SUBJECT PERFORMANCE:
${userContext.subjectPerformance.map((s: any) => `${s.subject}: ${s.accuracy}% (${s.attempts} questions)`).join('\n')}` : ''}

${userContext.recentUploads && userContext.recentUploads.length > 0 ? `RECENT UPLOADS:
${userContext.recentUploads.join('\n')}` : ''}

YOUR ROLE:
- Help ${userContext.displayName} understand concepts better
- Provide personalized study tips based on their learning style
- Encourage them on their progress and streak
- Address their weak areas with targeted explanations
- Celebrate their strengths and achievements
- Be friendly, motivating, and supportive
- Keep responses conversational and engaging
- Use emojis sparingly but appropriately

When ${userContext.displayName} asks questions:
- Reference their recent topics when relevant
- Connect concepts to subjects they're studying
- Provide explanations suitable for their learning style
- Offer study strategies based on their activity patterns
- Acknowledge their progress and effort`;
};

/**
 * Send message to Claude with user context
 */
export const sendChatMessage = async (userId: string, message: string, conversationHistory: any[] = []) => {
  try {
    logger.info({ userId }, '[Chat] Sending message to Claude');

    // Get user context
    const userContext = await getUserContext(userId);
    const systemPrompt = generateSystemPrompt(userContext);

    // Format conversation history for Claude - filter out messages without content
    const historyMessages = conversationHistory
      .filter(msg => msg && msg.content && typeof msg.content === 'string' && msg.content.trim())
      .map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content.trim(),
      }));

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...historyMessages,
      {
        role: 'user' as const,
        content: message,
      },
    ];

    logger.info({ userId, messageCount: messages.length }, '[Chat] Prepared messages for Claude');

    // Call Claude API
    const response = await anthropic.messages.create({
      model: env.ANTHROPIC_CHAT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';

    logger.info({ userId, messageLength: assistantMessage.length }, '[Chat] Claude response received');

    return {
      message: assistantMessage,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ err: error, userId }, '[Chat] Error sending message to Claude');
    throw new Error(error.message || 'Failed to get AI response');
  }
};

/**
 * Save chat message to database
 */
export const saveChatMessage = async (userId: string, role: 'user' | 'assistant', content: string) => {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        role,
        content,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    logger.error({ err: error, userId }, '[Chat] Error saving message');
    // Don't throw - chat should work even if saving fails
  }
};

/**
 * Get chat history from database
 */
export const getChatHistory = async (userId: string, limit: number = 50) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      messages: data?.reverse() || [],
      count: data?.length || 0,
    };
  } catch (error) {
    logger.error({ err: error, userId }, '[Chat] Error getting chat history');
    throw new Error('Failed to get chat history');
  }
};
