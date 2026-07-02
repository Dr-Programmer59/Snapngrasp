import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { generateStudyMaterial } from '../services/claude.service';
import { logger } from '../utils/logger';

/**
 * Generate flashcards from uploaded image text
 */
export const generateFlashcards = async (req: Request, res: Response): Promise<void> => {
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
    const { count = 10, difficulty = 'medium' } = req.body;

    logger.info({ userId, uploadId, count, difficulty }, '[Flashcard] Generating flashcards...');

    // Get the upload and extracted text
    const supabase = getSupabaseServer();
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (uploadError || !upload) {
      logger.error({ err: uploadError }, '[Flashcard] Upload not found');
      res.status(404).json({
        status: 'error',
        message: 'Upload not found',
      });
      return;
    }

    if (!upload.extracted_text) {
      res.status(400).json({
        status: 'error',
        message: 'No text found in this upload',
      });
      return;
    }

    // Generate flashcards using Claude
    logger.info('[Flashcard] Calling Claude to generate flashcards...');
    const result = await generateStudyMaterial(upload.extracted_text, 'flashcards', {
      count,
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
    });

    // Parse the response
    let flashcardData: Array<{
      question: string;
      answer: string;
    }>;
    let generatedTitle: string | null = null;

    try {
      // Strip markdown code blocks if present
      let cleanContent = result.content.trim();
      
      // Remove ```json and ``` markers
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
      }
      
      // Try to parse as JSON, with repair for truncated responses
      let parsed;
      try {
        parsed = JSON.parse(cleanContent);
      } catch (firstError) {
        logger.warn('[Flashcard] JSON parse failed, attempting repair...');
        // Try to repair truncated JSON
        let repaired = cleanContent;
        
        // Close any unterminated strings
        const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          repaired += '"';
        }
        
        // Try to close incomplete objects/arrays
        // Count open and close braces/brackets
        let openBraces = (repaired.match(/{/g) || []).length;
        let closeBraces = (repaired.match(/}/g) || []).length;
        let openBrackets = (repaired.match(/\[/g) || []).length;
        let closeBrackets = (repaired.match(/\]/g) || []).length;
        
        // Remove any trailing comma before closing
        repaired = repaired.replace(/,\s*$/, '');
        
        // Close missing brackets and braces
        while (closeBrackets < openBrackets) {
          repaired += ']';
          closeBrackets++;
        }
        while (closeBraces < openBraces) {
          repaired += '}';
          closeBraces++;
        }
        
        try {
          parsed = JSON.parse(repaired);
          logger.info('[Flashcard] JSON repair successful');
        } catch (secondError) {
          // Last resort: extract whatever valid flashcards we can find
          logger.warn('[Flashcard] Repair failed, extracting partial flashcards...');
          const flashcardRegex = /\{\s*"question"\s*:\s*"([^"]*?)"\s*,\s*"answer"\s*:\s*"([^"]*?)"\s*(?:,\s*"explanation"\s*:\s*"([^"]*?)"\s*)?\}/g;
          const extracted: Array<{question: string; answer: string; explanation?: string}> = [];
          let match;
          while ((match = flashcardRegex.exec(cleanContent)) !== null) {
            extracted.push({
              question: match[1],
              answer: match[2],
              explanation: match[3] || '',
            });
          }
          
          // Try to extract title
          const titleMatch = cleanContent.match(/"title"\s*:\s*"([^"]*?)"/);
          
          if (extracted.length > 0) {
            parsed = {
              title: titleMatch ? titleMatch[1] : null,
              flashcards: extracted,
            };
            logger.info(`[Flashcard] Extracted ${extracted.length} flashcards from truncated response`);
          } else {
            throw firstError; // Re-throw original error
          }
        }
      }
      
      // Check if response has new format with title and flashcards
      if (parsed.title && parsed.flashcards) {
        generatedTitle = parsed.title;
        flashcardData = parsed.flashcards;
      } else if (Array.isArray(parsed)) {
        // Old format: array of flashcards
        flashcardData = parsed;
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (parseError) {
      logger.error({ err: parseError }, '[Flashcard] Failed to parse Claude response');
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate flashcards',
      });
      return;
    }

    // Validate flashcard data
    if (!Array.isArray(flashcardData) || flashcardData.length === 0) {
      logger.error('[Flashcard] Invalid flashcard data format');
      res.status(500).json({
        status: 'error',
        message: 'Invalid flashcard format received',
      });
      return;
    }

    // Insert flashcards into database
    // First, create the flashcard set
    const { data: flashcardSet, error: setError } = await supabase
      .from('flashcard_sets')
      .insert({
        user_id: userId,
        upload_id: uploadId,
        title: generatedTitle || upload.file_name || 'Flashcards',
        difficulty,
        total_cards: flashcardData.length,
        cards_reviewed: 0,
        cards_known: 0,
        cards_learning: 0,
        cards_to_review: flashcardData.length,
        progress: 0,
      })
      .select()
      .single();

    if (setError || !flashcardSet) {
      logger.error({ err: setError }, '[Flashcard] Failed to create flashcard set');
      res.status(500).json({
        status: 'error',
        message: 'Failed to create flashcard set',
      });
      return;
    }

    logger.info({ setId: flashcardSet.id }, '[Flashcard] Flashcard set created');

    const flashcardsToInsert = flashcardData.map((card) => ({
      user_id: userId,
      upload_id: uploadId,
      set_id: flashcardSet.id,
      front: card.question,
      back: card.answer,
      difficulty,
      mastery_level: 0,
      times_reviewed: 0,
      times_correct: 0,
    }));

    const { data: insertedFlashcards, error: insertError } = await supabase
      .from('flashcards')
      .insert(flashcardsToInsert)
      .select();

    if (insertError || !insertedFlashcards) {
      logger.error({ err: insertError }, '[Flashcard] Failed to insert flashcards');
      res.status(500).json({
        status: 'error',
        message: 'Failed to save flashcards',
      });
      return;
    }

    logger.info({ count: insertedFlashcards.length }, '[Flashcard] Flashcards generated successfully');

    res.status(201).json({
      status: 'success',
      data: {
        set_id: flashcardSet.id,
        flashcards: insertedFlashcards.map((card) => ({
          id: card.id,
          front: card.front,
          back: card.back,
          difficulty: card.difficulty,
          mastery_level: card.mastery_level,
          created_at: card.created_at,
        })),
        count: insertedFlashcards.length,
        upload_id: uploadId,
        metadata: result.metadata,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Flashcard] Flashcard generation failed');
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate flashcards',
    });
  }
};

/**
 * Get flashcards for a specific upload
 */
export const getFlashcardsByUpload = async (req: Request, res: Response): Promise<void> => {
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

    logger.info({ userId, uploadId }, '[Flashcard] Fetching flashcards...');

    const supabase = getSupabaseServer();

    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('upload_id', uploadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (flashcardsError) {
      logger.error({ err: flashcardsError }, '[Flashcard] Failed to fetch flashcards');
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch flashcards',
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        flashcards,
        count: flashcards.length,
        upload_id: uploadId,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Flashcard] Failed to fetch flashcards');
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch flashcards',
    });
  }
};

/**
 * Update flashcard review statistics
 */
export const reviewFlashcard = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { flashcardId } = req.params;
    const { is_correct } = req.body;

    if (typeof is_correct !== 'boolean') {
      res.status(400).json({
        status: 'error',
        message: 'is_correct must be a boolean',
      });
      return;
    }

    logger.info({ userId, flashcardId, is_correct }, '[Flashcard] Reviewing flashcard...');

    const supabase = getSupabaseServer();

    // Get current flashcard
    const { data: flashcard, error: fetchError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('id', flashcardId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !flashcard) {
      logger.error({ err: fetchError }, '[Flashcard] Flashcard not found');
      res.status(404).json({
        status: 'error',
        message: 'Flashcard not found',
      });
      return;
    }

    // Calculate new mastery level
    let newMasteryLevel = flashcard.mastery_level;
    if (is_correct && newMasteryLevel < 5) {
      newMasteryLevel += 1;
    } else if (!is_correct && newMasteryLevel > 0) {
      newMasteryLevel -= 1;
    }

    // Update flashcard
    const { data: updatedFlashcard, error: updateError } = await supabase
      .from('flashcards')
      .update({
        times_reviewed: flashcard.times_reviewed + 1,
        times_correct: flashcard.times_correct + (is_correct ? 1 : 0),
        last_reviewed_at: new Date().toISOString(),
        mastery_level: newMasteryLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', flashcardId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError || !updatedFlashcard) {
      logger.error({ err: updateError }, '[Flashcard] Failed to update flashcard');
      res.status(500).json({
        status: 'error',
        message: 'Failed to update flashcard',
      });
      return;
    }

    // Update flashcard set statistics
    if (flashcard.set_id) {
      const { data: allCards } = await supabase
        .from('flashcards')
        .select('*')
        .eq('set_id', flashcard.set_id);

      if (allCards && allCards.length > 0) {
        const totalCards = allCards.length;
        const cardsReviewed = allCards.filter((c: any) => c.times_reviewed > 0).length;
        const cardsKnown = allCards.filter((c: any) => c.mastery_level >= 4).length;
        const cardsLearning = allCards.filter((c: any) => c.mastery_level >= 1 && c.mastery_level < 4).length;
        const cardsToReview = allCards.filter((c: any) => c.mastery_level === 0).length;
        const progress = Math.round((cardsKnown / totalCards) * 100);

        // Update the set statistics
        await supabase
          .from('flashcard_sets')
          .update({
            cards_reviewed: cardsReviewed,
            cards_known: cardsKnown,
            cards_learning: cardsLearning,
            cards_to_review: cardsToReview,
            progress: progress,
          })
          .eq('id', flashcard.set_id);

        logger.info({ 
          setId: flashcard.set_id, 
          cardsReviewed, 
          cardsKnown, 
          cardsLearning,
          cardsToReview,
          progress 
        }, '[Flashcard] Set statistics updated');
      }
    }

    logger.info({ flashcardId, newMasteryLevel }, '[Flashcard] Flashcard reviewed successfully');

    res.json({
      status: 'success',
      data: {
        flashcard: updatedFlashcard,
        mastery_increased: is_correct && flashcard.mastery_level < 5,
        mastery_decreased: !is_correct && flashcard.mastery_level > 0,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Flashcard] Failed to review flashcard');
    res.status(500).json({
      status: 'error',
      message: 'Failed to review flashcard',
    });
  }
};

/**
 * Delete flashcard by ID
 */
export const deleteFlashcard = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { flashcardId } = req.params;

    logger.info({ userId, flashcardId }, '[Flashcard] Deleting flashcard...');

    const supabase = getSupabaseServer();

    const { error: deleteError } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', flashcardId)
      .eq('user_id', userId);

    if (deleteError) {
      logger.error({ err: deleteError }, '[Flashcard] Failed to delete flashcard');
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete flashcard',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Flashcard deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, '[Flashcard] Failed to delete flashcard');
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete flashcard',
    });
  }
};

/**
 * Get flashcards due for review (spaced repetition)
 */
export const getFlashcardsDueForReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { limit = 20 } = req.query;

    logger.info({ userId, limit }, '[Flashcard] Fetching flashcards due for review...');

    const supabase = getSupabaseServer();

    // Get flashcards that haven't been mastered and need review
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId)
      .lt('mastery_level', 5)
      .or(`last_reviewed_at.is.null,last_reviewed_at.lt.${oneDayAgo.toISOString()}`)
      .order('mastery_level', { ascending: true })
      .order('last_reviewed_at', { ascending: true, nullsFirst: true })
      .limit(Number(limit));

    if (flashcardsError) {
      logger.error({ err: flashcardsError }, '[Flashcard] Failed to fetch due flashcards');
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch flashcards',
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        flashcards,
        count: flashcards.length,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Flashcard] Failed to fetch due flashcards');
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch flashcards',
    });
  }
};

/**
 * Get flashcard set by ID with all flashcards
 */
export const getFlashcardSetById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { setId } = req.params;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    logger.info({ userId, setId }, '[Flashcard] Getting flashcard set...');

    const supabase = getSupabaseServer();

    // Get the flashcard set
    const { data: flashcardSet, error: setError } = await supabase
      .from('flashcard_sets')
      .select('*')
      .eq('id', setId)
      .eq('user_id', userId)
      .single();

    if (setError || !flashcardSet) {
      logger.error({ err: setError }, '[Flashcard] Flashcard set not found');
      res.status(404).json({
        status: 'error',
        message: 'Flashcard set not found',
      });
      return;
    }

    // Get all flashcards in this set
    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('set_id', setId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (flashcardsError) {
      logger.error({ err: flashcardsError }, '[Flashcard] Failed to fetch flashcards');
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch flashcards',
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        set: flashcardSet,
        flashcards: flashcards || [],
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Flashcard] Failed to get flashcard set');
    res.status(500).json({
      status: 'error',
      message: 'Failed to get flashcard set',
    });
  }
};

/**
 * Update flashcard set title
 */
export const updateFlashcardSetTitle = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseServer();
    const { setId } = req.params;
    const { title } = req.body;
    const userId = req.user!.id;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Title is required and must be a non-empty string',
      });
      return;
    }

    // Verify ownership
    const { data: flashcardSet, error: fetchError } = await supabase
      .from('flashcard_sets')
      .select('id')
      .eq('id', setId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !flashcardSet) {
      logger.error({ err: fetchError }, '[Flashcard] Flashcard set not found');
      res.status(404).json({
        status: 'error',
        message: 'Flashcard set not found',
      });
      return;
    }

    // Update title
    const { error: updateError } = await supabase
      .from('flashcard_sets')
      .update({ title: title.trim() })
      .eq('id', setId)
      .eq('user_id', userId);

    if (updateError) {
      logger.error({ err: updateError }, '[Flashcard] Failed to update title');
      res.status(500).json({
        status: 'error',
        message: 'Failed to update title',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Title updated successfully',
      data: { title: title.trim() },
    });
  } catch (error) {
    logger.error({ err: error }, '[Flashcard] Failed to update title');
    res.status(500).json({
      status: 'error',
      message: 'Failed to update title',
    });
  }
};

/**
 * Delete entire flashcard set with all its flashcards
 */
export const deleteFlashcardSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseServer();
    const { setId } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const { data: flashcardSet, error: fetchError } = await supabase
      .from('flashcard_sets')
      .select('id')
      .eq('id', setId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !flashcardSet) {
      logger.error({ err: fetchError }, '[Flashcard] Flashcard set not found');
      res.status(404).json({
        status: 'error',
        message: 'Flashcard set not found',
      });
      return;
    }

    // Delete all flashcards in the set first
    const { error: deleteCardsError } = await supabase
      .from('flashcards')
      .delete()
      .eq('set_id', setId)
      .eq('user_id', userId);

    if (deleteCardsError) {
      logger.error({ err: deleteCardsError }, '[Flashcard] Failed to delete flashcards');
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete flashcards',
      });
      return;
    }

    // Delete the set
    const { error: deleteSetError } = await supabase
      .from('flashcard_sets')
      .delete()
      .eq('id', setId)
      .eq('user_id', userId);

    if (deleteSetError) {
      logger.error({ err: deleteSetError }, '[Flashcard] Failed to delete flashcard set');
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete flashcard set',
      });
      return;
    }

    logger.info({ setId, userId }, '[Flashcard] Flashcard set deleted successfully');
    res.json({
      status: 'success',
      message: 'Flashcard set deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, '[Flashcard] Failed to delete flashcard set');
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete flashcard set',
    });
  }
};
