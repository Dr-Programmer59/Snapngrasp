import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';
import Anthropic from '@anthropic-ai/sdk';
import { generateImage } from '../services/imagen.service';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Use the same model as claude.service.ts (Claude Sonnet 4.5)
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

/**
 * Generate visual question cards from upload text
 * 
 * NOTE: This is the legacy visual controller using drag-and-drop slots.
 * New implementations should use labeled-visual.controller.ts instead,
 * which generates interactive MCQ-based labeled diagrams.
 * 
 * This endpoint is kept for backward compatibility.
 */
export const generateVisuals = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🎨 [Visual] ==================== VISUAL GENERATION START ====================');

    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const userId = req.user.id;
    const { uploadId } = req.params;
    const { subject, count = 1 } = req.body;

    // 1. Fetch the source text
    const supabase = getSupabaseServer();
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .select('extracted_text')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (uploadError || !upload?.extracted_text) {
      res.status(404).json({ status: 'error', message: 'Source text not found' });
      return;
    }

    // 2. Instruct Claude to design the visual and the Gemini prompt
    const prompt = `You are an EXPERT SCIENTIFIC EDUCATIONAL DIAGRAM DESIGNER specializing in anatomically and scientifically accurate visuals.

🔬 SOURCE MATERIAL (USE ONLY THIS - VERIFY ALL FACTS):
${upload.extracted_text}

YOUR TASK:
Analyze the text above and create ${count} scientifically accurate labeling activity/activities.

For each activity, generate a JSON object with VERIFIED, ACCURATE information from the source material.

EXAMPLE JSON FORMAT:
{
  "title": "Specific, descriptive title based on source content",
  "subject": "${subject || 'General'}",
  "instruction_text": "Fill in the missing labels for the [specific anatomical structure/system/process].",
  "difficulty": "easy" | "medium" | "hard",
  "image_prompt": "🔬 SCIENTIFIC ACCURACY REQUIRED FOR GEMINI IMAGE GENERATOR:
    
    SUBJECT: Create a professional 2D educational vector illustration of [SPECIFIC TOPIC FROM SOURCE MATERIAL] centered on a pure white background (#FFFFFF).
    
    STYLE REQUIREMENTS:
    - Flat, clean, scientific schematic with accurate proportions
    - Use medically/scientifically accurate colors and spatial relationships
    - Anatomically correct positioning and structure orientation
    - Clear, bold outlines with appropriate depth perception
    - Professional educational illustration quality
    
    STRUCTURAL ACCURACY:
    - Verify anatomical structure against source material
    - Use correct proportions and scale relationships
    - Position all parts in anatomically accurate locations
    - Include all major structural features visible in standard diagrams
    - Ensure spatial relationships match real anatomy/structure
    
    LABELED CALLOUTS (PRE-LABELED - STUDENT SEES THESE):
    Draw thin pointer lines (2px) to these SPECIFIC parts and write the EXACT name clearly in a small white box with colored border:
    - [EXACT part name from source] - positioned at [SPECIFIC anatomical location]
    - [EXACT part name from source] - positioned at [SPECIFIC anatomical location]
    - [EXACT part name from source] - positioned at [SPECIFIC anatomical location]
    
    UNLABELED CALLOUTS (HIDDEN - STUDENT MUST FILL THESE):
    Draw thin pointer lines (2px) to these SPECIFIC parts ending in EMPTY white boxes with dashed border (#999999):
    - [EXACT part name - will be hidden] - point to [SPECIFIC anatomical location]
    - [EXACT part name - will be hidden] - point to [SPECIFIC anatomical location]
    - [EXACT part name - will be hidden] - point to [SPECIFIC anatomical location]
    - [EXACT part name - will be hidden] - point to [SPECIFIC anatomical location]
    - [EXACT part name - will be hidden] - point to [SPECIFIC anatomical location]
    
    LAYOUT:
    - Vertical 9:16 aspect ratio (portrait - 1080x1920px ideal)
    - Pure white background with 10% margins
    - Main structure centered, occupying 60-70% of space
    - Callout boxes positioned around perimeter with clear pointer lines
    - High contrast for mobile display
    - No titles, legends, or extra UI elements
    
    VALIDATION:
    ✓ Structure is anatomically/scientifically accurate
    ✓ All part names match source material exactly
    ✓ Positioning is anatomically correct
    ✓ Proportions and spatial relationships are accurate
    ✓ Colors follow scientific/medical conventions
    ✓ Pointer lines aim at precise anatomical locations",
  "labels": [
    { "labelId": "l1", "text": "EXACT Part Name from Source", "isKnown": true, "hint": "Detailed educational hint with function/location" },
    { "labelId": "l2", "text": "EXACT Part Name from Source", "isKnown": false, "hint": "Educational hint without giving away answer" }
  ]
}

🚨 CRITICAL ACCURACY RULES:
1. ALL information must come from the source material - DO NOT add external information
2. Part names must be EXACTLY as described in source (use proper scientific terminology)
3. Anatomical positions must be FACTUALLY CORRECT (verify against source)
4. Provide 2-3 "isKnown": true labels with EXACT names for Gemini to draw
5. Provide 5-8 "isKnown": false labels with EXACT names (Gemini draws empty boxes at correct locations)
6. Hints must be educational and accurate, not misleading
7. Names in 'labels' array must EXACTLY match what you tell Gemini to write/position
8. Verify all anatomical relationships (e.g., "left ventricle" is on the LEFT, "superior" is ABOVE)
9. Use correct medical/scientific color conventions
10. Output ONLY valid JSON array - no markdown, no extra text

🔍 VALIDATION CHECKLIST:
□ All content verified against source material
□ Part names are scientifically accurate
□ Anatomical positioning is correct
□ Labels match between image_prompt and labels array
□ Hints are educational and accurate
□ JSON syntax is valid

Generate ${count} activity/activities now with VERIFIED accuracy:`;

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0.3, // Lower temperature for accuracy
      messages: [{ role: 'user', content: prompt }],
    });

    // 3. Parse Claude's response
    const contentBlock = message.content[0];
    if (contentBlock.type !== 'text') throw new Error('Claude returned non-text content');
    
    let cleanContent = contentBlock.text.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
    }

    const visualsData = JSON.parse(cleanContent);
    const createdVisuals = [];

    // 4. Process each visual and generate images
    for (const data of visualsData) {
      console.log(`🖼️ [Visual] Generating image for: ${data.title}`);
      
      let imageUrl: string;
      try {
        // Assuming generateImage is your helper function for Nano Banana
        const imageResult = await generateImage(data.image_prompt);
        imageUrl = imageResult.imageUrl;
      } catch (err) {
        console.error('❌ Image generation failed, using placeholder');
        imageUrl = `https://via.placeholder.com/1024x1024?text=${encodeURIComponent(data.title)}`;
      }

      // 5. Save the main Visual record
      const { data: visual, error: vError } = await supabase
        .from('visuals')
        .insert({
          user_id: userId,
          upload_id: uploadId,
          title: data.title,
          question_text: data.instruction_text,
          image_url: imageUrl,
          image_prompt: data.image_prompt,
          subject: data.subject,
          difficulty: data.difficulty,
          total_steps: data.labels.filter((l: any) => !l.isKnown).length, // Only count what student needs to do
          generation_status: 'completed'
        })
        .select().single();

      if (vError) {
        console.error('❌ DB Error inserting visual:', vError);
        continue;
      }

      // 6. Save Labels and create Slots
      const labelsToInsert = data.labels.map((l: any) => ({
        visual_id: visual.id,
        label_id: l.labelId,
        text: l.text,
        name: l.text,
        hint: l.hint,
        is_known: l.isKnown // Add this column to your DB if possible to track state
      }));

      const { error: lError } = await supabase.from('visual_labels').insert(labelsToInsert);
      
      // We create slots based on labels. 
      // Since Nano Banana draws the boxes, the "slots" here are logical markers 
      // for your frontend to know what labels are available to drag.
      const slotsToInsert = data.labels.map((l: any) => ({
        visual_id: visual.id,
        slot_id: `slot_${l.labelId}`,
        correct_label_id: l.labelId,
        is_pre_labeled: l.isKnown,
        is_required: !l.isKnown,
        x: 0, // Coordinates are ignored as requested, logic handled by 'is_pre_labeled'
        y: 0
      }));

      const { error: sError } = await supabase.from('visual_slots').insert(slotsToInsert);

      if (!lError && !sError) {
        createdVisuals.push({ ...visual, labels: labelsToInsert, slots: slotsToInsert });
      }
    }

    res.status(201).json({
      status: 'success',
      data: { visuals: createdVisuals, count: createdVisuals.length }
    });

  } catch (error) {
    logger.error({ err: error }, '[Visual] Visual generation failed');
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};
/**
 * Get all visuals for a specific upload
 */
export const getVisualsByUpload = async (req: Request, res: Response): Promise<void> => {
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

    console.log('📋 [Visual] Fetching visuals by upload:', uploadId);
    logger.info({ userId, uploadId }, '[Visual] Fetching visuals...');

    const supabase = getSupabaseServer();

    // Get visuals
    const { data: visuals, error: visualsError } = await supabase
      .from('visuals')
      .select('*')
      .eq('upload_id', uploadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (visualsError) {
      console.error('❌ [Visual] Failed to fetch visuals:', visualsError);
      logger.error({ err: visualsError }, '[Visual] Failed to fetch visuals');
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch visuals',
      });
      return;
    }

    console.log('✅ [Visual] Found', visuals.length, 'visuals');

    // Get labels and slots for each visual
    const visualsWithDetails = await Promise.all(
      visuals.map(async (visual) => {
        console.log('🔍 [Visual] Fetching details for:', visual.title);
        
        const { data: labels, error: labelsError } = await supabase
          .from('visual_labels')
          .select('*')
          .eq('visual_id', visual.id);

        console.log('🏷️ [Visual] Labels for', visual.title, ':', {
          count: labels?.length || 0,
          error: labelsError
        });

        const { data: slots, error: slotsError } = await supabase
          .from('visual_slots')
          .select('*')
          .eq('visual_id', visual.id);

        console.log('🎯 [Visual] Slots for', visual.title, ':', {
          count: slots?.length || 0,
          error: slotsError
        });

        return {
          ...visual,
          labels: labels || [],
          slots: slots || [],
        };
      })
    );

    console.log('📤 [Visual] Sending response with', visualsWithDetails.length, 'visuals');
    console.log('📤 [Visual] First visual:', JSON.stringify(visualsWithDetails[0], null, 2));

    res.json({
      status: 'success',
      data: {
        visuals: visualsWithDetails,
        count: visualsWithDetails.length,
        upload_id: uploadId,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Visual] Failed to fetch visuals');
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch visuals',
    });
  }
};

/**
 * Get a single visual by ID
 */
export const getVisualById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { visualId } = req.params;

    console.log('🔍 [Visual] Fetching visual by ID:', visualId);
    console.log('👤 [Visual] User ID:', userId);
    logger.info({ userId, visualId }, '[Visual] Fetching visual...');

    const supabase = getSupabaseServer();

    const { data: visual, error: visualError } = await supabase
      .from('visuals')
      .select('*')
      .eq('id', visualId)
      .eq('user_id', userId)
      .single();

    if (visualError || !visual) {
      console.error('❌ [Visual] Visual not found:', visualError);
      logger.error({ err: visualError }, '[Visual] Visual not found');
      res.status(404).json({
        status: 'error',
        message: 'Visual not found',
      });
      return;
    }

    console.log('✅ [Visual] Visual record found:', visual.title);
    console.log('📊 [Visual] Visual data:', JSON.stringify(visual, null, 2));

    // Get labels and slots
    console.log('🏷️ [Visual] Fetching labels for visual_id:', visual.id);
    const { data: labels, error: labelsError } = await supabase
      .from('visual_labels')
      .select('*')
      .eq('visual_id', visual.id);

    console.log('🏷️ [Visual] Labels query result:', {
      count: labels?.length || 0,
      error: labelsError,
      data: labels
    });

    console.log('🎯 [Visual] Fetching slots for visual_id:', visual.id);
    const { data: slots, error: slotsError } = await supabase
      .from('visual_slots')
      .select('*')
      .eq('visual_id', visual.id);

    console.log('🎯 [Visual] Slots query result:', {
      count: slots?.length || 0,
      error: slotsError,
      data: slots
    });

    // Get user's progress
    console.log('📈 [Visual] Fetching user answers...');
    const { data: answers, error: answersError } = await supabase
      .from('visual_user_answers')
      .select('*')
      .eq('visual_id', visual.id)
      .eq('user_id', userId);

    console.log('📈 [Visual] Answers query result:', {
      count: answers?.length || 0,
      error: answersError
    });

    const requiredSlots = slots?.filter(s => s.is_required && !s.is_pre_labeled) || [];
    const correctAnswers = answers?.filter((a) => a.is_correct) || [];

    // Mark as viewed when fetched
    if (!visual.viewed) {
      await supabase
        .from('visuals')
        .update({ 
          viewed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', visual.id);
      visual.viewed = true;
    }
    
    console.log('📊 [Visual] Progress calculation:', {
      requiredSlotsCount: requiredSlots.length,
      correctAnswersCount: correctAnswers.length
    });
    
    const progress = {
      current_step: correctAnswers.length,
      total_steps: requiredSlots.length,
      completed: correctAnswers.length >= requiredSlots.length,
    };

    const responseData = {
      ...visual,
      labels: labels || [],
      slots: slots || [],
      progress,
    };

    console.log('📤 [Visual] Sending response with:', {
      title: visual.title,
      labelsCount: labels?.length || 0,
      slotsCount: slots?.length || 0,
      hasProgress: !!progress
    });
    console.log('📤 [Visual] Full response data:', JSON.stringify(responseData, null, 2));

    res.json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    logger.error({ err: error }, '[Visual] Failed to fetch visual');
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch visual',
    });
  }
};

/**
 * Submit answer for a visual label
 */
export const submitAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { visualId } = req.params;
    const { label_id, slot_id, selected_option, time_taken_seconds } = req.body;

    // Support both old (label_id) and new (slot_id) formats
    if ((!label_id && !slot_id) || !selected_option) {
      res.status(400).json({
        status: 'error',
        message: 'Either label_id or slot_id, and selected_option are required',
      });
      return;
    }

    logger.info({ userId, visualId, label_id, slot_id, selected_option }, '[Visual] Submitting answer...');

    const supabase = getSupabaseServer();

    let isCorrect = false;
    let labelIdToUse = label_id;
    let correctAnswerText = '';

    if (slot_id) {
      // New slot-based system
      const { data: slot, error: slotError } = await supabase
        .from('visual_slots')
        .select('*, visual_labels!inner(id, label_id, text)')
        .eq('visual_id', visualId)
        .eq('slot_id', slot_id)
        .single();

      if (slotError || !slot) {
        logger.error({ err: slotError }, '[Visual] Slot not found');
        res.status(404).json({
          status: 'error',
          message: 'Slot not found',
        });
        return;
      }

      // Find the correct label for this slot
      const { data: correctLabel } = await supabase
        .from('visual_labels')
        .select('*')
        .eq('visual_id', visualId)
        .eq('label_id', slot.correct_label_id)
        .single();

      if (correctLabel) {
        isCorrect = correctLabel.text === selected_option;
        labelIdToUse = correctLabel.id; // Use the database UUID
        correctAnswerText = correctLabel.text;
      }
    } else {
      // Old label-based system (backward compatibility)
      const { data: label, error: labelError } = await supabase
        .from('visual_labels')
        .select('*')
        .eq('id', label_id)
        .single();

      if (labelError || !label) {
        logger.error({ err: labelError }, '[Visual] Label not found');
        res.status(404).json({
          status: 'error',
          message: 'Label not found',
        });
        return;
      }

      isCorrect = label.name === selected_option || label.text === selected_option;
      correctAnswerText = label.name || label.text;
    }

    // Insert answer
    const { data: answer, error: answerError } = await supabase
      .from('visual_user_answers')
      .insert({
        visual_id: visualId,
        user_id: userId,
        label_id: labelIdToUse,
        slot_id: slot_id || null,
        selected_option,
        is_correct: isCorrect,
        time_taken_seconds: time_taken_seconds || null,
      })
      .select()
      .single();

    if (answerError || !answer) {
      logger.error({ err: answerError }, '[Visual] Failed to insert answer');
      res.status(500).json({
        status: 'error',
        message: 'Failed to submit answer',
      });
      return;
    }

    // Get updated progress
    const { data: visual } = await supabase
      .from('visuals')
      .select('total_steps, total_slots')
      .eq('id', visualId)
      .single();

    const { data: allAnswers } = await supabase
      .from('visual_user_answers')
      .select('*')
      .eq('visual_id', visualId)
      .eq('user_id', userId);

    const correctAnswersCount = allAnswers?.filter(a => a.is_correct).length || 0;
    const slotsFilled = allAnswers?.length || 0;
    const totalSlots = visual?.total_slots || visual?.total_steps || 0;
    const isCompleted = totalSlots > 0 && correctAnswersCount === totalSlots;

    // Update visual progress tracking
    await supabase
      .from('visuals')
      .update({
        slots_filled: slotsFilled,
        correct_slots: correctAnswersCount,
        completed: isCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visualId);

    const progress = {
      current_step: correctAnswersCount,
      total_steps: totalSlots,
      slots_filled: slotsFilled,
      correct_slots: correctAnswersCount,
      completed: isCompleted,
    };

    logger.info({ isCorrect, progress }, '[Visual] Answer submitted');

    res.status(201).json({
      status: 'success',
      data: {
        answer: {
          id: answer.id,
          is_correct: isCorrect,
          correct_answer: correctAnswerText,
          selected_option,
        },
        progress,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Visual] Failed to submit answer');
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit answer',
    });
  }
};

/**
 * Update visual title
 */
export const updateVisualTitle = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { visualId } = req.params;
    const { title } = req.body;

    if (!title || title.trim() === '') {
      res.status(400).json({
        status: 'error',
        message: 'Title is required',
      });
      return;
    }

    logger.info({ userId, visualId, title }, '[Visual] Updating visual title...');

    const supabase = getSupabaseServer();

    const { data: visual, error: updateError } = await supabase
      .from('visuals')
      .update({ subject: title.trim() })
      .eq('id', visualId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError || !visual) {
      logger.error({ err: updateError }, '[Visual] Failed to update visual title');
      res.status(500).json({
        status: 'error',
        message: 'Failed to update visual title',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Visual title updated successfully',
      data: { visual },
    });
  } catch (error) {
    logger.error({ err: error }, '[Visual] Failed to update visual title');
    res.status(500).json({
      status: 'error',
      message: 'Failed to update visual title',
    });
  }
};

/**
 * Delete a visual
 */
export const deleteVisual = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const { visualId } = req.params;

    logger.info({ userId, visualId }, '[Visual] Deleting visual...');

    const supabase = getSupabaseServer();

    const { error: deleteError } = await supabase
      .from('visuals')
      .delete()
      .eq('id', visualId)
      .eq('user_id', userId);

    if (deleteError) {
      logger.error({ err: deleteError }, '[Visual] Failed to delete visual');
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete visual',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Visual deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, '[Visual] Failed to delete visual');
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete visual',
    });
  }
};
