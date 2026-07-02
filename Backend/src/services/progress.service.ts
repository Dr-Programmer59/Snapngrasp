import { getSupabaseServer } from './supabase.service';
import logger from '../utils/logger';

const supabase = getSupabaseServer();

/**
 * Log user progress for an activity (MCQ, Flashcard, Visual)
 */
export const logProgress = async (
  userId: string,
  activityData: {
    uploadId?: string;
    activityType: 'mcq' | 'flashcard' | 'visual' | 'labeled_visual';
    score: number;
    total: number;
    difficulty?: string;
    subject?: string;
    topic?: string;
    timeSpentSeconds?: number;
  }
) => {
  try {
    const percentage = (activityData.score / activityData.total) * 100;

    // Insert progress record
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        upload_id: activityData.uploadId,
        activity_type: activityData.activityType,
        score: activityData.score,
        total: activityData.total,
        percentage: percentage.toFixed(2),
        difficulty: activityData.difficulty,
        subject: activityData.subject,
        topic: activityData.topic,
        time_spent_seconds: activityData.timeSpentSeconds,
      })
      .select()
      .single();

    if (progressError) {
      logger.error({ err: progressError }, '[Progress] Failed to log progress');
      throw progressError;
    }

    // Update daily activity
    await updateDailyActivity(userId, activityData.activityType, activityData.score, activityData.total, activityData.timeSpentSeconds);

    logger.info({ userId, activityType: activityData.activityType }, '[Progress] Progress logged successfully');
    return progress;
  } catch (error) {
    logger.error({ err: error }, '[Progress] Error logging progress');
    throw error;
  }
};

/**
 * Update daily activity for streak tracking
 */
export const updateDailyActivity = async (
  userId: string,
  activityType: string,
  correct: number,
  total: number,
  timeSpent: number = 0
) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get existing daily activity or create new
    const { data: existing } = await supabase
      .from('daily_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_date', today)
      .single();

    const updateData: any = {
      last_activity_at: new Date().toISOString(),
      time_spent_seconds: (existing?.time_spent_seconds || 0) + timeSpent,
      total_correct: (existing?.total_correct || 0) + correct,
      total_attempted: (existing?.total_attempted || 0) + total,
    };

    // Increment activity-specific counters
    if (activityType === 'mcq') {
      updateData.mcqs_solved = (existing?.mcqs_solved || 0) + total;
    } else if (activityType === 'flashcard') {
      updateData.flashcards_reviewed = (existing?.flashcards_reviewed || 0) + total;
    } else if (activityType === 'visual' || activityType === 'labeled_visual') {
      updateData.visuals_practiced = (existing?.visuals_practiced || 0) + 1;
    }

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('daily_activities')
        .update(updateData)
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('daily_activities')
        .insert({
          user_id: userId,
          activity_date: today,
          first_activity_at: new Date().toISOString(),
          ...updateData,
        });

      if (insertError) throw insertError;
    }

    // Update streak counters
    await updateStreakCounters(userId, activityType);

    logger.info({ userId, date: today }, '[Progress] Daily activity updated');
  } catch (error) {
    logger.error({ err: error }, '[Progress] Error updating daily activity');
    throw error;
  }
};

/**
 * Update streak counters in user_streaks table
 */
const updateStreakCounters = async (userId: string, activityType: string) => {
  try {
    const updateData: any = {};

    if (activityType === 'mcq') {
      updateData.total_mcqs_solved = supabase.rpc('increment', { row_name: 'total_mcqs_solved' });
    } else if (activityType === 'flashcard') {
      updateData.total_flashcards_reviewed = supabase.rpc('increment', { row_name: 'total_flashcards_reviewed' });
    }

    await supabase
      .from('user_streaks')
      .update({ total_check_ins: supabase.rpc('increment') })
      .eq('user_id', userId);
  } catch (error) {
    logger.error({ err: error }, '[Progress] Error updating streak counters');
  }
};

/**
 * Get user's current streak
 */
export const getUserStreak = async (userId: string) => {
  try {
    const { data: streak, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      throw error;
    }

    if (!streak) {
      // Initialize streak for new user
      const { data: newStreak, error: insertError } = await supabase
        .from('user_streaks')
        .insert({
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newStreak;
    }

    // Check if streak is still valid (activity today or yesterday)
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (streak.last_activity_date !== today && streak.last_activity_date !== yesterday) {
      // Streak is broken, reset to 0
      const { data: updatedStreak, error: updateError } = await supabase
        .from('user_streaks')
        .update({ current_streak: 0, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedStreak;
    }

    return streak;
  } catch (error) {
    logger.error({ err: error }, '[Progress] Error getting user streak');
    throw error;
  }
};

/**
 * Get user's overall statistics
 */
export const getUserStats = async (userId: string) => {
  try {
    // Get overall stats
    const { data: overall, error: overallError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);

    if (overallError) throw overallError;

    // Calculate statistics
    const totalActivities = overall?.length || 0;
    const totalCorrect = overall?.reduce((sum: number, item: any) => sum + item.score, 0) || 0;
    const totalAttempted = overall?.reduce((sum: number, item: any) => sum + item.total, 0) || 0;
    const averagePercentage = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

    // Get subject-wise performance
    const subjectStats: any = {};
    overall?.forEach((item: any) => {
      if (item.subject) {
        if (!subjectStats[item.subject]) {
          subjectStats[item.subject] = {
            subject: item.subject,
            attempts: 0,
            correct: 0,
            total: 0,
          };
        }
        subjectStats[item.subject].attempts += 1;
        subjectStats[item.subject].correct += item.score;
        subjectStats[item.subject].total += item.total;
      }
    });

    const subjectPerformance = Object.values(subjectStats).map((stat: any) => ({
      ...stat,
      percentage: (stat.correct / stat.total) * 100,
    }));

    // Get weak areas
    const { data: weakAreas, error: weakError } = await supabase
      .from('user_weak_areas')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'needs_practice')
      .order('accuracy', { ascending: true })
      .limit(5);

    if (weakError) throw weakError;

    // Get recent activities (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: recentActivities, error: recentError } = await supabase
      .from('daily_activities')
      .select('*')
      .eq('user_id', userId)
      .gte('activity_date', sevenDaysAgo)
      .order('activity_date', { ascending: false });

    if (recentError) throw recentError;

    return {
      overall: {
        totalActivities,
        totalCorrect,
        totalAttempted,
        averagePercentage: averagePercentage.toFixed(2),
      },
      subjectPerformance,
      weakAreas: weakAreas || [],
      recentActivities: recentActivities || [],
    };
  } catch (error) {
    logger.error({ err: error }, '[Progress] Error getting user stats');
    throw error;
  }
};

/**
 * Check in user for today (maintains streak)
 */
export const checkInUser = async (userId: string) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if user already checked in today
    const { data: existing } = await supabase
      .from('daily_activities')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_date', today)
      .single();

    if (existing) {
      return { alreadyCheckedIn: true };
    }

    // Create daily activity entry
    const { error: insertError } = await supabase
      .from('daily_activities')
      .insert({
        user_id: userId,
        activity_date: today,
        first_activity_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;

    // Get updated streak
    const streak = await getUserStreak(userId);

    logger.info({ userId, streak: streak.current_streak }, '[Progress] User checked in');

    return { alreadyCheckedIn: false, streak };
  } catch (error) {
    logger.error({ err: error }, '[Progress] Error checking in user');
    throw error;
  }
};
