import { BACKEND_API_URL } from '../config/api';
import { getAccessToken } from './auth';

/**
 * Complete onboarding with learning style and study goals
 */
export const completeOnboarding = async (learningStyle, studyGoals, displayName) => {
  try {
    console.log('✨ Completing onboarding...');
    console.log('📊 Data:', { learningStyle, studyGoals: studyGoals?.length, displayName });

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/onboarding/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        learning_style: learningStyle,
        study_goals: studyGoals ? JSON.stringify(studyGoals) : null,
        display_name: displayName,
      }),
    });

    console.log('📡 Onboarding response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to complete onboarding');
    }

    const result = await response.json();
    console.log('✅ Onboarding completed successfully');

    return result;
  } catch (error) {
    console.error('❌ Error completing onboarding:', error);
    throw error;
  }
};

/**
 * Update learning style
 */
export const updateLearningStyle = async (learningStyle) => {
  try {
    console.log('🎨 Updating learning style...');

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/onboarding/set-style`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        learning_style: learningStyle,
      }),
    });

    console.log('📡 Learning style update response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update learning style');
    }

    const result = await response.json();
    console.log('✅ Learning style updated successfully');

    return result;
  } catch (error) {
    console.error('❌ Error updating learning style:', error);
    throw error;
  }
};
