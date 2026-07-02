import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';
import Anthropic from '@anthropic-ai/sdk';
import { generateImage } from '../services/imagen.service';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

/**
 * Generate interactive labeled visual with hidden labels
 */
export const generateLabeledVisual = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🎨 [Labeled Visual] ==================== START ====================');
    
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const userId = req.user.id;
    const { uploadId } = req.params;
    const { subject, topic, count = 1 } = req.body;

    console.log('🎨 [Labeled Visual] User:', userId);
    console.log('🎨 [Labeled Visual] Upload:', uploadId);
    console.log('🎨 [Labeled Visual] Topic:', topic);
    console.log('🎨 [Labeled Visual] Subject:', subject);

    // Get the upload and extracted text
    const supabase = getSupabaseServer();
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (uploadError || !upload) {
      logger.error({ err: uploadError }, '[Labeled Visual] Upload not found');
      res.status(404).json({ status: 'error', message: 'Upload not found' });
      return;
    }

    if (!upload.extracted_text) {
      res.status(400).json({ status: 'error', message: 'No text found in this upload' });
      return;
    }

    // Call Claude to generate labeled visual structure
    logger.info('[Labeled Visual] Calling Claude to create visual structure...');
    
    const prompt = `You are an EXPERT SCIENTIFIC EDUCATIONAL CONTENT CREATOR specialized in anatomically and scientifically accurate diagrams.

EDUCATIONAL CONTENT (SOURCE MATERIAL - USE ONLY THIS):
${upload.extracted_text.substring(0, 3000)}

${topic ? `SPECIFIC TOPIC: ${topic}` : ''}
${subject ? `SUBJECT: ${subject}` : ''}

🎯 YOUR TASK:
Create ${count} interactive labeled diagram activity/activities where students identify hidden labels.

🔬 ABSOLUTE SCIENTIFIC ACCURACY REQUIREMENTS:

1. CONTENT MUST BE 100% ACCURATE
   - Use ONLY information from the source material provided above
   - Verify all anatomical/structural details against the source text
   - Part names must match scientific terminology from the content
   - Functions and explanations must be factually correct
   - If creating biological diagrams: use correct anatomical positioning, proportions, and relationships
   - If creating chemical/physical diagrams: use correct molecular structures, bonds, and spatial arrangements
   - DO NOT add information not present in the source material
   - DO NOT use placeholder or generic names - be specific and accurate

2. GENERATE IMAGE WITH EXACTLY 5 NUMBERED LABELS (1, 2, 3, 4, 5)
   - Create a clean, SCIENTIFICALLY ACCURATE educational diagram with EXACTLY 5 key anatomical/structural parts
   - Each part MUST have a small numbered circle (1, 2, 3, 4, 5) clearly pointing to it
   - Number placement is CRITICAL - each number must be:
     * Clearly visible and readable
     * Positioned EXACTLY at the anatomical location of the part it identifies
     * Placed with anatomical precision (not random placement)
     * Positioned to avoid ambiguity about which structure is labeled
   - Use white numbered circles (40px diameter) with colored borders (#6C5CE7 purple or #E74C3C red) for visibility
   - Ensure numbers 1-5 follow logical anatomical positioning:
     * For organs: Position based on actual anatomical location in the body
     * For cells: Position based on actual cellular structure organization
     * For systems: Follow natural flow or functional hierarchy
   - Connecting lines from numbers to structures should be thin, precise, and point to exact anatomical locations
   - NO text labels on the image - ONLY numbers 1, 2, 3, 4, 5

2. CRITICAL: NUMBERING MUST MATCH YOUR LABELS ARRAY
   - If you put number "1" pointing to the heart's left ventricle, then label_number 1 MUST be "Left Ventricle"
   - If you put number "2" pointing to the right atrium, then label_number 2 MUST be "Right Atrium"
   - The visual number position and the label_number in JSON MUST BE IDENTICAL
   - DO NOT mix up the order - students will see the numbers on the image and must match them to your labels

3. RANDOMLY HIDE 2-3 LABELS FOR QUIZ
   - YOU decide which 2-3 label numbers to hide (e.g., hide labels 2, 4, and 5)
   - Set "is_hidden": true for hidden labels, "is_hidden": false for visible ones
   - Hidden labels become quiz questions - students must identify what that numbered part is
   - Visible labels (is_hidden: false) serve as hints to help students
   - Choose strategically: mix difficulty levels (easy/medium/hard)

4. CREATE INTELLIGENT MULTIPLE CHOICE OPTIONS
   - For EACH hidden label, provide 4 multiple-choice options
   - Include the correct answer plus 3 PLAUSIBLE but wrong distractors
   - Distractors should be related structures (e.g., for heart anatomy, use other heart parts or nearby organs)
   - Avoid obviously wrong answers (e.g., "banana" for heart anatomy)
   - Options should test genuine understanding, not just memorization
   - Shuffle the correct answer position (not always first)
   - For anatomy: use adjacent structures or structures from same system
   - For cells: use organelles with similar functions or locations
   - For chemistry: use similar molecules or related compounds

RETURN FORMAT (JSON array):
[
  {
    "title": "Specific descriptive title from source material (e.g., 'Human Heart Anatomy', 'Plant Cell Structure', 'Digestive System')",
    "subject": "${subject || 'Science'}",
    "difficulty": "easy" | "medium" | "hard",
    "instruction_text": "Identify the numbered parts of the diagram",
    
    "image_prompt": "🔬 SCIENTIFIC ACCURACY IS MANDATORY - FOLLOW EXACTLY:

CREATE: Vertical 9:16 educational diagram optimized for mobile app display

SUBJECT: [Your specific topic from the source material - be precise]
STYLE: Clean, modern, scientifically accurate flat design with educational colors on PURE WHITE background

📐 ANATOMICAL/STRUCTURAL ACCURACY REQUIREMENTS:
- Research and verify the actual anatomical structure/system/process from the source content
- Draw the [anatomical structure/object/system] centered, occupying 60-70% of vertical space
- Use CORRECT anatomical proportions (e.g., if drawing a heart, ventricles should be larger than atria)
- Use CORRECT spatial relationships (e.g., if drawing digestive system, organs must be in correct order)
- Use CORRECT orientation (e.g., anterior/posterior, superior/inferior views as appropriate)
- Use accurate color coding:
  * Biological: Use medically accurate colors (oxygenated blood = red, deoxygenated = blue, organs = appropriate colors)
  * Chemical: Use standard color conventions (oxygen = red, hydrogen = white, etc.)
  * Physical: Use appropriate visual representations
- Include all major structural features visible in standard educational diagrams
- Use clear, bold outlines with proper depth perception where needed
- Make it scientifically accurate while remaining educational (simplify complex details, but maintain accuracy)

🚨 CRITICAL - NUMBERED LABELS WITH SELECTIVE TEXT DISPLAY:
You MUST add EXACTLY 5 numbered labels positioned with ANATOMICAL PRECISION.

IMPORTANT LABELING RULES:
- ALL 5 labels get a numbered circle (1, 2, 3, 4, 5) at their anatomical location
- VISIBLE labels (is_hidden: false) → Show BOTH number AND text label next to the circle
- HIDDEN labels (is_hidden: true) → Show ONLY the numbered circle, NO text label

Based on the all_labels array below, you will see which labels have is_hidden: false (show text) vs is_hidden: true (hide text).

Label specifications for each number:

- Number 1: [Specify EXACT anatomical part AND position]
  [If is_hidden: false] → Draw numbered circle (1) with text label showing the part name next to it
  [If is_hidden: true] → Draw ONLY numbered circle (1), NO text label
  
- Number 2: [Specify EXACT anatomical part AND position]
  [Check is_hidden value to determine if text label should be shown]
  
- Number 3: [Specify EXACT anatomical part AND position]
  [Check is_hidden value to determine if text label should be shown]
  
- Number 4: [Specify EXACT anatomical part AND position]
  [Check is_hidden value to determine if text label should be shown]
  
- Number 5: [Specify EXACT anatomical part AND position]
  [Check is_hidden value to determine if text label should be shown]

Example positioning:
'Number 1 identifies the Left Ventricle - position at LEFT LOWER portion of heart. is_hidden: false → Show circle with "1" AND text "Left Ventricle" next to it'
'Number 2 identifies the Right Atrium - position at UPPER RIGHT chamber. is_hidden: true → Show ONLY circle with "2", NO text'

⚠️ POSITIONING PRECISION RULES:
- Each number must be placed at the EXACT CENTER or most representative point of the structure
- Avoid placing numbers at boundaries between structures (be specific about which structure)
- Use anatomical landmarks for accurate positioning
- Consider the view perspective (anterior, lateral, cross-section) when positioning
- Ensure numbers don't overlap with other important structures

NUMBERED CIRCLE VISUAL STYLE:
- Small white circles (40px diameter) with bold colored border (3px width, use #6C5CE7 purple or #E74C3C red)
- Clear black numbers (1, 2, 3, 4, 5) inside each circle - font size 24px, bold, centered
- Thin connecting lines (2px width) from circle edge to the EXACT anatomical point being labeled
- Lines should be straight, pointing directly to the structure center
- Position numbered circles around the perimeter of the diagram for clarity
- Arrange numbers logically: clockwise, top-to-bottom, or following anatomical flow
- Ensure good spacing between numbers (minimum 50px between circles)

TEXT LABEL STYLE (ONLY for is_hidden: false labels):
- Place text label next to the numbered circle
- Font: 18px, bold, black (#000000)
- Background: Small white rounded rectangle with subtle border
- Text should be the exact part name from the all_labels array
- Position text to avoid overlapping with other elements

🚨 CRITICAL RULE - TEXT DISPLAY:
- Check EACH label's is_hidden value in the all_labels array below
- If is_hidden: false → Draw numbered circle + text label with part name
- If is_hidden: true → Draw ONLY numbered circle, absolutely NO text label
- NO titles, legends, or captions on the image
- NO extra text beyond the labels specified as visible (is_hidden: false)

LAYOUT & COMPOSITION:
- Vertical orientation (portrait mode 9:16 aspect ratio - 1080x1920px ideal)
- Pure white background (#FFFFFF) with 10% margin on all sides
- Main anatomical structure centered in the frame
- Structure should be large enough to see details but leave room for numbered labels around perimeter
- Use professional medical/educational illustration style
- Clean, uncluttered, scientifically accurate design
- Suitable for high school / college / medical students
- High contrast for mobile display clarity

✅ FINAL VALIDATION CHECKLIST (VERIFY BEFORE GENERATING):
□ Structure is anatomically/scientifically accurate based on source material
□ All 5 numbered circles are clearly visible and properly sized (40px)
□ Numbers 1-5 are positioned at EXACT anatomical locations specified above
□ Text labels shown ONLY for labels with is_hidden: false
□ NO text labels for labels with is_hidden: true (only numbered circles)
□ Connecting lines point precisely to the correct structures
□ Proportions and spatial relationships are anatomically correct
□ Color scheme is educationally appropriate and scientifically accurate
□ White background with proper margins for mobile display
□ Structure is centered and clearly visible
□ Design is professional and suitable for educational use",
    
    "all_labels": [
      {
        "label_number": 1,
        "part_name": "EXACT name that matches where you placed number 1 in the image",
        "explanation": "Clear 1-2 sentence educational explanation of this part's function",
        "is_hidden": false
      },
      {
        "label_number": 2,
        "part_name": "EXACT name that matches where you placed number 2 in the image",
        "explanation": "Clear educational explanation",
        "is_hidden": true
      },
      {
        "label_number": 3,
        "part_name": "EXACT name that matches where you placed number 3 in the image",
        "explanation": "Clear educational explanation",
        "is_hidden": false
      },
      {
        "label_number": 4,
        "part_name": "EXACT name that matches where you placed number 4 in the image",
        "explanation": "Clear educational explanation",
        "is_hidden": true
      },
      {
        "label_number": 5,
        "part_name": "EXACT name that matches where you placed number 5 in the image",
        "explanation": "Clear educational explanation",
        "is_hidden": true
      }
    ],
    
    "questions": [
      {
        "label_number": 2,
        "question": "What is label number 2?",
        "correct_answer": "EXACT same name as label_number 2 in all_labels array",
        "options": [
          "EXACT same name as label_number 2",
          "Plausible but incorrect similar part",
          "Another plausible wrong answer",
          "Third plausible distractor"
        ],
        "explanation": "Educational explanation of why this is correct"
      },
      {
        "label_number": 4,
        "question": "What is label number 4?",
        "correct_answer": "EXACT same name as label_number 4 in all_labels array",
        "options": [
          "Different position for correct answer",
          "Plausible distractor",
          "EXACT same name as label_number 4",
          "Another distractor"
        ],
        "explanation": "Why this answer is correct"
      },
      {
        "label_number": 5,
        "question": "What is label number 5?",
        "correct_answer": "EXACT same name as label_number 5 in all_labels array",
        "options": [
          "Plausible distractor",
          "Another wrong but related part",
          "Third distractor",
          "EXACT same name as label_number 5"
        ],
        "explanation": "Educational explanation"
      }
    ]
  }
]

🚨 ABSOLUTE REQUIREMENTS - DO NOT VIOLATE:

1. SCIENTIFIC ACCURACY:
   - All part names, explanations, and functions MUST be factually correct
   - Verify all information against the source material provided
   - Use proper scientific/medical terminology
   - Explanations must be educationally sound and accurate

2. NUMBERING CONSISTENCY:
   - Label numbers in image MUST match label_number in JSON (1=1, 2=2, 3=3, 4=4, 5=5)
   - If image shows number "3" pointing to "Aorta", then label_number 3 MUST be "Aorta"
   - Anatomical positioning in image_prompt MUST match the label_number assignment
   - TRIPLE CHECK numbering consistency before finalizing

3. HIDING STRATEGY:
   - Hide 2-3 labels randomly by setting is_hidden: true
   - Choose labels strategically for educational value (mix easy/medium/hard)
   - Keep at least 2 visible labels as hints for students

4. QUESTIONS ARRAY:
   - Only hidden labels (is_hidden: true) should appear in questions array
   - Questions array label_number MUST match the is_hidden: true labels
   - Each hidden label MUST have exactly 4 multiple choice options
   - correct_answer in questions MUST exactly match part_name in all_labels for that label_number

5. MULTIPLE CHOICE OPTIONS QUALITY:
   - Create intelligent, plausible distractors (wrong answers that seem reasonable)
   - Distractors should be related anatomical structures or similar parts
   - Avoid obviously wrong answers (e.g., "Banana" as option for heart anatomy)
   - Mix the position of correct answer (not always first)
   - Options should test genuine understanding, not just memorization
   - For anatomy: use adjacent structures or structures from same system
   - For cells: use organelles with similar functions or locations
   - For chemistry: use similar molecules or related compounds

6. EXPLANATIONS:
   - Provide detailed, educational explanations (2-3 sentences)
   - Include structure/function relationship
   - Add relevant context or clinical significance where appropriate
   - Use clear, student-friendly language while maintaining accuracy

7. OUTPUT FORMAT:
   - Return ONLY valid JSON array - no markdown, no code blocks, no extra text
   - Ensure proper JSON syntax (no trailing commas, proper quotes)

🔍 FINAL VERIFICATION CHECKLIST:
□ All information verified against source material
□ Numbering is consistent between image_prompt and all_labels
□ Hidden labels (2-3) have is_hidden: true
□ Questions array matches hidden labels exactly
□ Multiple choice options are educational and plausible
□ All explanations are accurate and detailed
□ JSON syntax is valid
□ No markdown formatting in output

Generate ${count} activity/activities now:`;

    const claudeResponse = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0.3, // Low temperature for maximum accuracy and consistency
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const responseText = claudeResponse.content[0].type === 'text' 
      ? claudeResponse.content[0].text 
      : '';

    console.log('🎨 [Labeled Visual] Claude response:', responseText.substring(0, 500));

    // Parse the JSON response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in Claude response');
    }

    const visualActivities = JSON.parse(jsonMatch[0]);
    console.log(`🎨 [Labeled Visual] Generated ${visualActivities.length} activities`);

    // Validate and enforce hiding rules
    for (const activity of visualActivities) {
      // Count hidden labels
      const hiddenCount = activity.all_labels.filter((label: any) => label.is_hidden === true).length;
      const visibleCount = activity.all_labels.filter((label: any) => label.is_hidden === false).length;
      
      console.log(`🎨 [Labeled Visual] Activity: ${activity.title}`);
      console.log(`   📊 Total labels: ${activity.all_labels.length}`);
      console.log(`   ❌ Hidden labels: ${hiddenCount}`);
      console.log(`   ✅ Visible labels: ${visibleCount}`);
      console.log(`   ❓ Questions count: ${activity.questions.length}`);
      
      // FORCE: If no labels are hidden, randomly hide 2-3 labels
      if (hiddenCount === 0) {
        console.log('⚠️ [Labeled Visual] No hidden labels detected! Forcing 2-3 labels to be hidden...');
        
        // Randomly select 2-3 labels to hide
        const numToHide = Math.floor(Math.random() * 2) + 2; // 2 or 3
        const allLabelNumbers = activity.all_labels.map((label: any) => label.label_number);
        const shuffled = allLabelNumbers.sort(() => Math.random() - 0.5);
        const labelsToHide = shuffled.slice(0, numToHide);
        
        console.log(`   🎲 Randomly hiding labels: ${labelsToHide.join(', ')}`);
        
        // Set is_hidden = true for selected labels
        activity.all_labels.forEach((label: any) => {
          if (labelsToHide.includes(label.label_number)) {
            label.is_hidden = true;
          } else {
            label.is_hidden = false;
          }
        });
        
        // Regenerate questions array for hidden labels
        activity.questions = activity.all_labels
          .filter((label: any) => label.is_hidden === true)
          .map((label: any) => {
            // Find existing question or create new one
            const existingQuestion = activity.questions.find((q: any) => q.label_number === label.label_number);
            
            if (existingQuestion) {
              return existingQuestion;
            } else {
              // Create a basic question if none exists
              return {
                label_number: label.label_number,
                question: `What is label number ${label.label_number}?`,
                correct_answer: label.part_name,
                options: [label.part_name, "Unknown part", "Different structure", "Another component"],
                explanation: label.explanation || `This is the ${label.part_name}.`
              };
            }
          });
        
        console.log(`   ✅ Fixed! Now hiding ${labelsToHide.length} labels`);
      }
      
      // Verify questions match hidden labels
      const hiddenLabelNumbers = activity.all_labels
        .filter((label: any) => label.is_hidden === true)
        .map((label: any) => label.label_number);
      
      const questionLabelNumbers = activity.questions.map((q: any) => q.label_number);
      
      console.log(`   🔢 Hidden label numbers: [${hiddenLabelNumbers.join(', ')}]`);
      console.log(`   🔢 Question label numbers: [${questionLabelNumbers.join(', ')}]`);
      
      // Ensure all hidden labels have questions
      hiddenLabelNumbers.forEach((labelNum: number) => {
        if (!questionLabelNumbers.includes(labelNum)) {
          console.log(`   ⚠️ Missing question for hidden label ${labelNum}! Creating one...`);
          const label = activity.all_labels.find((l: any) => l.label_number === labelNum);
          activity.questions.push({
            label_number: labelNum,
            question: `What is label number ${labelNum}?`,
            correct_answer: label.part_name,
            options: [label.part_name, "Unknown part", "Different structure", "Another component"],
            explanation: label.explanation || `This is the ${label.part_name}.`
          });
        }
      });
    }

    console.log(`🎨 [Labeled Visual] Validation complete`);

    // Generate images for each activity
    const generatedVisuals = [];

    for (const activity of visualActivities) {
      console.log(`🎨 [Labeled Visual] Generating image for: ${activity.title}`);
      console.log(`🎨 [Labeled Visual] Hidden labels: ${activity.questions.map((q: any) => q.label_number).join(', ')}`);

      let imageUrl = null;
      try {
        const imageResult = await generateImage(activity.image_prompt);
        imageUrl = imageResult.imageUrl;
        console.log(`✅ [Labeled Visual] Image generated: ${imageUrl}`);
      } catch (imageError) {
        console.error('❌ [Labeled Visual] Image generation failed:', imageError);
        logger.error({ err: imageError }, '[Labeled Visual] Image generation failed');
        imageUrl = 'https://via.placeholder.com/600x1200/6C63FF/FFFFFF?text=Diagram+Image';
      }

      // Save to database
      const { data: savedVisual, error: saveError } = await supabase
        .from('visuals')
        .insert({
          user_id: userId,
          upload_id: uploadId,
          title: activity.title,
          subject: activity.subject,
          visual_type: 'labeled_diagram',
          difficulty: activity.difficulty,
          instruction_text: activity.instruction_text,
          image_url: imageUrl,
          image_prompt: activity.image_prompt,
          all_labels: activity.all_labels,
          questions: activity.questions,
          correct_answers: activity.questions.map((q: any) => ({
            label_number: q.label_number,
            correct_answer: q.correct_answer,
          })),
        })
        .select()
        .single();

      if (saveError) {
        logger.error({ err: saveError }, '[Labeled Visual] Failed to save visual');
        throw new Error('Failed to save visual');
      }

      generatedVisuals.push(savedVisual);
    }

    logger.info({ count: generatedVisuals.length }, '[Labeled Visual] Successfully generated labeled visuals');

    res.status(200).json({
      status: 'success',
      message: `Generated ${generatedVisuals.length} interactive labeled visual(s)`,
      data: {
        visuals: generatedVisuals,
      },
    });

  } catch (error: any) {
    console.error('❌ [Labeled Visual] Error:', error);
    logger.error({ err: error }, '[Labeled Visual] Generation failed');
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate labeled visual',
    });
  }
};
