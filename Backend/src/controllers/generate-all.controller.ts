import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { generateStudyMaterial } from '../services/claude.service';
import { generateImage } from '../services/imagen.service';
import { logger } from '../utils/logger';
import { consumeCredit } from '../middlewares/credit.middleware';
import Anthropic from '@anthropic-ai/sdk';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

const PLAN_DIAGRAM_LIMITS: Record<string, number> = {
  free: 0,
  pro: 30,
  pro_annual: 30,
  pro_plus: 80,
};

type DiagramCreditCheck = {
  allowed: boolean;
  reason?: string;
  used?: number;
  limit?: number;
};

async function checkDiagramCredit(supabase: any, userId: string): Promise<DiagramCreditCheck> {
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan_id, status, expires_at')
    .eq('user_id', userId)
    .single();

  const planId = subscription?.plan_id || 'free';
  const defaultLimit = PLAN_DIAGRAM_LIMITS[planId] ?? 0;

  if (defaultLimit === 0) {
    return { allowed: false, reason: 'Diagrams unavailable on current plan', used: 0, limit: 0 };
  }

  if (subscription?.status === 'past_due' || subscription?.status === 'canceled') {
    return { allowed: false, reason: 'Subscription is not active', used: 0, limit: defaultLimit };
  }

  if (subscription?.status === 'canceling' && subscription?.expires_at) {
    const expiry = new Date(subscription.expires_at);
    if (new Date() > expiry) {
      return { allowed: false, reason: 'Subscription expired', used: 0, limit: defaultLimit };
    }
  }

  const { data: credits } = await supabase
    .from('user_credits')
    .select('diagrams_used, diagrams_limit')
    .eq('user_id', userId)
    .single();

  const used = credits?.diagrams_used ?? 0;
  const limit = credits?.diagrams_limit ?? defaultLimit;

  if (limit <= 0) {
    return { allowed: false, reason: 'Diagrams unavailable on current plan', used, limit };
  }

  if (used >= limit) {
    return { allowed: false, reason: 'Diagram credit exhausted', used, limit };
  }

  return { allowed: true, used, limit };
}

/**
 * Generate all study materials (MCQs, Flashcards, Visuals) in parallel
 * Single endpoint = 1 HTTP call, 1 DB lookup, parallel AI generation
 */
export const generateAll = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const userId = req.user.id;
    const { uploadId } = req.params;
    const {
      mcqCount = 10,
      flashcardCount = 10,
      visualCount = 1,
      difficulty = 'medium',
      subject = 'General',
    } = req.body;

    logger.info({ userId, uploadId }, '[GenerateAll] Starting parallel generation...');

    const startTime = Date.now();

    // Single DB lookup (instead of 3 separate ones)
    const supabase = getSupabaseServer();
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (uploadError || !upload) {
      res.status(404).json({ status: 'error', message: 'Upload not found' });
      return;
    }

    if (!upload.extracted_text) {
      res.status(400).json({ status: 'error', message: 'No text found in this upload' });
      return;
    }

    const text = upload.extracted_text;

    // Run generations in parallel; visuals are optional when diagram credit is not available
    const diagramCredit = await checkDiagramCredit(supabase, userId);
    const shouldGenerateVisuals = diagramCredit.allowed;

    if (!shouldGenerateVisuals) {
      logger.info({ userId, uploadId, reason: diagramCredit.reason, used: diagramCredit.used, limit: diagramCredit.limit }, '[GenerateAll] Skipping visual generation due to diagram credits');
    }

    const timedMCQ = async () => {
      const t = Date.now();
      const r = await generateMCQsInternal(supabase, userId, uploadId, text, mcqCount, difficulty, upload.file_name);
      logger.info(`[GenerateAll] MCQs done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
      return r;
    };
    const timedFlashcards = async () => {
      const t = Date.now();
      const r = await generateFlashcardsInternal(supabase, userId, uploadId, text, flashcardCount, difficulty, upload.file_name);
      logger.info(`[GenerateAll] Flashcards done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
      return r;
    };
    const timedVisuals = async () => {
      const t = Date.now();
      const r = await generateVisualInternal(supabase, userId, uploadId, text, subject, visualCount, difficulty);
      logger.info(`[GenerateAll] Visuals done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
      return r;
    };

    const [mcqResult, flashcardResult, visualResult] = await Promise.allSettled([
      timedMCQ(),
      timedFlashcards(),
      shouldGenerateVisuals ? timedVisuals() : Promise.resolve(null),
    ]);

    const mcqs = mcqResult.status === 'fulfilled' ? mcqResult.value : null;
    const flashcards = flashcardResult.status === 'fulfilled' ? flashcardResult.value : null;
    const visuals = shouldGenerateVisuals && visualResult.status === 'fulfilled' ? visualResult.value : null;

    if (mcqResult.status === 'rejected') logger.error({ err: mcqResult.reason }, '[GenerateAll] MCQ generation failed');
    if (flashcardResult.status === 'rejected') logger.error({ err: flashcardResult.reason }, '[GenerateAll] Flashcard generation failed');
    if (shouldGenerateVisuals && visualResult.status === 'rejected') logger.error({ err: visualResult.reason }, '[GenerateAll] Visual generation failed');

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info({
      mcqs: mcqs?.count || 0,
      flashcards: flashcards?.count || 0,
      visuals: visuals?.visuals?.length || 0,
      visualsSkipped: !shouldGenerateVisuals,
      totalSeconds: totalTime,
    }, `[GenerateAll] Parallel generation complete in ${totalTime}s`);

    // Consume diagram credit only if a visual was generated successfully
    if (shouldGenerateVisuals && visuals && (visuals.count || 0) > 0) {
      await consumeCredit(userId, 'diagrams');
    }

    res.status(200).json({
      status: 'success',
      data: {
        mcqs: mcqs ? { status: 'success', data: mcqs } : { status: 'error', data: null },
        flashcards: flashcards ? { status: 'success', data: flashcards } : { status: 'error', data: null },
        visuals: shouldGenerateVisuals
          ? (visuals ? { status: 'success', data: visuals } : { status: 'error', data: null })
          : {
              status: 'skipped',
              data: null,
              reason: diagramCredit.reason || 'Diagram credits unavailable',
              used: diagramCredit.used ?? 0,
              limit: diagramCredit.limit ?? 0,
            },
      },
    });
  } catch (err) {
    logger.error({ err }, '[GenerateAll] Fatal error');
    res.status(500).json({ status: 'error', message: 'Failed to generate study materials' });
  }
};

// ─── Internal MCQ Generation ─────────────────────────────────────────────────

async function generateMCQsInternal(
  supabase: any, userId: string, uploadId: string, text: string,
  count: number, difficulty: string, fileName: string
) {
  const result = await generateStudyMaterial(text, 'quiz', {
    count,
    difficulty: difficulty as 'easy' | 'medium' | 'hard',
  });

  // Parse response
  let cleanContent = result.content.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
  }

  const parsed = JSON.parse(cleanContent);
  let generatedTitle: string | null = null;
  let mcqData: any[];

  if (parsed.title && parsed.mcqs) {
    generatedTitle = parsed.title;
    mcqData = parsed.mcqs;
  } else if (Array.isArray(parsed)) {
    mcqData = parsed;
  } else {
    throw new Error('Unexpected MCQ format');
  }

  // Create set
  const { data: mcqSet, error: setError } = await supabase
    .from('mcq_sets')
    .insert({
      user_id: userId, upload_id: uploadId,
      title: generatedTitle || fileName || 'Quiz',
      difficulty, total_questions: mcqData.length,
      questions_attempted: 0, correct_answers: 0, wrong_answers: 0, completed: false,
    })
    .select().single();

  if (setError || !mcqSet) throw new Error('Failed to create MCQ set');

  // Insert MCQs + options
  const insertedMCQs = [];
  for (const mcq of mcqData) {
    const { data: insertedMCQ, error: mcqError } = await supabase
      .from('mcqs')
      .insert({
        user_id: userId, upload_id: uploadId, set_id: mcqSet.id,
        question: mcq.question, question_type: mcq.question_type || 'mcq',
        correct_answer: mcq.correct_answer,
        correct_answer_text: mcq.correct_answer_text || null,
        explanation: mcq.explanation || null, difficulty,
      })
      .select().single();

    if (mcqError || !insertedMCQ) continue;

    if ((mcq.question_type === 'mcq' || mcq.question_type === 'true_false') && mcq.options?.length > 0) {
      await supabase.from('mcq_options').insert(
        mcq.options.map((optionText: string, index: number) => ({
          mcq_id: insertedMCQ.id, option_index: index, option_text: optionText,
        }))
      );
    }

    insertedMCQs.push({
      id: insertedMCQ.id, question_type: mcq.question_type || 'mcq',
      question: mcq.question, options: mcq.options || [],
      correct_answer: mcq.correct_answer,
      correct_answer_text: mcq.correct_answer_text || null,
      explanation: mcq.explanation || null, difficulty,
    });
  }

  return { set_id: mcqSet.id, mcqs: insertedMCQs, count: insertedMCQs.length, upload_id: uploadId };
}

// ─── Internal Flashcard Generation ───────────────────────────────────────────

async function generateFlashcardsInternal(
  supabase: any, userId: string, uploadId: string, text: string,
  count: number, difficulty: string, fileName: string
) {
  const result = await generateStudyMaterial(text, 'flashcards', {
    count,
    difficulty: difficulty as 'easy' | 'medium' | 'hard',
  });

  let cleanContent = result.content.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanContent);
  } catch {
    // Repair truncated JSON
    let repaired = cleanContent;
    const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) repaired += '"';
    repaired = repaired.replace(/,\s*$/, '');
    let ob = (repaired.match(/{/g) || []).length;
    let cb = (repaired.match(/}/g) || []).length;
    let oB = (repaired.match(/\[/g) || []).length;
    let cB = (repaired.match(/\]/g) || []).length;
    while (cB < oB) { repaired += ']'; cB++; }
    while (cb < ob) { repaired += '}'; cb++; }
    try {
      parsed = JSON.parse(repaired);
    } catch {
      // Regex fallback
      const regex = /\{\s*"question"\s*:\s*"([^"]*?)"\s*,\s*"answer"\s*:\s*"([^"]*?)"/g;
      const extracted: any[] = [];
      let match;
      while ((match = regex.exec(cleanContent)) !== null) {
        extracted.push({ question: match[1], answer: match[2] });
      }
      if (extracted.length > 0) {
        const titleMatch = cleanContent.match(/"title"\s*:\s*"([^"]*?)"/);
        parsed = { title: titleMatch?.[1] || null, flashcards: extracted };
      } else {
        throw new Error('Failed to parse flashcard response');
      }
    }
  }

  let generatedTitle: string | null = null;
  let flashcardData: any[];

  if (parsed.title && parsed.flashcards) {
    generatedTitle = parsed.title;
    flashcardData = parsed.flashcards;
  } else if (Array.isArray(parsed)) {
    flashcardData = parsed;
  } else {
    throw new Error('Unexpected flashcard format');
  }

  // Create set
  const { data: flashcardSet, error: setError } = await supabase
    .from('flashcard_sets')
    .insert({
      user_id: userId, upload_id: uploadId,
      title: generatedTitle || fileName || 'Flashcards',
      difficulty, total_cards: flashcardData.length,
      cards_reviewed: 0, cards_known: 0, cards_learning: 0,
      cards_to_review: flashcardData.length, progress: 0,
    })
    .select().single();

  if (setError || !flashcardSet) throw new Error('Failed to create flashcard set');

  // Bulk insert flashcards
  const cardsToInsert = flashcardData.map((card: any) => ({
    user_id: userId, upload_id: uploadId, set_id: flashcardSet.id,
    front: card.question, back: card.answer,
    difficulty, mastery_level: 0, times_reviewed: 0, times_correct: 0,
  }));

  const { data: insertedCards, error: cardsError } = await supabase
    .from('flashcards')
    .insert(cardsToInsert)
    .select();

  if (cardsError) {
    logger.error({ err: cardsError }, '[GenerateAll] Flashcard insert error');
    throw new Error('Failed to insert flashcards');
  }

  return {
    set_id: flashcardSet.id,
    flashcards: (insertedCards || []).map((c: any) => ({
      id: c.id, front: c.front, back: c.back,
      difficulty: c.difficulty, mastery_level: c.mastery_level, created_at: c.created_at,
    })),
    count: insertedCards?.length || 0,
    upload_id: uploadId,
  };
}

// ─── Internal Visual Generation ──────────────────────────────────────────────

async function generateVisualInternal(
  supabase: any, userId: string, uploadId: string, text: string,
  subject: string, count: number, difficulty: string
) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: `You are an expert educational content creator specializing in creating interactive labeled diagram activities.

Given the following educational text, create ${count} interactive labeled visual diagram activit${count > 1 ? 'ies' : 'y'}.

CRITICAL REQUIREMENTS FOR SCIENTIFIC/ANATOMICAL ACCURACY:
- ALL labels MUST be anatomically/scientifically correct and placed in the right position
- Label names must use proper scientific terminology
- The spatial relationships between parts must be accurate
- For biological diagrams: follow standard anatomical position and orientation
- For chemistry: use correct molecular structures and bonding
- For physics: use accurate force diagrams and measurements
- Double-check that each label corresponds to the CORRECT part

For each activity, provide:
1. A descriptive title
2. Subject area: "${subject}"
3. Difficulty level: "${difficulty}"
4. Instruction text for the student
5. An image prompt (for AI image generation) - be EXTREMELY specific about label positions
6. A list of ALL labels with:
   - label_number (1, 2, 3...)
   - part_name (the correct scientific/anatomical name)
   - is_hidden (boolean) - set to true for 2-3 labels that will be quiz questions

IMPORTANT LABEL RULES:
- Total labels: 5-8 per diagram
- Hidden labels (is_hidden: true): exactly 2-3 labels that become quiz questions
- Visible labels (is_hidden: false): remaining labels shown as reference
- Each hidden label needs 4 multiple-choice options

IMAGE PROMPT REQUIREMENTS:
- MUST describe a clean, educational diagram style
- MUST specify EXACT positions for each numbered label
- For VISIBLE labels (is_hidden: false): Include "Label N: [text]" in the prompt so text appears on the image
- For HIDDEN labels (is_hidden: true): Include "Label N: [numbered circle only]" so only the number shows
- Use professional scientific illustration style with white/light background
- Specify clean lines, clear colors, and good contrast

Return a JSON array:
[
  {
    "title": "...",
    "subject": "${subject}",
    "difficulty": "${difficulty}",
    "instruction_text": "Identify the hidden labels in the diagram",
    "image_prompt": "...",
    "all_labels": [
      {
        "label_number": 1,
        "part_name": "...",
        "is_hidden": false
      }
    ],
    "questions": [
      {
        "label_number": 2,
        "options": ["correct", "wrong1", "wrong2", "wrong3"]
      }
    ]
  }
]

Text: ${text.substring(0, 3000)}`,
    }],
  });

  const responseText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('\n');

  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array found in visual response');

  const activities = JSON.parse(jsonMatch[0]);

  // Generate images and save to DB
  const savedVisuals = [];
  for (const activity of activities) {
    // Generate image
    let imageUrl = 'https://placehold.co/600x400/e8e8e8/666?text=Diagram';
    try {
      imageUrl = (await generateImage(activity.image_prompt)).imageUrl;
    } catch (imgErr) {
      logger.warn({ err: imgErr }, '[GenerateAll] Image generation failed, using placeholder');
    }

    // Ensure hidden labels have questions
    const hiddenLabels = activity.all_labels.filter((l: any) => l.is_hidden);
    if (hiddenLabels.length === 0) {
      // Force-hide 2-3 labels
      const shuffled = [...activity.all_labels].sort(() => Math.random() - 0.5);
      const toHide = shuffled.slice(0, Math.min(3, shuffled.length));
      toHide.forEach((l: any) => {
        const original = activity.all_labels.find((al: any) => al.label_number === l.label_number);
        if (original) original.is_hidden = true;
      });
    }

    const correctAnswers = activity.all_labels
      .filter((l: any) => l.is_hidden)
      .map((l: any) => ({ label_number: l.label_number, correct_answer: l.part_name }));

    const { data: saved, error: saveError } = await supabase
      .from('visuals')
      .insert({
        user_id: userId, upload_id: uploadId,
        title: activity.title, subject: activity.subject || subject,
        visual_type: 'labeled_diagram', difficulty: activity.difficulty || difficulty,
        instruction_text: activity.instruction_text,
        image_url: imageUrl, image_prompt: activity.image_prompt,
        all_labels: activity.all_labels, questions: activity.questions || [],
        correct_answers: correctAnswers,
      })
      .select().single();

    if (!saveError && saved) savedVisuals.push(saved);
  }

  return { visuals: savedVisuals, count: savedVisuals.length };
}
