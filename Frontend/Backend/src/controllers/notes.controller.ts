import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';

/**
 * GET /api/notes
 * Get all notes for current user
 */
export const getNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { search, tag, folder, sort = 'updated_at', order = 'desc' } = req.query;

    console.log('📚 Getting notes for user:', req.user.id);

    const supabase = getSupabaseServer();
    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', req.user.id);

    // Search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Tag filter
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // Folder filter
    if (folder !== undefined) {
      if (folder === 'null' || folder === '') {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', folder);
      }
    }

    // Sorting
    query = query.order(sort as string, { ascending: order === 'asc' });

    const { data: notes, error } = await query;

    if (error) {
      throw error;
    }

    console.log('✅ Found notes:', notes?.length || 0);

    res.status(200).json({
      status: 'success',
      data: {
        notes: notes || [],
      },
    });

  } catch (error: any) {
    console.error('❌ Error getting notes:', error);
    logger.error({ error: error.message }, 'Notes fetch error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to get notes',
      error: error.message,
    });
  }
};

/**
 * GET /api/notes/:noteId
 * Get a specific note by ID
 */
export const getNoteById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { noteId } = req.params;

    console.log('📖 Getting note:', noteId);

    const supabase = getSupabaseServer();
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          status: 'error',
          message: 'Note not found',
        });
        return;
      }
      throw error;
    }

    console.log('✅ Note found:', note.title);

    res.status(200).json({
      status: 'success',
      data: {
        note,
      },
    });

  } catch (error: any) {
    console.error('❌ Error getting note:', error);
    logger.error({ error: error.message }, 'Note fetch error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to get note',
      error: error.message,
    });
  }
};

/**
 * POST /api/notes
 * Create a new note
 */
export const createNote = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const {
      title,
      content,
      content_html,
      tags = [],
      category,
      upload_id,
      is_favorite = false,
      color,
    } = req.body;

    console.log('✍️ Creating note for user:', req.user.id);
    console.log('📝 Title:', title);

    // Validation
    if (!title || !content) {
      res.status(400).json({
        status: 'error',
        message: 'title and content are required',
      });
      return;
    }

    const supabase = getSupabaseServer();
    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: req.user.id,
        title: title.trim(),
        content: content.trim(),
        content_html: content_html || null,
        tags: tags || [],
        category: category || null,
        upload_id: upload_id || null,
        is_favorite,
        color: color || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Note created:', note.id);

    res.status(201).json({
      status: 'success',
      data: {
        note,
      },
      message: 'Note created successfully',
    });

  } catch (error: any) {
    console.error('❌ Error creating note:', error);
    logger.error({ error: error.message }, 'Note creation error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to create note',
      error: error.message,
    });
  }
};

/**
 * PUT /api/notes/:noteId
 * Update an existing note
 */
export const updateNote = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { noteId } = req.params;
    const {
      title,
      content,
      content_html,
      tags,
      category,
      is_favorite,
      color,
    } = req.body;

    console.log('📝 Updating note:', noteId);

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (content_html !== undefined) updateData.content_html = content_html;
    if (tags !== undefined) updateData.tags = tags;
    if (category !== undefined) updateData.category = category;
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite;
    if (color !== undefined) updateData.color = color;

    const supabase = getSupabaseServer();
    const { data: note, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', noteId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          status: 'error',
          message: 'Note not found or unauthorized',
        });
        return;
      }
      throw error;
    }

    console.log('✅ Note updated successfully');

    res.status(200).json({
      status: 'success',
      data: {
        note,
      },
      message: 'Note updated successfully',
    });

  } catch (error: any) {
    console.error('❌ Error updating note:', error);
    logger.error({ error: error.message }, 'Note update error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to update note',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/notes/:noteId
 * Delete a note
 */
export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { noteId } = req.params;

    console.log('🗑️ Deleting note:', noteId);

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    console.log('✅ Note deleted successfully');

    res.status(200).json({
      status: 'success',
      message: 'Note deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ Error deleting note:', error);
    logger.error({ error: error.message }, 'Note deletion error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to delete note',
      error: error.message,
    });
  }
};

/**
 * PUT /api/notes/:noteId/favorite
 * Toggle favorite status
 */
export const toggleFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { noteId } = req.params;

    console.log('⭐ Toggling favorite for note:', noteId);

    const supabase = getSupabaseServer();
    
    // Get current status
    const { data: currentNote } = await supabase
      .from('notes')
      .select('is_favorite')
      .eq('id', noteId)
      .eq('user_id', req.user.id)
      .single();

    if (!currentNote) {
      res.status(404).json({
        status: 'error',
        message: 'Note not found',
      });
      return;
    }

    // Toggle
    const { data: note, error } = await supabase
      .from('notes')
      .update({
        is_favorite: !currentNote.is_favorite,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Favorite toggled:', note.is_favorite);

    res.status(200).json({
      status: 'success',
      data: {
        note,
      },
      message: 'Favorite status updated',
    });

  } catch (error: any) {
    console.error('❌ Error toggling favorite:', error);
    logger.error({ error: error.message }, 'Favorite toggle error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle favorite',
      error: error.message,
    });
  }
};

/**
 * GET /api/notes/tags
 * Get all unique tags for user
 */
export const getTags = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    console.log('🏷️ Getting tags for user:', req.user.id);

    const supabase = getSupabaseServer();
    const { data: notes } = await supabase
      .from('notes')
      .select('tags')
      .eq('user_id', req.user.id);

    // Extract and deduplicate tags
    const allTags = new Set<string>();
    notes?.forEach(note => {
      note.tags?.forEach((tag: string) => allTags.add(tag));
    });

    const tags = Array.from(allTags).sort();

    console.log('✅ Found tags:', tags.length);

    res.status(200).json({
      status: 'success',
      data: {
        tags,
      },
    });

  } catch (error: any) {
    console.error('❌ Error getting tags:', error);
    logger.error({ error: error.message }, 'Tags fetch error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to get tags',
      error: error.message,
    });
  }
};
