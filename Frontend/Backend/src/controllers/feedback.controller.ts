import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServer } from '../services/supabase.service';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY || '',
});

interface QuestionAnswer {
  question_id: string;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  topic?: string;
  subject?: string;
}

interface VisualAnswer {
  visual_id: string;
  visual_title: string;
  slot_answers: Array<{
    slot_id: string;
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
  }>;
  subject?: string;
  topic?: string;
}

interface FlashcardSession {
  flashcard_id: string;
  question: string;
  confidence_level: 'easy' | 'medium' | 'hard';
  topic?: string;
  subject?: string;
}

interface FeedbackRequest {
  user_id: string;
  session_type: 'mcq' | 'visual' | 'flashcard' | 'mixed';
  mcq_answers?: QuestionAnswer[];
  visual_answers?: VisualAnswer[];
  flashcard_sessions?: FlashcardSession[];
  upload_id?: string;
}

interface AIFeedback {
  overall_score: {
    correct: number;
    total: number;
    percentage: number;
  };
  strong_areas: Array<{
    topic: string;
    description: string;
    evidence: string;
  }>;
  weak_areas: Array<{
    topic: string;
    description: string;
    suggestions: string[];
  }>;
  personalized_message: string;
  next_steps: string[];
}

/**
 * POST /api/feedback/generate
 * Generate AI-powered feedback based on student performance
 */
export const generateFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      user_id,
      session_type,
      mcq_answers = [],
      visual_answers = [],
      flashcard_sessions = [],
      upload_id,
    } = req.body as FeedbackRequest;

    console.log('📊 Generating feedback for user:', user_id);
    console.log('📝 Session type:', session_type);
    console.log('📈 MCQ answers:', mcq_answers.length);
    console.log('🎨 Visual answers:', visual_answers.length);
    console.log('🗂️ Flashcard sessions:', flashcard_sessions.length);

    // Validate input
    if (!user_id) {
      res.status(400).json({
        status: 'error',
        message: 'user_id is required',
      });
      return;
    }

    // Calculate overall performance
    let totalCorrect = 0;
    let totalQuestions = 0;

    // MCQ performance
    if (mcq_answers.length > 0) {
      totalCorrect += mcq_answers.filter(a => a.is_correct).length;
      totalQuestions += mcq_answers.length;
    }

    // Visual performance
    if (visual_answers.length > 0) {
      visual_answers.forEach(visual => {
        totalCorrect += visual.slot_answers.filter(a => a.is_correct).length;
        totalQuestions += visual.slot_answers.length;
      });
    }

    // Flashcard performance (estimate based on confidence)
    if (flashcard_sessions.length > 0) {
      const easyCount = flashcard_sessions.filter(f => f.confidence_level === 'easy').length;
      const mediumCount = flashcard_sessions.filter(f => f.confidence_level === 'medium').length;
      totalCorrect += easyCount + (mediumCount * 0.5);
      totalQuestions += flashcard_sessions.length;
    }

    const percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    console.log('✅ Total correct:', totalCorrect);
    console.log('📊 Total questions:', totalQuestions);
    console.log('💯 Percentage:', percentage);

    // Get upload context if provided
    let uploadContext = '';
    if (upload_id) {
      const supabase = getSupabaseServer();
      const { data: upload, error } = await supabase
        .from('uploads')
        .select('subject, description, file_name')
        .eq('id', upload_id)
        .single();

      if (!error && upload) {
        uploadContext = `\nUpload Context:
- Subject: ${upload.subject || 'Not specified'}
- Description: ${upload.description || 'Not provided'}
- File: ${upload.file_name}`;
      }
    }

    // Prepare data for Claude analysis
    const performanceData = {
      session_type,
      overall_performance: {
        correct: totalCorrect,
        total: totalQuestions,
        percentage,
      },
      mcq_performance: mcq_answers.map(a => ({
        topic: a.topic || 'General',
        subject: a.subject || 'Unknown',
        is_correct: a.is_correct,
        question: a.question_text,
        user_answer: a.user_answer,
        correct_answer: a.correct_answer,
      })),
      visual_performance: visual_answers.map(v => ({
        title: v.visual_title,
        topic: v.topic || 'General',
        subject: v.subject || 'Unknown',
        total_slots: v.slot_answers.length,
        correct_slots: v.slot_answers.filter(a => a.is_correct).length,
        incorrect_answers: v.slot_answers.filter(a => !a.is_correct).map(a => ({
          user_answer: a.user_answer,
          correct_answer: a.correct_answer,
        })),
      })),
      flashcard_performance: {
        easy: flashcard_sessions.filter(f => f.confidence_level === 'easy').length,
        medium: flashcard_sessions.filter(f => f.confidence_level === 'medium').length,
        hard: flashcard_sessions.filter(f => f.confidence_level === 'hard').length,
        topics: flashcard_sessions.map(f => ({
          topic: f.topic || 'General',
          confidence: f.confidence_level,
        })),
      },
    };

    console.log('🤖 Calling Claude for AI feedback...');

    // Generate AI feedback using Claude
    const claudePrompt = `You are an expert educational AI tutor analyzing a student's learning performance. 

${uploadContext}

STUDENT PERFORMANCE DATA:
${JSON.stringify(performanceData, null, 2)}

IMPORTANT: Analyze the ACTUAL questions and answers provided above. Look at:
1. Which specific questions they got wrong
2. What they answered vs. the correct answer
3. Patterns in their mistakes (e.g., confusing similar concepts, calculation errors, misreading questions)
4. Topics where they consistently struggle

Based on this SPECIFIC performance data, provide a comprehensive analysis in the following JSON format:

{
  "strong_areas": [
    {
      "topic": "Specific topic name based on correct answers",
      "description": "What the student understood well - reference specific questions they got right",
      "evidence": "Concrete evidence: 'Correctly answered X out of Y questions about [topic]' or 'Accurately identified [specific concept]'"
    }
  ],
  "weak_areas": [
    {
      "topic": "Specific topic name based on mistakes",
      "description": "Clear description of the conceptual gap or mistake pattern you observed in their wrong answers",
      "suggestions": [
        "Specific actionable suggestion based on their actual mistakes",
        "Another targeted recommendation addressing the root cause",
        "Practice exercise or concept to review"
      ]
    }
  ],
  "personalized_message": "An encouraging 2-3 sentence message that references their ACTUAL performance (e.g., 'I noticed you did well on [topic] but struggled with [specific concept]. This is common when learning [subject].')",
  "next_steps": [
    "Specific action based on their weak areas",
    "Recommended topic or concept to review",
    "Practice suggestion targeting their mistakes"
  ]
}

CRITICAL GUIDELINES:
1. BE SPECIFIC: Reference actual questions/topics from their performance data
2. IDENTIFY PATTERNS: Look for common mistakes across multiple questions
3. For strong areas: Mention which topics/questions they mastered (≥70% correct)
4. For weak areas: Identify conceptual gaps from their wrong answers (<70% correct)
5. ACTIONABLE SUGGESTIONS: Each suggestion should directly address a specific mistake or gap you observed
6. EVIDENCE-BASED: Base all feedback on the actual data provided, not generic advice
7. If they got a visual question wrong, mention which part they confused
8. If they got an MCQ wrong, identify if it was a conceptual error or knowledge gap
9. For strong areas: Give 2-4 areas if performance is good, 1-2 if struggling
10. For weak areas: Give 1-3 areas with 2-4 specific suggestions each
11. Keep tone encouraging and growth-oriented
12. Return ONLY valid JSON, no additional text

Analyze their ACTUAL performance and provide SPECIFIC educational insights based on what they got right and wrong.`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: claudePrompt,
          },
        ],
      });

      console.log('✅ Claude response received');

      const contentBlock = message.content[0];
      if (contentBlock.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Strip markdown code blocks if present
      let responseText = contentBlock.text.trim();
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const aiAnalysis = JSON.parse(responseText);

      console.log('📊 AI Analysis:', aiAnalysis);

      const feedback: AIFeedback = {
        overall_score: {
          correct: totalCorrect,
          total: totalQuestions,
          percentage,
        },
        strong_areas: aiAnalysis.strong_areas || [],
        weak_areas: aiAnalysis.weak_areas || [],
        personalized_message: aiAnalysis.personalized_message || 'Great effort! Keep learning and improving.',
        next_steps: aiAnalysis.next_steps || ['Continue practicing', 'Review your mistakes', 'Try more challenging questions'],
      };

      // Store feedback in database
      const supabase = getSupabaseServer();
      const { data: feedbackRecord, error: feedbackError } = await supabase
        .from('feedback_sessions')
        .insert({
          user_id,
          session_type,
          upload_id,
          total_questions: totalQuestions,
          correct_answers: totalCorrect,
          percentage_score: percentage,
          strong_areas: feedback.strong_areas,
          weak_areas: feedback.weak_areas,
          personalized_message: feedback.personalized_message,
          next_steps: feedback.next_steps,
          performance_data: performanceData,
        })
        .select()
        .single();

      if (feedbackError) {
        console.error('❌ Error saving feedback:', feedbackError);
      } else {
        console.log('✅ Feedback saved to database:', feedbackRecord.id);
      }

      res.status(200).json({
        status: 'success',
        data: feedback,
      });

    } catch (claudeError: any) {
      console.error('❌ Claude API error:', claudeError);
      console.error('❌ Error message:', claudeError.message);
      console.error('❌ Error details:', JSON.stringify(claudeError, null, 2));
      
      // Fallback feedback if Claude fails
      const fallbackFeedback: AIFeedback = {
        overall_score: {
          correct: totalCorrect,
          total: totalQuestions,
          percentage,
        },
        strong_areas: percentage >= 70 ? [
          {
            topic: 'Overall Performance',
            description: 'Good understanding demonstrated',
            evidence: `Scored ${percentage}% on this session`,
          },
        ] : [],
        weak_areas: percentage < 70 ? [
          {
            topic: 'Core Concepts',
            description: 'Need more practice',
            suggestions: ['Review the material again', 'Try practice exercises', 'Ask for help if needed'],
          },
        ] : [],
        personalized_message: percentage >= 70 
          ? `Great job! You scored ${percentage}%. Keep up the good work!`
          : `You scored ${percentage}%. Don't worry, practice makes perfect. Keep learning!`,
        next_steps: ['Review your mistakes', 'Practice more questions', 'Focus on weak areas'],
      };

      res.status(200).json({
        status: 'success',
        data: fallbackFeedback,
        note: 'AI analysis unavailable, showing basic feedback',
      });
    }

  } catch (error: any) {
    console.error('❌ Error generating feedback:', error);
    logger.error({ error: error.message }, 'Feedback generation error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to generate feedback',
      error: error.message,
    });
  }
};

/**
 * GET /api/feedback/history/:userId
 * Get feedback history for a user
 */
export const getFeedbackHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    console.log('📜 Fetching feedback history for user:', userId);

    const supabase = getSupabaseServer();
    const { data: feedbackHistory, error } = await supabase
      .from('feedback_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) {
      throw error;
    }

    console.log('✅ Found feedback records:', feedbackHistory?.length || 0);

    res.status(200).json({
      status: 'success',
      data: feedbackHistory || [],
    });

  } catch (error: any) {
    console.error('❌ Error fetching feedback history:', error);
    logger.error({ error: error.message }, 'Feedback history error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch feedback history',
      error: error.message,
    });
  }
};
