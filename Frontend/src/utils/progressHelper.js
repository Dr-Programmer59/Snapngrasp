import { logProgress as logProgressAPI } from '../api/progressApi';

/**
 * Automatically log MCQ completion
 */
export const logMCQCompletion = async (data) => {
  try {
    const {
      uploadId,
      score,
      total,
      difficulty,
      subject,
      topic,
      timeSpent,
    } = data;

    await logProgressAPI({
      uploadId,
      activityType: 'mcq',
      score,
      total,
      difficulty,
      subject,
      topic,
      timeSpentSeconds: timeSpent,
    });

    console.log('✅ [Progress Helper] MCQ progress logged');
  } catch (error) {
    console.error('❌ [Progress Helper] Error logging MCQ:', error);
  }
};

/**
 * Automatically log Flashcard completion
 */
export const logFlashcardCompletion = async (data) => {
  try {
    const {
      uploadId,
      reviewed,
      correct,
      difficulty,
      subject,
      topic,
      timeSpent,
    } = data;

    await logProgressAPI({
      uploadId,
      activityType: 'flashcard',
      score: correct,
      total: reviewed,
      difficulty,
      subject,
      topic,
      timeSpentSeconds: timeSpent,
    });

    console.log('✅ [Progress Helper] Flashcard progress logged');
  } catch (error) {
    console.error('❌ [Progress Helper] Error logging Flashcard:', error);
  }
};

/**
 * Automatically log Visual Practice completion
 */
export const logVisualCompletion = async (data) => {
  try {
    const {
      uploadId,
      score,
      total,
      difficulty,
      subject,
      topic,
      timeSpent,
    } = data;

    await logProgressAPI({
      uploadId,
      activityType: 'visual',
      score,
      total,
      difficulty,
      subject,
      topic,
      timeSpentSeconds: timeSpent,
    });

    console.log('✅ [Progress Helper] Visual progress logged');
  } catch (error) {
    console.error('❌ [Progress Helper] Error logging Visual:', error);
  }
};

/**
 * Automatically log Labeled Visual completion
 */
export const logLabeledVisualCompletion = async (data) => {
  try {
    const {
      uploadId,
      score,
      total,
      difficulty,
      subject,
      topic,
      timeSpent,
    } = data;

    await logProgressAPI({
      uploadId,
      activityType: 'labeled_visual',
      score,
      total,
      difficulty,
      subject,
      topic,
      timeSpentSeconds: timeSpent,
    });

    console.log('✅ [Progress Helper] Labeled Visual progress logged');
  } catch (error) {
    console.error('❌ [Progress Helper] Error logging Labeled Visual:', error);
  }
};
