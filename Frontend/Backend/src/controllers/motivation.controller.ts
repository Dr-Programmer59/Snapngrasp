import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../utils/env';

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY || '',
});

interface MotivationRequest {
  accuracy: number;
  quizzes: number;
  flashcards: number;
  streak: number;
  checkInStatus: 'first_time' | 'returning';
}

/**
 * Generate personalized motivational message using Claude AI
 */
export const generateMotivationalMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { accuracy, quizzes, flashcards, streak, checkInStatus } = req.body as MotivationRequest;

    console.log('🎯 Generating motivational message for:', { accuracy, quizzes, flashcards, streak, checkInStatus });

    // Validate input
    if (typeof accuracy !== 'number' || typeof quizzes !== 'number' || 
        typeof flashcards !== 'number' || typeof streak !== 'number') {
      res.status(400).json({
        success: false,
        error: 'Invalid input: accuracy, quizzes, flashcards, and streak must be numbers',
      });
      return;
    }

    // Create prompt for Claude
    const prompt = `You are an enthusiastic and supportive AI learning coach. Based on the student's progress data, generate ONE short, encouraging message (max 10-12 words).

STUDENT STATS:
- Accuracy: ${accuracy}%
- Quizzes Completed: ${quizzes}
- Flashcards Mastered: ${flashcards}
- Current Streak: ${streak} days
- Status: ${checkInStatus === 'first_time' ? 'First login today' : 'Returning today'}

GUIDELINES:
1. Keep it VERY SHORT (10-12 words max)
2. Use ONE emoji at the end
3. Be specific to their stats when impressive (mention numbers)
4. Focus on what they're doing well
5. If streak is 7+, celebrate it
6. If accuracy is high (>80%), praise it
7. If they have many quizzes/flashcards, acknowledge the effort
8. If stats are low, be encouraging about starting their journey
9. Make it feel personal and motivating

EXAMPLES:
- For high streak: "7 day streak! You're unstoppable! 🔥"
- For high accuracy: "95% accuracy! Absolutely crushing it! 🎯"
- For many flashcards: "120 flashcards mastered! Keep learning! 📚"
- For beginner: "Every expert started somewhere! Let's go! 💪"
- For returning: "Back for more! Love the dedication! ⭐"

Return ONLY the message text with emoji, nothing else. No quotes, no explanation.`;

    console.log('📤 Sending prompt to Claude...');

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      temperature: 0.8, // Higher for more creative messages
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    console.log('✅ Claude response received');

    const contentBlock = message.content[0];
    if (contentBlock.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Get the message text
    let motivationalMessage = contentBlock.text.trim();
    
    // Remove any quotes that might be added
    motivationalMessage = motivationalMessage.replace(/^["']|["']$/g, '');

    console.log('🎉 Generated message:', motivationalMessage);

    res.status(200).json({
      success: true,
      data: {
        message: motivationalMessage,
      },
    });
  } catch (error: any) {
    console.error('❌ Error generating motivational message:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));

    // Fallback messages based on stats
    const { accuracy, quizzes, flashcards, streak } = req.body as MotivationRequest;
    let fallbackMessage = 'Ready to learn something new today? 🎯';

    if (streak >= 7) {
      fallbackMessage = `${streak} day streak! Keep it going! 🔥`;
    } else if (accuracy >= 80) {
      fallbackMessage = `${accuracy}% accuracy! Keep crushing it! 🎯`;
    } else if (quizzes > 10) {
      fallbackMessage = `${quizzes} quizzes done! You're on fire! 🔥`;
    } else if (flashcards > 20) {
      fallbackMessage = `${flashcards} flashcards mastered! Amazing! 📚`;
    }

    res.status(200).json({
      success: true,
      data: {
        message: fallbackMessage,
        fallback: true,
      },
    });
  }
};
