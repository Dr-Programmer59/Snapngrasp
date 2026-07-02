import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Get all favorites for the current user
 */
export const getUserFavorites = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching favorites:', error);
      res.status(500).json({ error: 'Failed to fetch favorites' });
      return;
    }

    res.json({ favorites });
  } catch (error) {
    console.error('❌ Error in getUserFavorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Add an activity to favorites
 */
export const addFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { activity_type, activity_id } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!activity_type || !activity_id) {
      res.status(400).json({ error: 'activity_type and activity_id are required' });
      return;
    }

    if (!['flashcard', 'mcq', 'visual'].includes(activity_type)) {
      res.status(400).json({ error: 'Invalid activity_type. Must be flashcard, mcq, or visual' });
      return;
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_type', activity_type)
      .eq('activity_id', activity_id)
      .single();

    if (existing) {
      res.status(200).json({ message: 'Already favorited', favorite: existing });
      return;
    }

    // Add to favorites
    const { data: favorite, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        activity_type,
        activity_id,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding favorite:', error);
      res.status(500).json({ error: 'Failed to add favorite' });
      return;
    }

    console.log('✅ Favorite added:', favorite);
    res.status(201).json({ message: 'Added to favorites', favorite });
  } catch (error) {
    console.error('❌ Error in addFavorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Remove an activity from favorites
 */
export const removeFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { activity_type, activity_id } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!activity_type || !activity_id) {
      res.status(400).json({ error: 'activity_type and activity_id are required' });
      return;
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('activity_type', activity_type)
      .eq('activity_id', activity_id);

    if (error) {
      console.error('❌ Error removing favorite:', error);
      res.status(500).json({ error: 'Failed to remove favorite' });
      return;
    }

    console.log('✅ Favorite removed');
    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('❌ Error in removeFavorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if an activity is favorited
 */
export const checkFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { activity_type, activity_id } = req.query;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!activity_type || !activity_id) {
      res.status(400).json({ error: 'activity_type and activity_id are required' });
      return;
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_type', activity_type)
      .eq('activity_id', activity_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('❌ Error checking favorite:', error);
      res.status(500).json({ error: 'Failed to check favorite' });
      return;
    }

    res.json({ is_favorited: !!data });
  } catch (error) {
    console.error('❌ Error in checkFavorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
