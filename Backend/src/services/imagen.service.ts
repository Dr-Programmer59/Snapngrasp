import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

// Google Gemini API (Nano Banana Pro = Gemini 3 Pro Image)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
// ✅ Use Gemini 3 Pro Image Preview model
const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

/**
 * Generate an image using Google's Gemini 3 Pro Image (Nano Banana Pro)
 * @param prompt - Text description of the image to generate
 * @returns URL of the generated image
 */
export const generateImage = async (
  prompt: string
): Promise<{ imageUrl: string; base64Image?: string }> => {
  try {
    console.log(
      '🎨 [Gemini] ==================== IMAGE GENERATION START ===================='
    );
    console.log('🎨 [Gemini] Prompt:', prompt);
    console.log('🎨 [Gemini] API Key configured:', !!GEMINI_API_KEY);
    console.log(
      '🎨 [Gemini] API Key (first 10 chars):',
      GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT SET'
    );

    logger.info({ prompt }, '[Gemini] Generating image with Gemini 3 Pro Image...');

    if (!GEMINI_API_KEY) {
      console.log('⚠️ [Gemini] API key not configured, using mock mode');
      logger.warn('[Gemini] API key not configured, using mock mode');
      return generateMockImage(prompt);
    }

    // Enhance prompt with strict labeling rules for labeled visuals
    const enhancedPrompt = `${prompt}

🚨🚨🚨 CRITICAL GEMINI-SPECIFIC REQUIREMENTS - FOLLOW EXACTLY:

LABELING RULES (CHECK THE all_labels ARRAY IN THE PROMPT ABOVE):
1. ALL 5 labels get a numbered circle (1, 2, 3, 4, 5) at their anatomical position
2. FOR EACH LABEL:
   - If is_hidden: false → Draw numbered circle + text label with the part name next to it
   - If is_hidden: true → Draw ONLY the numbered circle, NO text label at all

EXAMPLE:
- Label 1: "Left Ventricle", is_hidden: false → Draw circle "1" + text "Left Ventricle"
- Label 2: "Right Atrium", is_hidden: true → Draw circle "2" ONLY (no text)
- Label 3: "Aorta", is_hidden: false → Draw circle "3" + text "Aorta"
- Label 4: "Pulmonary Artery", is_hidden: true → Draw circle "4" ONLY (no text)
- Label 5: "Left Atrium", is_hidden: true → Draw circle "5" ONLY (no text)

❌ ABSOLUTELY FORBIDDEN:
- NO text labels for parts where is_hidden: true
- NO titles, headings, or overall captions on the image
- NO legend or key
- NO watermarks or branding
- NO extra text beyond the specific part labels marked as is_hidden: false

✅ WHAT MUST BE INCLUDED:
- The main anatomical/structural diagram (scientifically accurate)
- EXACTLY 5 numbered circles (1, 2, 3, 4, 5) with thin connecting lines
- Text labels ONLY for labels where is_hidden: false
- Pure white background (#FFFFFF)
- Clean, educational design

🎯 RENDERING SPECIFICATIONS:

NUMBERED CIRCLES (ALL 5 LABELS):
- Circle diameter: 40px
- Circle fill: White (#FFFFFF)
- Circle border: 3px solid (#6C5CE7 purple or #E74C3C red)
- Number font: Bold, 24px, black (#000000)
- Number content: 1, 2, 3, 4, 5
- Connecting lines: 2px width, pointing to anatomical locations

TEXT LABELS (ONLY WHERE is_hidden: false):
- Font: 18px bold, black (#000000)
- Background: Small white rounded rectangle with subtle border
- Position: Next to the numbered circle
- Content: Exact part name from the label
- DO NOT show text for labels where is_hidden: true

🚨 VALIDATION CHECKLIST:
✓ All 5 numbered circles (1-5) are visible at correct anatomical positions
✓ Text labels shown ONLY for labels with is_hidden: false
✓ NO text labels for labels with is_hidden: true (only circles)
✓ Pure white background with proper margins
✓ Professional, educational diagram
✓ Suitable for mobile display

REMEMBER: Check the is_hidden value for EACH of the 5 labels in the all_labels array above!`;

    console.log('🎨 [Gemini] Enhanced prompt with selective text label display');
    console.log('🎨 [Gemini] API URL:', GEMINI_API_URL);

    const requestBody = {
      contents: [
        {
          // role is optional, but this matches the standard structure
          role: 'user',
          parts: [
            {
              text: enhancedPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4, // Lower temperature for more consistent, accurate results
        candidateCount: 1,
      },
    };

    console.log('🎨 [Gemini] Sending request to Gemini API...');

    const response = await axios.post(GEMINI_API_URL, requestBody, {
      headers: {
        // ❌ DO NOT use Authorization: Bearer <key> for Gemini
        // ✅ Correct way for Gemini Developer API:
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds
    });

    console.log('🎨 [Gemini] Response status:', response.status);
    // console.log('🎨 [Gemini] Response data:', JSON.stringify(response.data, null, 2));

    if (
      !response.data ||
      !response.data.candidates ||
      response.data.candidates.length === 0
    ) {
      console.log('❌ [Gemini] No candidates returned in response');
      logger.error('[Gemini] No candidates returned');
      throw new Error('Failed to generate image');
    }

    console.log('🎨 [Gemini] Candidates count:', response.data.candidates.length);
    const candidate = response.data.candidates[0];
    // console.log('🎨 [Gemini] First candidate:', JSON.stringify(candidate, null, 2));

    // Extract image data from response
    // Gemini returns images as inline_data / inlineData in parts
    let base64Image: string | null = null;

    if (candidate.content && candidate.content.parts) {
      console.log('🎨 [Gemini] Parts count:', candidate.content.parts.length);

      for (const part of candidate.content.parts) {
        console.log('🎨 [Gemini] Checking part keys:', Object.keys(part));

        // Newer responses may use camelCase inlineData + mimeType
        if (
          part.inlineData &&
          part.inlineData.mimeType &&
          part.inlineData.mimeType.startsWith('image/')
        ) {
          base64Image = part.inlineData.data;
          console.log('✅ [Gemini] Found image data in inlineData!');
          console.log('✅ [Gemini] MIME type:', part.inlineData.mimeType);
          // console.log('✅ [Gemini] Base64 image length:', base64Image?.length || 0);
          break;
        }

        // Older / documented JSON uses snake_case inline_data + mime_type
        if (
          part.inline_data &&
          part.inline_data.mime_type &&
          part.inline_data.mime_type.startsWith('image/')
        ) {
          base64Image = part.inline_data.data;
          console.log('✅ [Gemini] Found image data in inline_data!');
          console.log('✅ [Gemini] MIME type:', part.inline_data.mime_type);
          // console.log('✅ [Gemini] Base64 image length:', base64Image?.length || 0);
          break;
        }
      }
    } else {
      console.log('❌ [Gemini] No content.parts found in candidate');
    }

    if (!base64Image) {
      console.log('❌ [Gemini] No image data found in response');
      // console.log('❌ [Gemini] Full response:', JSON.stringify(response.data, null, 2));
      logger.error('[Gemini] No image data found in response');
      throw new Error('No image generated');
    }

    console.log('🎨 [Gemini] Uploading image to local storage...');
    // Save image to local storage
    const imageUrl = await uploadImageToStorage(base64Image);

    console.log('✅ [Gemini] Image saved successfully!');
    console.log('✅ [Gemini] Image URL:', imageUrl);
    logger.info({ imageUrl }, '[Gemini] Image generated successfully');

    console.log('🎨 [Gemini] ==================== IMAGE GENERATION END ====================');

    return {
      imageUrl,
      base64Image,
    };
  } catch (error: any) {
    console.log('❌ [Gemini] ==================== ERROR ====================');
    console.log('❌ [Gemini] Error type:', error.constructor.name);
    console.log('❌ [Gemini] Error message:', error.message);
    console.log('❌ [Gemini] Error stack:', error.stack);

    if (error.response) {
      console.log('❌ [Gemini] Response status:', error.response.status);
      console.log('❌ [Gemini] Response data:', JSON.stringify(error.response.data, null, 2));
      console.log('❌ [Gemini] Response headers:', error.response.headers);
    }

    logger.error({ err: error }, '[Gemini] Image generation failed');

    // Fallback to mock if generation fails
    console.log('⚠️ [Gemini] Falling back to mock image');
    logger.warn('[Gemini] Falling back to mock image');
    return generateMockImage(prompt);
  }
};

/**
 * Upload base64 image to local storage and return URL
 */
async function uploadImageToStorage(base64Image: string): Promise<string> {
  console.log('💾 [Gemini] Uploading image to storage...');
  // console.log('💾 [Gemini] Base64 length:', base64Image.length);

  // Generate filename
  const filename = `visual_${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)}.png`;
  const uploadsDir = path.join(__dirname, '../../public/visuals');

  console.log('💾 [Gemini] Filename:', filename);
  console.log('💾 [Gemini] Upload directory:', uploadsDir);

  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    console.log('💾 [Gemini] Creating directory:', uploadsDir);
    fs.mkdirSync(uploadsDir, { recursive: true });
  } else {
    console.log('💾 [Gemini] Directory already exists');
  }

  // Save image
  const buffer = Buffer.from(base64Image, 'base64');
  const filePath = path.join(uploadsDir, filename);

  console.log('💾 [Gemini] Buffer size:', buffer.length, 'bytes');
  console.log('💾 [Gemini] Full file path:', filePath);
  console.log('💾 [Gemini] Writing file...');

  fs.writeFileSync(filePath, buffer);

  console.log('✅ [Gemini] File written successfully!');

  // Return public URL
  const publicUrl = `/visuals/${filename}`;
  console.log('✅ [Gemini] Public URL:', publicUrl);

  return publicUrl;
}

/**
 * Generate multiple variations of an image
 */
export const generateImageVariations = async (
  prompt: string,
  count: number = 3
): Promise<Array<{ imageUrl: string; base64Image?: string }>> => {
  const variations: Array<{ imageUrl: string; base64Image?: string }> = [];

  for (let i = 0; i < count; i++) {
    const result = await generateImage(prompt);
    variations.push(result);
  }

  return variations;
};

/**
 * Mock image generation for development/testing
 */
export const generateMockImage = async (
  prompt: string
): Promise<{ imageUrl: string }> => {
  console.log('🎭 [Gemini] ==================== MOCK IMAGE MODE ====================');
  console.log('🎭 [Gemini] Prompt:', prompt);

  logger.info({ prompt }, '[Gemini] Using mock image generation');

  // Return a placeholder image URL
  const mockUrl = `https://via.placeholder.com/800x800/E8F4F8/334155?text=${encodeURIComponent(
    prompt.substring(0, 50)
  )}`;

  console.log('🎭 [Gemini] Mock URL:', mockUrl);
  console.log('🎭 [Gemini] ==================== MOCK IMAGE END ====================');

  return {
    imageUrl: mockUrl,
  };
};
