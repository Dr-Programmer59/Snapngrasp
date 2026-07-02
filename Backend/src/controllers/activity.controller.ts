import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';

const supabase = getSupabaseServer();

interface ActivityItem {
  id: string;
  type: 'flashcard' | 'mcq' | 'visual';
  label: string;
  percent: number;
  title: string;
  stats: Array<{ label: string; color: string }>;
  starred: boolean;
  updated_at: string;
}

/**
 * Get recent activity for dashboard
 * Shows flashcards, MCQs, and visuals that have been:
 * - Recently completed
 * - In progress (half-way done)
 * - Recently generated
 */
export const getRecentActivity = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log('\n🎯 [Activity] ========== GET RECENT ACTIVITY ==========');
    const userId = req.user?.id;
    console.log('👤 [Activity] User ID:', userId);

    if (!userId) {
      console.log('❌ [Activity] No user ID found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('📊 [Activity] Fetching flashcard sets...');
    // Fetch recent flashcards - handle case where table doesn't exist
    let flashcards = null;
    try {
      const { data, error } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(3);
      
      if (error) {
        console.error('⚠️ [Activity] Flashcard sets error (table may not exist):', error.message);
        flashcards = null;
      } else {
        flashcards = data;
        console.log('📚 [Activity] Flashcard sets found:', flashcards?.length || 0);
        if (flashcards && flashcards.length > 0) {
          console.log('📚 [Activity] Flashcard sets:', flashcards.map(f => ({ id: f.id, title: f.title, progress: f.progress })));
        }
      }
    } catch (err) {
      console.error('⚠️ [Activity] Exception fetching flashcard sets:', err);
      flashcards = null;
    }

    console.log('📊 [Activity] Fetching MCQ sets...');
    // Fetch recent MCQs - handle case where table doesn't exist
    let mcqs = null;
    try {
      const { data, error } = await supabase
        .from('mcq_sets')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(3);
      
      if (error) {
        console.error('⚠️ [Activity] MCQ sets error (table may not exist):', error.message);
        mcqs = null;
      } else {
        mcqs = data;
        console.log('📝 [Activity] MCQ sets found:', mcqs?.length || 0);
        if (mcqs && mcqs.length > 0) {
          console.log('📝 [Activity] MCQ sets:', mcqs.map(m => ({ id: m.id, title: m.title, attempted: m.questions_attempted, total: m.total_questions })));
        }
      }
    } catch (err) {
      console.error('⚠️ [Activity] Exception fetching MCQ sets:', err);
      mcqs = null;
    }

    console.log('📊 [Activity] Fetching visuals...');
    // Fetch recent visuals
    const { data: visuals, error: visualsError } = await supabase
      .from('visuals')
      .select(`
        id,
        title,
        visual_type,
        viewed,
        completed,
        total_steps,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(3);

    console.log('🎨 [Activity] Visuals found:', visuals?.length || 0);
    if (visualsError) {
      console.error('⚠️ [Activity] Visuals error:', visualsError.message);
    }
    if (visuals && visuals.length > 0) {
      console.log('🎨 [Activity] Visuals:', visuals.map(v => ({ id: v.id, title: v.title, viewed: v.viewed })));
    }

    // Transform data to unified format
    const activities: ActivityItem[] = [];

    // Add flashcards
    if (flashcards) {
      flashcards.forEach((fc: any) => {
        const progress = fc.total_cards > 0 
          ? Math.round((fc.cards_known / fc.total_cards) * 100) 
          : 0;
        
        activities.push({
          id: fc.id,
          type: 'flashcard',
          label: `${fc.total_cards} Flashcards`,
          percent: progress,
          title: fc.title,
          stats: [
            { label: `${fc.cards_known} Known`, color: '#6366F1' },
            { label: `${fc.cards_to_review} To Review`, color: '#D1D5DB' },
          ],
          starred: progress === 100,
          updated_at: fc.updated_at,
        });
      });
    }

    // Add MCQs
    if (mcqs) {
      mcqs.forEach((mcq: any) => {
        const progress = mcq.total_questions > 0
          ? Math.round((mcq.questions_attempted / mcq.total_questions) * 100)
          : 0;

        activities.push({
          id: mcq.id,
          type: 'mcq',
          label: 'MCQ Quiz',
          percent: progress,
          title: mcq.title,
          stats: [
            { label: `${mcq.questions_attempted}/${mcq.total_questions} Attempted`, color: '#6366F1' },
            { label: `${mcq.correct_answers} Correct`, color: '#10B981' },
            { label: `${mcq.wrong_answers} Wrong`, color: '#EF4444' },
          ],
          starred: mcq.completed,
          updated_at: mcq.updated_at,
        });
      });
    }

    // Add visuals
    if (visuals) {
      visuals.forEach((visual: any) => {
        // Handle cases where migration hasn't been run yet
        const totalSlots = visual.total_slots || 0;
        const slotsFilled = visual.slots_filled || 0;
        const correctSlots = visual.correct_slots || 0;
        const isCompleted = visual.completed || false;
        const isViewed = visual.viewed || false;

        const progress = totalSlots > 0
          ? Math.round((correctSlots / totalSlots) * 100)
          : (isViewed ? 50 : 0);

        const stats = [];
        if (totalSlots > 0) {
          stats.push({ label: `${slotsFilled}/${totalSlots} Filled`, color: '#6366F1' });
          if (correctSlots > 0) {
            stats.push({ label: `${correctSlots} Correct`, color: '#10B981' });
          }
        } else {
          stats.push({ label: isViewed ? 'Viewed' : 'Not Viewed', color: isViewed ? '#6366F1' : '#D1D5DB' });
        }

        activities.push({
          id: visual.id,
          type: 'visual',
          label: 'Visual',
          percent: progress,
          title: visual.title,
          stats: stats,
          starred: isCompleted,
          updated_at: visual.updated_at,
        });
      });
    }

    // Sort by most recent and limit to 5
    activities.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    const recentActivities = activities.slice(0, 5);

    console.log('✅ [Activity] Total activities assembled:', activities.length);
    console.log('✅ [Activity] Returning top 5 activities:', recentActivities.length);
    console.log('✅ [Activity] Activities:', recentActivities.map(a => ({ type: a.type, title: a.title, percent: a.percent })));
    console.log('🎯 [Activity] ========== END RECENT ACTIVITY ==========\n');

    return res.status(200).json({
      activities: recentActivities,
      hasData: recentActivities.length > 0,
    });
  } catch (error: any) {
    console.error('❌ [Activity] ERROR fetching recent activity:', error);
    console.error('❌ [Activity] Error details:', error.message, error.stack);
    console.log('🎯 [Activity] ========== END RECENT ACTIVITY (ERROR) ==========\n');
    return res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

/**
 * Get dashboard statistics
 * Returns total flashcards, streak, accuracy, quizzes count
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log('\n📈 [Activity] ========== GET DASHBOARD STATS ==========');
    const userId = req.user?.id;
    console.log('👤 [Activity] User ID:', userId);

    if (!userId) {
      console.log('❌ [Activity] No user ID found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get total flashcards count
    const { count: flashcardsCount, error: flashcardsError } = await supabase
      .from('flashcard_sets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (flashcardsError) throw flashcardsError;

    // Get total MCQs count
    const { count: quizzesCount, error: quizzesError } = await supabase
      .from('mcq_sets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (quizzesError) throw quizzesError;

    // Calculate overall accuracy from MCQs
    const { data: mcqData, error: mcqDataError } = await supabase
      .from('mcq_sets')
      .select('questions_attempted, correct_answers')
      .eq('user_id', userId);

    if (mcqDataError) throw mcqDataError;

    let totalQuestions = 0;
    let totalCorrect = 0;
    
    if (mcqData) {
      mcqData.forEach((mcq: any) => {
        totalQuestions += mcq.questions_attempted || 0;
        totalCorrect += mcq.correct_answers || 0;
      });
    }

    const accuracy = totalQuestions > 0 
      ? Math.round((totalCorrect / totalQuestions) * 100) 
      : 0;

    // Get user's streak (you can implement streak logic based on daily activity)
    // For now, we'll calculate based on consecutive days with activity
    const { data: activityData, error: activityError } = await supabase
      .from('mcq_sets')
      .select('updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(30);

    if (activityError) throw activityError;

    let streak = 0;
    if (activityData && activityData.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let currentDate = new Date(today);
      const activityDates = new Set(
        activityData.map((item: any) => {
          const date = new Date(item.updated_at);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
      );

      // Count consecutive days
      while (activityDates.has(currentDate.getTime())) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    const stats = {
      flashcards: flashcardsCount || 0,
      streak: streak,
      accuracy: accuracy,
      quizzes: quizzesCount || 0,
    };

    console.log('✅ [Activity] Stats calculated:', stats);
    console.log('📈 [Activity] ========== END DASHBOARD STATS ==========\n');

    return res.status(200).json(stats);
  } catch (error: any) {
    console.error('❌ [Activity] ERROR fetching dashboard stats:', error);
    console.error('❌ [Activity] Error details:', error.message, error.stack);
    console.log('📈 [Activity] ========== END DASHBOARD STATS (ERROR) ==========\n');
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};
