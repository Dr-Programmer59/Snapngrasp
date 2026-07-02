import { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { extractTextFromImage } from '../services/claude.service';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';
import { consumeCredit } from '../middlewares/credit.middleware';

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.'));
    }
  },
});

export const uploadMiddleware = upload.single('image');

/**
 * Upload image and extract text using Claude Vision
 * POST /api/uploads/image
 */
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        status: 'error',
        message: 'No image file provided',
      });
      return;
    }

    const userId = req.user.id;
    const file = req.file;

    logger.info({ userId, filename: file.originalname }, '[Upload] Processing image upload');

    // Compress image if needed (Claude has 5MB limit)
    let processedBuffer = file.buffer;
    let processedMimeType = file.mimetype;
    
    const originalSizeBytes = file.buffer.length;
    const originalSizeMB = (originalSizeBytes / (1024 * 1024)).toFixed(2);
    logger.info(`[Upload] Original image size: ${originalSizeMB}MB`);

    // If image is larger than 4MB, compress it
    if (file.buffer.length > 4 * 1024 * 1024) {
      logger.info('[Upload] Image exceeds 4MB, compressing...');
      
      try {
        // Resize and compress to JPEG with quality adjustment
        processedBuffer = await sharp(file.buffer)
          .resize(2048, 2048, { // Max dimensions
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ 
            quality: 85, // Good quality while reducing size
            progressive: true,
          })
          .toBuffer();
        
        processedMimeType = 'image/jpeg';
        const compressedSizeMB = (processedBuffer.length / (1024 * 1024)).toFixed(2);
        logger.info(`[Upload] Compressed to ${compressedSizeMB}MB`);
        
        // If still too large, reduce quality further
        if (processedBuffer.length > 4.5 * 1024 * 1024) {
          logger.info('[Upload] Still large, reducing quality...');
          processedBuffer = await sharp(file.buffer)
            .resize(1600, 1600, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 70 })
            .toBuffer();
          
          const finalSizeMB = (processedBuffer.length / (1024 * 1024)).toFixed(2);
          logger.info(`[Upload] Final size: ${finalSizeMB}MB`);
        }
      } catch (compressionError) {
        logger.error({ err: compressionError }, '[Upload] Image compression failed');
        throw new Error('Failed to process image');
      }
    }

    // Convert buffer to base64
    const base64Image = processedBuffer.toString('base64');
    const mediaType = processedMimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

    // Extract text using Claude Vision
    logger.info('[Upload] Extracting text with Claude...');
    const extraction = await extractTextFromImage(base64Image, mediaType);
    
    logger.info({ 
      title: extraction.title,
      subject: extraction.subject,
      textLength: extraction.text?.length || 0,
      confidence: extraction.confidence
    }, '[Upload] Extraction completed');

    // Save image to local public folder
    const uploadsDir = path.join(__dirname, '../../public/uploads', userId);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const localFilename = `${timestamp}-${file.originalname}`;
    const localFilePath = path.join(uploadsDir, localFilename);
    
    // Write file to disk
    fs.writeFileSync(localFilePath, file.buffer);
    
    // Generate public URL (accessible via /public/uploads/...)
    const publicUrl = `/uploads/${userId}/${localFilename}`;
    
    logger.info({ localFilePath, publicUrl }, '[Upload] Image saved locally');

    // Save upload record to database
    const supabase = getSupabaseServer();
    const { data: uploadRecord, error: dbError } = await supabase
      .from('uploads')
      .insert({
        user_id: userId,
        filename: file.originalname,
        file_path: localFilePath,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.mimetype,
        title: extraction.title,
        subject: extraction.subject,
        extracted_text: extraction.text,
        extraction_confidence: extraction.confidence,
        extraction_metadata: extraction.metadata,
        status: extraction.text ? 'completed' : 'no_text_found',
      })
      .select()
      .single();

    if (dbError) {
      logger.error({ err: dbError }, '[Upload] Failed to save upload record');
      throw new Error('Failed to save upload record');
    }

    logger.info({ uploadId: uploadRecord.id }, '[Upload] Upload completed successfully');

    // Consume upload credit
    await consumeCredit(req.user!.id, 'uploads');

    res.status(201).json({
      status: 'success',
      data: {
        upload_id: uploadRecord.id,
        filename: uploadRecord.filename,
        file_url: uploadRecord.file_url,
        title: uploadRecord.title,
        subject: uploadRecord.subject,
        extracted_text: uploadRecord.extracted_text,
        confidence: uploadRecord.extraction_confidence,
        word_count: extraction.text ? extraction.text.split(/\s+/).length : 0,
        created_at: uploadRecord.created_at,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Upload] Upload failed');
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to process upload',
    });
  }
};

/**
 * Get user's upload history
 * GET /api/uploads/history
 */
export const getUploadHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const supabase = getSupabaseServer();

    const { data, error, count } = await supabase
      .from('uploads')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      logger.error({ err: error }, '[Upload] Failed to fetch upload history');
      throw new Error('Failed to fetch upload history');
    }

    res.status(200).json({
      status: 'success',
      data: {
        uploads: data,
        total: count,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Upload] Fetch history failed');
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch upload history',
    });
  }
};

/**
 * Get single upload details
 * GET /api/uploads/:uploadId
 */
export const getUploadById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { uploadId } = req.params;

    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({
        status: 'error',
        message: 'Upload not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    logger.error({ err: error }, '[Upload] Fetch upload failed');
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch upload',
    });
  }
};

/**
 * Delete upload
 * DELETE /api/uploads/:uploadId
 */
export const deleteUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { uploadId } = req.params;

    const supabase = getSupabaseServer();

    // Get upload record first
    const { data: upload, error: fetchError } = await supabase
      .from('uploads')
      .select('file_path')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !upload) {
      res.status(404).json({
        status: 'error',
        message: 'Upload not found',
      });
      return;
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('uploads')
      .remove([upload.file_path]);

    if (storageError) {
      logger.error({ err: storageError }, '[Upload] Failed to delete from storage');
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('uploads')
      .delete()
      .eq('id', uploadId)
      .eq('user_id', userId);

    if (dbError) {
      logger.error({ err: dbError }, '[Upload] Failed to delete upload record');
      throw new Error('Failed to delete upload');
    }

    logger.info({ uploadId }, '[Upload] Upload deleted successfully');

    res.status(200).json({
      status: 'success',
      message: 'Upload deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, '[Upload] Delete upload failed');
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete upload',
    });
  }
};

/**
 * Create upload from manually typed/pasted text (no OCR needed)
 * POST /api/uploads/text
 */
export const uploadText = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { text, title, subject } = req.body;

    if (!text || !title || !subject) {
      res.status(400).json({
        status: 'error',
        message: 'Text, title, and subject are required',
      });
      return;
    }

    logger.info({ userId, title, subject }, '[Upload] Processing text upload');

    const supabase = getSupabaseServer();

    // Calculate word count
    const wordCount = text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;

    // Insert into database (no file_path or file_url since there's no file)
    const { data: upload, error: insertError } = await supabase
      .from('uploads')
      .insert({
        user_id: userId,
        filename: `${title}.txt`,
        file_path: null,
        file_url: null,
        extracted_text: text.trim(),
        title: title.trim(),
        subject: subject.trim(),
        confidence: 1.0, // 100% confidence since it's user input
        word_count: wordCount,
      })
      .select()
      .single();

    if (insertError || !upload) {
      logger.error({ err: insertError }, '[Upload] Failed to save text upload');
      throw new Error('Failed to save upload');
    }

    logger.info({ uploadId: upload.id, wordCount }, '[Upload] Text upload successful');

    res.status(200).json({
      status: 'success',
      message: 'Text uploaded successfully',
      data: {
        upload_id: upload.id,
        filename: upload.filename,
        title: upload.title,
        subject: upload.subject,
        extracted_text: upload.extracted_text,
        confidence: upload.confidence,
        word_count: upload.word_count,
        created_at: upload.created_at,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Upload] Text upload failed');
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload text',
    });
  }
};

/**
 * Create upload from existing note
 * POST /api/uploads/from-note/:noteId
 */
export const createUploadFromNote = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { noteId } = req.params;

    logger.info({ userId, noteId }, '[Upload] Creating upload from note');

    const supabase = getSupabaseServer();

    // Fetch the note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (noteError || !note) {
      logger.error({ err: noteError }, '[Upload] Note not found');
      res.status(404).json({
        status: 'error',
        message: 'Note not found',
      });
      return;
    }

    // Calculate word count
    const wordCount = note.content.trim().split(/\s+/).filter((word: string) => word.length > 0).length;

    // Create upload from note content
    const { data: upload, error: insertError } = await supabase
      .from('uploads')
      .insert({
        user_id: userId,
        filename: `${note.title || 'Note'}.txt`,
        file_path: null,
        file_url: null,
        extracted_text: note.content.trim(),
        title: note.title || 'Untitled Note',
        subject: note.tags?.[0] || 'General',
        confidence: 1.0,
        word_count: wordCount,
      })
      .select()
      .single();

    if (insertError || !upload) {
      logger.error({ err: insertError }, '[Upload] Failed to create upload from note');
      throw new Error('Failed to create upload');
    }

    logger.info({ uploadId: upload.id, noteId }, '[Upload] Upload created from note successfully');

    res.status(200).json({
      status: 'success',
      message: 'Upload created from note successfully',
      data: {
        upload: {
          id: upload.id,
          filename: upload.filename,
          title: upload.title,
          subject: upload.subject,
          extracted_text: upload.extracted_text,
          confidence: upload.confidence,
          word_count: upload.word_count,
          created_at: upload.created_at,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Upload] Failed to create upload from note');
    res.status(500).json({
      status: 'error',
      message: 'Failed to create upload from note',
    });
  }
};
