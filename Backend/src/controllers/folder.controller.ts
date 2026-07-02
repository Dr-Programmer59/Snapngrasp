import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';

/**
 * Get all folders for a user
 * GET /api/folders
 */
export const getFolders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    logger.info({ userId }, '[Folder] Fetching folders');

    const supabase = getSupabaseServer();

    const { data: folders, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ err: error }, '[Folder] Failed to fetch folders');
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch folders',
      });
      return;
    }

    // Get note count for each folder
    const foldersWithCounts = await Promise.all(
      (folders || []).map(async (folder: any) => {
        const { count } = await supabase
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('folder_id', folder.id);

        return {
          ...folder,
          note_count: count || 0,
        };
      })
    );

    res.json({
      status: 'success',
      data: {
        folders: foldersWithCounts,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Folder] Failed to fetch folders');
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch folders',
    });
  }
};

/**
 * Create a new folder
 * POST /api/folders
 */
export const createFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { name, color, icon } = req.body;

    if (!name || name.trim() === '') {
      res.status(400).json({
        status: 'error',
        message: 'Folder name is required',
      });
      return;
    }

    logger.info({ userId, name }, '[Folder] Creating folder');

    const supabase = getSupabaseServer();

    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        user_id: userId,
        name: name.trim(),
        color: color || '#6C63FF',
        icon: icon || 'folder-outline',
      })
      .select()
      .single();

    if (error || !folder) {
      logger.error({ err: error }, '[Folder] Failed to create folder');
      res.status(500).json({
        status: 'error',
        message: 'Failed to create folder',
      });
      return;
    }

    res.status(201).json({
      status: 'success',
      message: 'Folder created successfully',
      data: {
        folder: {
          ...folder,
          note_count: 0,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Folder] Failed to create folder');
    res.status(500).json({
      status: 'error',
      message: 'Failed to create folder',
    });
  }
};

/**
 * Update a folder
 * PUT /api/folders/:folderId
 */
export const updateFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { folderId } = req.params;
    const { name, color, icon } = req.body;

    if (!name || name.trim() === '') {
      res.status(400).json({
        status: 'error',
        message: 'Folder name is required',
      });
      return;
    }

    logger.info({ userId, folderId, name }, '[Folder] Updating folder');

    const supabase = getSupabaseServer();

    const { data: folder, error } = await supabase
      .from('folders')
      .update({
        name: name.trim(),
        color: color,
        icon: icon,
      })
      .eq('id', folderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !folder) {
      logger.error({ err: error }, '[Folder] Failed to update folder');
      res.status(500).json({
        status: 'error',
        message: 'Failed to update folder',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Folder updated successfully',
      data: { folder },
    });
  } catch (error) {
    logger.error({ err: error }, '[Folder] Failed to update folder');
    res.status(500).json({
      status: 'error',
      message: 'Failed to update folder',
    });
  }
};

/**
 * Delete a folder
 * DELETE /api/folders/:folderId
 */
export const deleteFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { folderId } = req.params;

    logger.info({ userId, folderId }, '[Folder] Deleting folder');

    const supabase = getSupabaseServer();

    // Remove folder_id from notes in this folder (set to null)
    await supabase
      .from('notes')
      .update({ folder_id: null })
      .eq('folder_id', folderId)
      .eq('user_id', userId);

    // Delete the folder
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userId);

    if (error) {
      logger.error({ err: error }, '[Folder] Failed to delete folder');
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete folder',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Folder deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, '[Folder] Failed to delete folder');
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete folder',
    });
  }
};

/**
 * Move note to folder
 * PUT /api/folders/:folderId/notes/:noteId
 */
export const moveNoteToFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { folderId, noteId } = req.params;

    logger.info({ userId, folderId, noteId }, '[Folder] Moving note to folder');

    const supabase = getSupabaseServer();

    // Verify folder exists and belongs to user
    if (folderId !== 'null') {
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', folderId)
        .eq('user_id', userId)
        .single();

      if (folderError || !folder) {
        res.status(404).json({
          status: 'error',
          message: 'Folder not found',
        });
        return;
      }
    }

    // Update note's folder_id
    const { data: note, error } = await supabase
      .from('notes')
      .update({ folder_id: folderId === 'null' ? null : folderId })
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !note) {
      logger.error({ err: error }, '[Folder] Failed to move note');
      res.status(500).json({
        status: 'error',
        message: 'Failed to move note to folder',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Note moved successfully',
      data: { note },
    });
  } catch (error) {
    logger.error({ err: error }, '[Folder] Failed to move note');
    res.status(500).json({
      status: 'error',
      message: 'Failed to move note to folder',
    });
  }
};
