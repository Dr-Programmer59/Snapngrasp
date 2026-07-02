// src/services/claude.service.ts

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

let anthropicClient: Anthropic | null = null;

/**
 * Default Claude model.
 * You can override via env.CLAUDE_MODEL if you want.
 *
 * Example valid values (check Anthropic model list for latest):
 *  - claude-sonnet-4-5-20250929 (snapshot, recommended)
 */
const CLAUDE_MODEL =
  (env as any).CLAUDE_MODEL ||
  'claude-sonnet-4-5-20250929';

/**
 * OCR prompt optimized for study notes / documents with title extraction
 */
const OCR_PROMPT = `
You are an OCR engine for STUDY NOTES and EDUCATIONAL DOCUMENTS.

Task:
1. Extract ALL readable text from this image as clean, well-structured plain text
2. Generate a concise, descriptive title for the content (3-7 words)
3. Identify the subject/topic (e.g., Biology, Mathematics, Physics, History, etc.)

Rules:
1. Capture ALL visible text (printed + handwritten), including:
   - Page titles, headings, subheadings
   - Bullet points and numbered lists
   - Labels on diagrams (arrows, callouts, captions)
   - Footnotes or side notes, if readable

2. Preserve structure as much as possible:
   - Keep line breaks between logical lines
   - Keep paragraphs separated by a blank line
   - Keep bullet lists as "-", "*", or "1.", "2.", etc.
   - For tables, represent them as text tables with rows on separate lines.

3. Light cleanup is allowed:
   - Fix obvious OCR glitches (broken words like "stud y" → "study")
   - Merge hyphenated line-breaks when it’s clearly the same word
   - Remove duplicated characters caused by scanning artifacts

4. Math and formulas:
   - If a formula is clearly visible, keep it readable, e.g.:
     - "E = mc^2", "x^2 + y^2 = r^2", "∫_a^b f(x) dx"
   - Use LaTeX-like notation when natural, but correctness is more important than formatting.

5. DO NOT summarize, shorten, rephrase, or explain.
   - The goal is a faithful transcription, not interpretation.

6. Output format (MUST be valid JSON):
{
  "title": "Brief descriptive title (3-7 words)",
  "subject": "Subject/Topic name",
  "text": "Full extracted text here..."
}

If there is no readable text in the image, respond with:
{
  "title": "Untitled Document",
  "subject": "Unknown",
  "text": ""
}
`;

/**
 * Get Anthropic Claude client
 */
export const getClaudeClient = (): Anthropic => {
  if (!anthropicClient) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    anthropicClient = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });

    logger.info('[Claude] Client initialized');
  }

  return anthropicClient;
};

/**
 * Extract text from image using Claude Vision
 * @param imageData - Base64 encoded image data
 * @param mediaType - Image media type (image/jpeg, image/png, image/webp, image/gif)
 * @returns Extracted text and metadata
 */
export const extractTextFromImage = async (
  imageData: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
): Promise<{
  text: string;
  title: string;
  subject: string;
  confidence: number;
  language?: string;
  metadata?: any;
}> => {
  try {
    const client = getClaudeClient();

    logger.info({ mediaType }, '[Claude] Extracting text from image...');

    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageData,
              },
            },
            {
              type: 'text',
              text: OCR_PROMPT,
            },
          ],
        },
      ],
    });

    const rawResponse = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n')
      .trim();

    // Strip markdown code blocks if present
    let cleanResponse = rawResponse;
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    logger.info({ rawResponsePreview: rawResponse.substring(0, 200) }, '[Claude] Raw response received');

    // Parse JSON response
    let result;
    try {
      result = JSON.parse(cleanResponse);
      logger.info({ 
        hasTitle: !!result.title, 
        hasSubject: !!result.subject, 
        hasText: !!result.text,
        title: result.title,
        subject: result.subject,
        textLength: result.text?.length || 0
      }, '[Claude] JSON parsed successfully');
    } catch (parseError) {
      logger.error({ err: parseError, response: rawResponse }, '[Claude] Failed to parse JSON response');
      // Fallback to old format
      return {
        text: rawResponse,
        title: 'Untitled Document',
        subject: 'Unknown',
        confidence: 0.7,
        metadata: {
          model: message.model,
          usage: message.usage,
          stop_reason: message.stop_reason,
        },
      };
    }

    if (!result.text || result.text.trim() === '') {
      logger.warn({
        model: message.model,
        stop_reason: message.stop_reason,
      }, '[Claude] No text found in image');

      return {
        text: '',
        title: result.title || 'Untitled Document',
        subject: result.subject || 'Unknown',
        confidence: 0,
        metadata: {
          model: message.model,
          usage: message.usage,
          stop_reason: message.stop_reason,
        },
      };
    }

    logger.info({
      length: result.text.length,
      title: result.title,
      subject: result.subject,
    }, '[Claude] Text extraction successful');

    return {
      text: result.text,
      title: result.title || 'Untitled Document',
      subject: result.subject || 'Unknown',
      confidence: 0.9,
      metadata: {
        model: message.model,
        usage: message.usage,
        stop_reason: message.stop_reason,
      },
    };
  } catch (error: any) {
    // Anthropic SDK throws APIError subclasses for HTTP errors
    // (404, 429, 5xx, etc.) 
    logger.error({ err: error }, '[Claude] Text extraction failed');
    throw new Error('Failed to extract text from image');
  }
};

/**
 * Extract text from MULTIPLE images in ONE Claude API call
 * @param images - Array of image data with base64 and mediaType
 * @returns Array of extracted text and metadata for each image
 */
export const extractTextFromMultipleImages = async (
  images: Array<{
    imageData: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    filename: string;
  }>
): Promise<Array<{
  text: string;
  title: string;
  subject: string;
  confidence: number;
  filename: string;
  metadata?: any;
}>> => {
  try {
    const client = getClaudeClient();

    logger.info({ imageCount: images.length }, '[Claude] Extracting text from multiple images in ONE call...');

    // Build content array with all images and one prompt
    const content: any[] = [];
    
    // Add all images first
    images.forEach((img, _index) => {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mediaType,
          data: img.imageData,
        },
      });
    });

    // Add single prompt for all images
    content.push({
      type: 'text',
      text: `You are an OCR engine for STUDY NOTES and EDUCATIONAL DOCUMENTS.

I have provided ${images.length} images above. Extract text from ALL of them.

Task for EACH image:
1. Extract ALL readable text as clean, well-structured plain text
2. Generate a concise title (3-7 words)
3. Identify the subject/topic

Rules:
- Capture ALL visible text (printed + handwritten)
- Preserve structure (headings, bullets, lists)
- Keep formulas readable (e.g., E = mc^2)
- DO NOT summarize or rephrase

Return valid JSON array with one object per image:
[
  {
    "document_number": 1,
    "filename": "${images[0].filename}",
    "title": "Title for image 1",
    "subject": "Subject name",
    "text": "Full extracted text from image 1..."
  },
  {
    "document_number": 2,
    "filename": "${images[1].filename}",
    "title": "Title for image 2",
    "subject": "Subject name",
    "text": "Full extracted text from image 2..."
  }
  // ... for all ${images.length} images
]

If an image has no readable text, use empty string for text field.`,
    });

    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000, // Larger for multiple documents
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
    });

    const rawResponse = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n')
      .trim();

    // Strip markdown code blocks if present
    let cleanResponse = rawResponse;
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    logger.info({ rawResponsePreview: rawResponse.substring(0, 300) }, '[Claude] Batch response received');

    // Parse JSON array response
    let results: any[];
    try {
      results = JSON.parse(cleanResponse);
      if (!Array.isArray(results)) {
        throw new Error('Response is not an array');
      }
      logger.info({ 
        resultCount: results.length,
        expectedCount: images.length
      }, '[Claude] Batch JSON parsed successfully');
    } catch (parseError) {
      logger.error({ err: parseError, response: rawResponse.substring(0, 500) }, '[Claude] Failed to parse batch JSON response');
      // Fallback: treat each image separately (shouldn't happen but safety)
      return images.map((img) => ({
        text: '',
        title: 'Untitled Document',
        subject: 'Unknown',
        confidence: 0.5,
        filename: img.filename,
      }));
    }

    // Map results back to original order
    const mappedResults = images.map((img, index) => {
      const result = results.find(r => r.document_number === index + 1) || results[index];
      
      if (!result) {
        logger.warn({ index, filename: img.filename }, '[Claude] No result for image');
        return {
          text: '',
          title: 'Untitled Document',
          subject: 'Unknown',
          confidence: 0,
          filename: img.filename,
        };
      }

      return {
        text: result.text || '',
        title: result.title || 'Untitled Document',
        subject: result.subject || 'Unknown',
        confidence: result.text && result.text.trim() ? 0.9 : 0,
        filename: img.filename,
        metadata: {
          model: message.model,
          document_number: result.document_number,
        },
      };
    });

    logger.info({ 
      successfulExtractions: mappedResults.filter(r => r.text).length,
      totalImages: images.length 
    }, '[Claude] Batch text extraction complete');

    return mappedResults;

  } catch (error: any) {
    logger.error({ err: error }, '[Claude] Batch text extraction failed');
    throw new Error('Failed to extract text from multiple images');
  }
};

/**
 * Generate study materials from extracted text
 * @param text - Extracted text to process
 * @param type - Type of material to generate (flashcards, quiz, summary, notes)
 * @param options - Additional options
 */
export const generateStudyMaterial = async (
  text: string,
  type: 'flashcards' | 'quiz' | 'summary' | 'notes',
  options?: {
    learningStyle?: 'visual' | 'auditory' | 'interactive';
    difficulty?: 'easy' | 'medium' | 'hard';
    count?: number;
  }
): Promise<any> => {
  try {
    const client = getClaudeClient();

    logger.info({
      type,
      options,
    }, `[Claude] Generating ${type} from text...`);

    const count = options?.count;

    // Extra instructions based on user preferences
    const styleParts: string[] = [];

    if (options?.learningStyle) {
      styleParts.push(
        `Learning style preference: "${options.learningStyle}". 
- visual: include diagrams/mental images or structure the content spatially.
- auditory: emphasize explanations in simple, spoken-style language.
- interactive: include questions, prompts, or mini-activities.`
      );
    }

    if (options?.difficulty) {
      styleParts.push(
        `Target difficulty: "${options.difficulty}".
- easy: focus on basics and simple language.
- medium: include moderate detail and a bit of challenge.
- hard: go deeper with more complex questions and concepts.`
      );
    }

    const styleInstructions =
      styleParts.length > 0
        ? `\n\nUser preferences:\n${styleParts.join('\n\n')}\n`
        : '';

    const prompts: Record<'flashcards' | 'quiz' | 'summary' | 'notes', string> =
      {
        flashcards: `Create ${
          count || 10
        } high-quality flashcards from this text.

Requirements:
- Focus on the most important concepts that would help a student revise.
- Each flashcard MUST be an object with:
  - "question": string (the front of the flashcard - clear, specific question)
  - "answer": string (the back - direct, concise answer in 1-2 sentences)
  - "explanation": string (brief 2-3 sentence hint that helps understand WHY, without just restating the answer. Use a teaching tone.)

- Use clear, concise phrasing.
- Mix definition, concept-application, and "why/how" questions.
- Keep explanations SHORT but helpful (2-3 sentences max).

IMPORTANT: Also generate a descriptive title (3-6 words max).

Return ONLY valid JSON:
{
  "title": "Topic - Subtopic",
  "flashcards": [
    {"question": "...", "answer": "...", "explanation": "..."},
    ...
  ]
}

No extra text outside the JSON.`,
        quiz: `Create a ${
          count || 5
        }-question quiz from this text.

YOU MUST CREATE EXACTLY 3 TYPES OF QUESTIONS:

For ${count || 5} questions, create:
${count === 7 ? '- 3 Multiple Choice (MCQ) with 4 options each\n- 2 Fill-in-the-Blank with ______ placeholder\n- 2 True/False statements' : 
  count && count >= 10 ? '- 5 Multiple Choice (MCQ)\n- 3 Fill-in-the-Blank\n- 2 True/False' : 
  count && count >= 5 ? '- 2 Multiple Choice (MCQ)\n- 2 Fill-in-the-Blank\n- 1 True/False' : 
  '- 2 Multiple Choice (MCQ)\n- 1 Fill-in-the-Blank\n- 1 True/False'}

QUESTION TYPE 1 - Multiple Choice (MCQ):
{
  "question_type": "mcq",
  "question": "What process converts light into chemical energy?",
  "options": ["Respiration", "Photosynthesis", "Digestion", "Fermentation"],
  "correct_answer": 1,
  "explanation": "Photosynthesis converts light energy into chemical energy."
}

QUESTION TYPE 2 - Fill in the Blank (MANDATORY):
{
  "question_type": "fill_blank",
  "question": "The powerhouse of the cell is the ______.",
  "correct_answer_text": "mitochondria",
  "options": [],
  "correct_answer": -1,
  "explanation": "Mitochondria generate ATP through cellular respiration."
}

QUESTION TYPE 3 - True/False (MANDATORY):
{
  "question_type": "true_false",
  "question": "DNA contains the genetic instructions for life.",
  "options": ["False", "True"],
  "correct_answer": 1,
  "explanation": "DNA stores genetic information in all living organisms."
}

CRITICAL RULES:
1. EVERY quiz MUST have fill_blank questions with ______ in the question text
2. EVERY quiz MUST have true_false questions
3. Fill-blank answers go in "correct_answer_text" field (lowercase, no punctuation)
4. True/False options are always ["False", "True"] in that exact order
5. Generate a descriptive title (3-6 words)

Return ONLY this JSON structure:
{
  "title": "Biology - Cell Structure",
  "mcqs": [
    {...mcq question...},
    {...fill_blank question with ______ ...},
    {...true_false question...}
  ]
}

No extra text outside JSON.`,
        summary: `Provide a concise summary of the key points from this text.

Requirements:
- Use bullet points.
- Group related ideas under short headings if helpful.
- Focus on what a student would need to remember for revision.

Return plain text (no JSON).`,
        notes: `Create comprehensive study notes from this text.

Requirements:
- Organize with clear headings and subheadings.
- Use bullet points for lists and key ideas.
- Highlight definitions, formulas, and important concepts.
- Make the notes suitable for quick revision.

Return plain text (no JSON).`,
      };

    const message = await client.messages.create({
      model: (type === 'flashcards' || type === 'quiz') ? 'claude-sonnet-4-20250514' : CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${prompts[type]}${styleInstructions}

Text:
${text}`,
        },
      ],
    });

    const response = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n')
      .trim();

    logger.info({
      model: message.model,
    }, `[Claude] ${type} generation successful`);

    return {
      content: response,
      metadata: {
        model: message.model,
        usage: message.usage,
        stop_reason: message.stop_reason,
      },
    };
  } catch (error: any) {
    logger.error({ err: error }, `[Claude] ${type} generation failed`);
    throw new Error(`Failed to generate ${type}`);
  }
};

export default {
  getClaudeClient,
  extractTextFromImage,
  generateStudyMaterial,
};
