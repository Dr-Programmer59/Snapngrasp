import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServer } from './supabase.service';
import logger from '../utils/logger';
import env from '../utils/env';

const supabase = getSupabaseServer();
import { getUserStats, getUserStreak } from './progress.service';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLAUDE_MODEL = env.ANTHROPIC_CHAT_MODEL;

/**
 * Generate personalized AI greeting for user
 */
export const generatePersonalizedGreeting = async (userId: string, userName?: string) => {
  try {
    console.log('🤖 [AI Greeting] Generating personalized greeting for user:', userId);

    // Get user statistics and streak
    const [stats, streak] = await Promise.all([
      getUserStats(userId),
      getUserStreak(userId),
    ]);

    console.log('📊 [AI Greeting] User stats:', {
      totalActivities: stats.overall.totalActivities,
      averagePercentage: stats.overall.averagePercentage,
      currentStreak: streak.current_streak,
      weakAreas: stats.weakAreas.length,
    });

    // Get recent greetings to avoid repetition
    const { data: recentGreetings } = await supabase
      .from('ai_greeting_history')
      .select('greeting_text, greeting_type')
      .eq('user_id', userId)
      .order('shown_at', { ascending: false })
      .limit(5);

    // Determine greeting type based on user context
    const greetingType = determineGreetingType(stats, streak);

    // Build context for Claude
    const userContext = buildUserContext(userName, stats, streak);

    // Generate greeting with Claude
    const greeting = await generateGreetingWithClaude(userContext, greetingType, recentGreetings || []);

    // Save greeting to history
    await supabase.from('ai_greeting_history').insert({
      user_id: userId,
      greeting_text: greeting.message,
      greeting_type: greetingType,
    });

    console.log('✅ [AI Greeting] Generated:', greeting.message.substring(0, 100));

    return {
      message: greeting.message,
      type: greetingType,
      emoji: greeting.emoji,
      stats: {
        streak: streak.current_streak,
        longestStreak: streak.longest_streak,
        averageScore: parseFloat(stats.overall.averagePercentage),
        totalActivities: stats.overall.totalActivities,
      },
    };
  } catch (error) {
    logger.error({ err: error }, '[AI Greeting] Error generating greeting');
    
    // Fallback to generic greeting
    return {
      message: "Welcome back! Ready to continue your learning journey? 🚀",
      type: 'welcome',
      emoji: '👋',
      stats: null,
    };
  }
};

/**
 * Determine greeting type based on user context
 */
const determineGreetingType = (stats: any, streak: any): string => {
  const today = new Date().toISOString().split('T')[0];
  const hasActivityToday = stats.recentActivities.some(
    (activity: any) => activity.activity_date === today
  );

  // Achievement: High streak
  if (streak.current_streak >= 7) {
    return 'achievement';
  }

  // Reminder: No activity today
  if (!hasActivityToday && streak.current_streak > 0) {
    return 'reminder';
  }

  // Improvement: Recent progress
  const recentAvg = stats.recentActivities.slice(0, 3).reduce(
    (sum: number, activity: any) => sum + (activity.total_correct / Math.max(activity.total_attempted, 1)) * 100,
    0
  ) / Math.max(stats.recentActivities.slice(0, 3).length, 1);

  if (recentAvg > parseFloat(stats.overall.averagePercentage) + 10) {
    return 'improvement';
  }

  // Motivation: Needs encouragement
  if (stats.weakAreas.length > 2 || parseFloat(stats.overall.averagePercentage) < 60) {
    return 'motivation';
  }

  // Default: Welcome
  return 'welcome';
};

/**
 * Build user context for Claude
 */
const buildUserContext = (userName: string | undefined, stats: any, streak: any) => {
  const name = userName || 'there';
  const today = new Date().toISOString().split('T')[0];
  const hasActivityToday = stats.recentActivities.some(
    (activity: any) => activity.activity_date === today
  );

  let yesterday = null;
  if (stats.recentActivities.length > 0) {
    const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    yesterday = stats.recentActivities.find(
      (activity: any) => activity.activity_date === yesterdayDate
    );
  }

  return {
    name,
    streak: {
      current: streak.current_streak,
      longest: streak.longest_streak,
      hasActivityToday,
    },
    performance: {
      totalActivities: stats.overall.totalActivities,
      averageScore: parseFloat(stats.overall.averagePercentage),
      recentActivities: stats.recentActivities.length,
    },
    yesterday: yesterday
      ? {
          mcqsSolved: yesterday.mcqs_solved || 0,
          flashcardsReviewed: yesterday.flashcards_reviewed || 0,
          correctPercentage: yesterday.total_attempted > 0
            ? ((yesterday.total_correct / yesterday.total_attempted) * 100).toFixed(0)
            : 0,
        }
      : null,
    weakAreas: stats.weakAreas.slice(0, 3).map((area: any) => ({
      subject: area.subject,
      topic: area.topic,
      accuracy: area.accuracy,
    })),
    subjectPerformance: stats.subjectPerformance,
  };
};

/**
 * Generate greeting using Claude API
 */
const generateGreetingWithClaude = async (
  userContext: any,
  greetingType: string,
  recentGreetings: any[]
) => {
  const prompt = buildGreetingPrompt(userContext, greetingType, recentGreetings);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 300,
    temperature: 0.8,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse response
  const lines = responseText.trim().split('\n');
  const message = lines[0].replace(/^["']|["']$/g, '').trim();
  const emoji = lines[1]?.replace(/^emoji:\s*/i, '').trim() || '👋';

  return { message, emoji };
};

/**
 * Build prompt for Claude based on greeting type
 */
const buildGreetingPrompt = (userContext: any, greetingType: string, recentGreetings: any[]) => {
  const recentMessages = recentGreetings.map((g) => g.greeting_text).join('\n- ');

  let specificInstructions = '';

  switch (greetingType) {
    case 'achievement':
      specificInstructions = `The user has an impressive ${userContext.streak.current} day streak! Celebrate this achievement enthusiastically. Make them feel proud and motivated to continue.`;
      break;

    case 'reminder':
      specificInstructions = `The user has a ${userContext.streak.current} day streak but hasn't studied today yet. Gently remind them to maintain their streak. Be encouraging, not pushy.`;
      if (userContext.yesterday) {
        specificInstructions += ` Yesterday they solved ${userContext.yesterday.mcqsSolved} MCQs with ${userContext.yesterday.correctPercentage}% accuracy.`;
      }
      break;

    case 'improvement':
      specificInstructions = `The user is showing improvement! Their recent performance is better than their overall average. Acknowledge their progress and encourage them to keep it up.`;
      break;

    case 'motivation':
      specificInstructions = `The user needs encouragement. They have weak areas: ${userContext.weakAreas.map((w: any) => w.subject).join(', ')}. Motivate them gently and suggest focusing on specific topics.`;
      break;

    case 'welcome':
    default:
      specificInstructions = `Give a warm, friendly welcome. The user has completed ${userContext.performance.totalActivities} activities with ${userContext.performance.averageScore.toFixed(0)}% average score.`;
      break;
  }

  return `You are the AI learning companion for SnapNGrasp, a mobile study app. Generate a SHORT, personalized greeting for the user.

USER CONTEXT:
- Name: ${userContext.name}
- Current Streak: ${userContext.streak.current} days
- Longest Streak: ${userContext.streak.longest} days
- Total Activities: ${userContext.performance.totalActivities}
- Average Score: ${userContext.performance.averageScore.toFixed(0)}%
- Studied Today: ${userContext.streak.hasActivityToday ? 'Yes' : 'No'}

${userContext.yesterday ? `YESTERDAY'S ACTIVITY:
- MCQs Solved: ${userContext.yesterday.mcqsSolved}
- Flashcards: ${userContext.yesterday.flashcardsReviewed}
- Accuracy: ${userContext.yesterday.correctPercentage}%` : ''}

${userContext.weakAreas.length > 0 ? `WEAK AREAS:
${userContext.weakAreas.map((w: any) => `- ${w.subject}${w.topic ? ` (${w.topic})` : ''}: ${w.accuracy.toFixed(0)}% accuracy`).join('\n')}` : ''}

GREETING TYPE: ${greetingType.toUpperCase()}

${specificInstructions}

RECENT GREETINGS (avoid repetition):
${recentMessages ? `- ${recentMessages}` : 'None'}

REQUIREMENTS:
1. Keep it SHORT and conversational (1-2 sentences max, under 80 characters if possible)
2. Be friendly, encouraging, and personalized
3. Use the user's name naturally if appropriate
4. Don't be repetitive - vary your message from recent greetings
5. Make it feel like a friend, not a robot
6. Include specific data when relevant (streak, scores, topics)
7. Be authentic and warm

RESPONSE FORMAT:
[Your greeting message on first line]
emoji: [One relevant emoji]

Examples:
"Hey Sarah! 🔥 7 day streak! You're crushing it!"
emoji: 🎯

"Welcome back! Ready to tackle those Biology questions? 💪"
emoji: 📚

"Great progress yesterday! 85% on MCQs - let's keep that momentum! ⚡"
emoji: 🚀

Now generate a unique greeting:`;
};

/**
 * Get motivational quote (simpler fallback)
 */
export const getMotivationalQuote = () => {
  const quotes = [
    { message: "Every expert was once a beginner. Keep going! 🌟", emoji: "🌟" },
    { message: "Progress, not perfection. You're doing great! 💪", emoji: "💪" },
    { message: "Small steps every day lead to big results! 🚀", emoji: "🚀" },
    { message: "Believe in yourself. You've got this! ✨", emoji: "✨" },
    { message: "Learning is a journey, not a race. Enjoy it! 🎯", emoji: "🎯" },
    { message: "Your dedication today builds your success tomorrow! 📚", emoji: "📚" },
    { message: "Consistency beats perfection. Keep showing up! 🔥", emoji: "🔥" },
  ];

  return quotes[Math.floor(Math.random() * quotes.length)];
};
