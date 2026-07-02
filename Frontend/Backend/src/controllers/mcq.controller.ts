import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { generateStudyMaterial } from '../services/claude.service';
import { logger } from '../utils/logger';

/**
 * Generate MCQs from uploaded image text
 */
export const generateMCQs = async (req: Request, res: Response): Promise<void> => {
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
    const { count = 5, difficulty = 'medium' } = req.body;

    logger.info({ userId, uploadId, count, difficulty }, '[MCQ] Generating MCQs...');

    // Get the upload and extracted text
    const supabase = getSupabaseServer();
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (uploadError || !upload) {
      logger.error({ err: uploadError }, '[MCQ] Upload not found');
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

    // Generate MCQs using Claude
    logger.info('[MCQ] Calling Claude to generate MCQs...');
    const result = await generateStudyMaterial(upload.extracted_text, 'quiz', {
      count,
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
    });
    
    console.log('\n========== CLAUDE RAW RESPONSE ==========');
    console.log('Raw content length:', result.content.length);
    console.log('First 500 chars:', result.content.substring(0, 500));
    console.log('========================================\n');

    // Parse the response
    let mcqData: Array<{
      question_type?: 'mcq' | 'fill_blank' | 'true_false';
      question: string;
      options: string[];
      correct_answer: number;
      correct_answer_text?: string;
      explanation: string;
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
      
      // Try to parse as JSON
      const parsed = JSON.parse(cleanContent);
      
      // Check if response has new format with title and mcqs
      if (parsed.title && parsed.mcqs) {
        generatedTitle = parsed.title;
        mcqData = parsed.mcqs;
      } else if (Array.isArray(parsed)) {
        // Old format: array of MCQs
        mcqData = parsed;
      } else {
        throw new Error('Unexpected response format');
      }
      
      console.log('\n========== PARSED MCQ DATA ==========');
      console.log('Title:', generatedTitle);
      console.log('Total questions:', mcqData.length);
      console.log('Question types breakdown:');
      const typeCounts = mcqData.reduce((acc, q) => {
        const type = q.question_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(JSON.stringify(typeCounts, null, 2));
      console.log('\nFull MCQ data:');
      console.log(JSON.stringify(mcqData, null, 2));
      console.log('=====================================\n');
    } catch (parseError) {
      logger.error({ err: parseError }, '[MCQ] Failed to parse Claude response');
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate MCQs',
      });
      return;
    }

    // Validate MCQ data
    if (!Array.isArray(mcqData) || mcqData.length === 0) {
      logger.error('[MCQ] Invalid MCQ data format');
      res.status(500).json({
        status: 'error',
        message: 'Invalid MCQ format received',
      });
      return;
    }

    // Insert MCQs and options into database
    const insertedMCQs = [];

    // First, create the MCQ set
    const { data: mcqSet, error: setError } = await supabase
      .from('mcq_sets')
      .insert({
        user_id: userId,
        upload_id: uploadId,
        title: generatedTitle || upload.file_name || 'Quiz',
        difficulty,
        total_questions: mcqData.length,
        questions_attempted: 0,
        correct_answers: 0,
        wrong_answers: 0,
        completed: false,
      })
      .select()
      .single();

    if (setError || !mcqSet) {
      logger.error({ err: setError }, '[MCQ] Failed to create MCQ set');
      res.status(500).json({
        status: 'error',
        message: 'Failed to create MCQ set',
      });
      return;
    }

    logger.info({ setId: mcqSet.id }, '[MCQ] MCQ set created');

    for (const mcq of mcqData) {
      // Insert MCQ with question_type support
      const { data: insertedMCQ, error: mcqError } = await supabase
        .from('mcqs')
        .insert({
          user_id: userId,
          upload_id: uploadId,
          set_id: mcqSet.id,
          question: mcq.question,
          question_type: mcq.question_type || 'mcq',
          correct_answer: mcq.correct_answer,
          correct_answer_text: mcq.correct_answer_text || null,
          explanation: mcq.explanation || null,
          difficulty,
        })
        .select()
        .single();

      if (mcqError || !insertedMCQ) {
        logger.error({ err: mcqError }, '[MCQ] Failed to insert MCQ');
        continue;
      }

      // Only insert options for MCQ and True/False types
      if ((mcq.question_type === 'mcq' || mcq.question_type === 'true_false') && mcq.options && mcq.options.length > 0) {
        const optionsData = mcq.options.map((optionText, index) => ({
          mcq_id: insertedMCQ.id,
          option_index: index,
          option_text: optionText,
        }));

        const { error: optionsError } = await supabase
          .from('mcq_options')
          .insert(optionsData);

        if (optionsError) {
          logger.error({ err: optionsError }, '[MCQ] Failed to insert options');
          continue;
        }
      }

      insertedMCQs.push({
        id: insertedMCQ.id,
        question_type: insertedMCQ.question_type,
        question: insertedMCQ.question,
        options: mcq.options,
        correct_answer: insertedMCQ.correct_answer,
        correct_answer_text: insertedMCQ.correct_answer_text,
        explanation: insertedMCQ.explanation,
        difficulty: insertedMCQ.difficulty,
      });
    }

    logger.info({ count: insertedMCQs.length }, '[MCQ] MCQs generated successfully');
    
    console.log('\n========== FINAL RESPONSE TO FRONTEND ==========');
    console.log('Set ID:', mcqSet.id);
    console.log('Total MCQs inserted:', insertedMCQs.length);
    console.log('Question types in response:');
    const responseTypes = insertedMCQs.reduce((acc, q) => {
      const type = q.question_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(JSON.stringify(responseTypes, null, 2));
    console.log('Sample questions:');
    insertedMCQs.slice(0, 3).forEach((q, i) => {
      console.log(`  ${i+1}. Type: ${q.question_type}, Question: ${q.question.substring(0, 50)}...`);
    });
    console.log('===============================================\n');

    res.status(201).json({
      status: 'success',
      data: {
        set_id: mcqSet.id,
        mcqs: insertedMCQs,
        count: insertedMCQs.length,
        upload_id: uploadId,
        metadata: result.metadata,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[MCQ] MCQ generation failed');
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate MCQs',
    });
  }
};

/**
 * Get MCQs for a specific upload
 */
export const getMCQsByUpload = async (req: Request, res: Response): Promise<void> => {
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

    logger.info({ userId, uploadId }, '[MCQ] Fetching MCQs...');

    const supabase = getSupabaseServer();

    // Get MCQs with options
    const { data: mcqs, error: mcqsError } = await supabase
      .from('mcqs')
      .select(`
        *,
        mcq_options (
          option_index,
          option_text
        )
      `)
      .eq('upload_id', uploadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (mcqsError) {
      logger.error({ err: mcqsError }, '[MCQ] Failed to fetch MCQs');
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch MCQs',
      });
      return;
    }

    // Format response
    const formattedMCQs = mcqs.map((mcq: any) => ({
      id: mcq.id,
      question_type: mcq.question_type,
      question: mcq.question,
      options: mcq.mcq_options
        .sort((a: any, b: any) => a.option_index - b.option_index)
        .map((opt: any) => opt.option_text),
      correct_answer: mcq.correct_answer,
      correct_answer_text: mcq.correct_answer_text,
      explanation: mcq.explanation,
      difficulty: mcq.difficulty,
      created_at: mcq.created_at,
    }));

    res.json({
      status: 'success',
      data: {
        mcqs: formattedMCQs,
        count: formattedMCQs.length,
        upload_id: uploadId,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[MCQ] Failed to fetch MCQs');
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch MCQs',
    });
  }
};

/**
 * Submit answer for a specific MCQ
 */
export const submitMCQAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { mcqId } = req.params;
    const { selected_answer, answer_text } = req.body;

    logger.info({ userId, mcqId, selected_answer, answer_text }, '[MCQ] Submitting answer...');

    const supabase = getSupabaseServer();

    // Get the MCQ to check correct answer and question type
    const { data: mcq, error: mcqError } = await supabase
      .from('mcqs')
      .select('*')
      .eq('id', mcqId)
      .eq('user_id', userId)
      .single();

    if (mcqError || !mcq) {
      logger.error({ err: mcqError }, '[MCQ] MCQ not found');
      res.status(404).json({
        status: 'error',
        message: 'MCQ not found',
      });
      return;
    }

    // Determine if answer is correct based on question type
    let isCorrect = false;
    let submittedAnswer = selected_answer;

    if (mcq.question_type === 'fill_blank') {
      // For fill-in-the-blank, compare answer_text (case-insensitive, trimmed)
      if (!answer_text) {
        res.status(400).json({
          status: 'error',
          message: 'Answer text is required for fill-in-the-blank questions',
        });
        return;
      }
      const userAnswer = answer_text.trim().toLowerCase();
      const correctAnswer = (mcq.correct_answer_text || '').trim().toLowerCase();
      isCorrect = userAnswer === correctAnswer;
      submittedAnswer = -1; // Not using index for fill_blank
    } else {
      // For MCQ and True/False, compare selected_answer index
      if (selected_answer === undefined || selected_answer === null) {
        res.status(400).json({
          status: 'error',
          message: 'Selected answer is required',
        });
        return;
      }
      isCorrect = mcq.correct_answer === selected_answer;
    }

    // Insert or update user answer
    const { error: answerError } = await supabase
      .from('mcq_user_answers')
      .upsert({
        mcq_id: mcqId,
        user_id: userId,
        selected_answer: submittedAnswer,
        answer_text: answer_text || null,
        is_correct: isCorrect,
      }, {
        onConflict: 'mcq_id,user_id',
      });

    if (answerError) {
      logger.error({ err: answerError }, '[MCQ] Failed to save answer');
      res.status(500).json({
        status: 'error',
        message: 'Failed to save answer',
      });
      return;
    }

    // Update MCQ set statistics
    if (mcq.set_id) {
      // Get all MCQs in this set
      const { data: setMCQs } = await supabase
        .from('mcqs')
        .select('id')
        .eq('set_id', mcq.set_id);

      // Get all user answers for this set
      const { data: setAnswers } = await supabase
        .from('mcq_user_answers')
        .select('*')
        .eq('user_id', userId)
        .in('mcq_id', setMCQs?.map((m: any) => m.id) || []);

      if (setMCQs && setAnswers) {
        const questionsAttempted = setAnswers.length;
        const correctAnswers = setAnswers.filter((a: any) => a.is_correct).length;
        const wrongAnswers = setAnswers.filter((a: any) => !a.is_correct).length;
        const completed = questionsAttempted === setMCQs.length;

        // Update the set statistics
        await supabase
          .from('mcq_sets')
          .update({
            questions_attempted: questionsAttempted,
            correct_answers: correctAnswers,
            wrong_answers: wrongAnswers,
            completed: completed,
          })
          .eq('id', mcq.set_id);

        logger.info({ 
          setId: mcq.set_id, 
          questionsAttempted, 
          correctAnswers, 
          wrongAnswers, 
          completed 
        }, '[MCQ] Set statistics updated');
      }
    }

    res.json({
      status: 'success',
      data: {
        is_correct: isCorrect,
        correct_answer: mcq.correct_answer,
        correct_answer_text: mcq.correct_answer_text,
        explanation: mcq.explanation,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[MCQ] Failed to submit answer');
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit answer',
    });
  }
};

/**
 * Delete MCQ by ID
 */
export const deleteMCQ = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { mcqId } = req.params;

    logger.info({ userId, mcqId }, '[MCQ] Deleting MCQ...');

    const supabase = getSupabaseServer();

    // Delete MCQ (options will be deleted automatically via CASCADE)
    const { error: deleteError } = await supabase
      .from('mcqs')
      .delete()
      .eq('id', mcqId)
      .eq('user_id', userId);

    if (deleteError) {
      logger.error({ err: deleteError }, '[MCQ] Failed to delete MCQ');
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete MCQ',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'MCQ deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, '[MCQ] Failed to delete MCQ');
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete MCQ',
    });
  }
};

/**
 * Get MCQ set by ID with all questions
 */
export const getMCQSetById = async (req: Request, res: Response): Promise<void> => {
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

    logger.info({ userId, setId }, '[MCQ] Getting MCQ set...');

    const supabase = getSupabaseServer();

    // Get the MCQ set
    const { data: mcqSet, error: setError } = await supabase
      .from('mcq_sets')
      .select('*')
      .eq('id', setId)
      .eq('user_id', userId)
      .single();

    if (setError || !mcqSet) {
      logger.error({ err: setError }, '[MCQ] MCQ set not found');
      res.status(404).json({
        status: 'error',
        message: 'MCQ set not found',
      });
      return;
    }

    // Get all MCQs in this set with their options
    const { data: mcqs, error: mcqsError } = await supabase
      .from('mcqs')
      .select(`
        *,
        mcq_options (*)
      `)
      .eq('set_id', setId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (mcqsError) {
      logger.error({ err: mcqsError }, '[MCQ] Failed to fetch MCQs');
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch MCQs',
      });
      return;
    }

    // Get user's previous answers for this set
    const mcqIds = (mcqs || []).map((mcq: any) => mcq.id);
    const { data: userAnswers, error: answersError } = await supabase
      .from('mcq_user_answers')
      .select('*')
      .eq('user_id', userId)
      .in('mcq_id', mcqIds);

    if (answersError) {
      logger.warn({ err: answersError }, '[MCQ] Failed to fetch user answers, continuing without them');
    }

    // Create a map of mcq_id -> user answer
    const answersMap = new Map();
    (userAnswers || []).forEach((answer: any) => {
      answersMap.set(answer.mcq_id, answer);
    });

    // Transform MCQs to match frontend expectations
    const formattedMCQs = (mcqs || []).map((mcq: any) => {
      // Extract options array from mcq_options relation
      const optionsData = mcq.mcq_options || [];
      
      // Sort options by option_index to ensure consistent order
      const sortedOptions = [...optionsData].sort((a: any, b: any) => a.option_index - b.option_index);
      
      // Create simple string array
      const options = sortedOptions.map((opt: any) => opt.option_text);
      
      // The correct_answer is stored as an index in the mcqs table
      // No need to search for it - just use mcq.correct_answer directly
      
      // Get user's previous answer if exists
      const userAnswer = answersMap.get(mcq.id);
      
      return {
        id: mcq.id,
        question: mcq.question,
        options: options,
        correct_answer: mcq.correct_answer,
        explanation: mcq.explanation,
        difficulty: mcq.difficulty,
        created_at: mcq.created_at,
        updated_at: mcq.updated_at,
        // Include user's previous answer if they've answered this question
        user_answer: userAnswer ? {
          selected_answer: userAnswer.selected_answer,
          is_correct: userAnswer.is_correct,
          answered_at: userAnswer.created_at,
        } : null,
      };
    });

    res.json({
      status: 'success',
      data: {
        set: mcqSet,
        mcqs: formattedMCQs,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[MCQ] Failed to get MCQ set');
    res.status(500).json({
      status: 'error',
      message: 'Failed to get MCQ set',
    });
  }
};

/**
 * Update MCQ set title
 */
export const updateMCQSetTitle = async (req: Request, res: Response): Promise<void> => {
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
    const { data: mcqSet, error: fetchError } = await supabase
      .from('mcq_sets')
      .select('id')
      .eq('id', setId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !mcqSet) {
      logger.error({ err: fetchError }, '[MCQ] MCQ set not found');
      res.status(404).json({
        status: 'error',
        message: 'MCQ set not found',
      });
      return;
    }

    // Update title
    const { error: updateError } = await supabase
      .from('mcq_sets')
      .update({ title: title.trim() })
      .eq('id', setId)
      .eq('user_id', userId);

    if (updateError) {
      logger.error({ err: updateError }, '[MCQ] Failed to update title');
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
    logger.error({ err: error }, '[MCQ] Failed to update title');
    res.status(500).json({
      status: 'error',
      message: 'Failed to update title',
    });
  }
};

/**
 * Delete entire MCQ set with all its questions
 */
export const deleteMCQSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseServer();
    const { setId } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const { data: mcqSet, error: fetchError } = await supabase
      .from('mcq_sets')
      .select('id')
      .eq('id', setId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !mcqSet) {
      logger.error({ err: fetchError }, '[MCQ] MCQ set not found');
      res.status(404).json({
        status: 'error',
        message: 'MCQ set not found',
      });
      return;
    }

    // Get all MCQ IDs in this set
    const { data: mcqs } = await supabase
      .from('mcqs')
      .select('id')
      .eq('set_id', setId);

    const mcqIds = mcqs?.map(m => m.id) || [];

    // Delete all MCQ answers
    if (mcqIds.length > 0) {
      await supabase
        .from('mcq_answers')
        .delete()
        .in('mcq_id', mcqIds);

      // Delete all MCQ options
      await supabase
        .from('mcq_options')
        .delete()
        .in('mcq_id', mcqIds);
    }

    // Delete all MCQs in the set
    const { error: deleteMCQsError } = await supabase
      .from('mcqs')
      .delete()
      .eq('set_id', setId)
      .eq('user_id', userId);

    if (deleteMCQsError) {
      logger.error({ err: deleteMCQsError }, '[MCQ] Failed to delete MCQs');
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete MCQs',
      });
      return;
    }

    // Delete the set
    const { error: deleteSetError } = await supabase
      .from('mcq_sets')
      .delete()
      .eq('id', setId)
      .eq('user_id', userId);

    if (deleteSetError) {
      logger.error({ err: deleteSetError }, '[MCQ] Failed to delete MCQ set');
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete MCQ set',
      });
      return;
    }

    logger.info({ setId, userId }, '[MCQ] MCQ set deleted successfully');
    res.json({
      status: 'success',
      message: 'MCQ set deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, '[MCQ] Failed to delete MCQ set');
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete MCQ set',
    });
  }
};
