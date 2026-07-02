// Voice Style API
import { BACKEND_API_URL } from '../config/api';
import { getAccessToken } from './auth';

/**
 * Update user's voice style preference
 */
export const updateVoiceStyle = async (voiceStyle) => {
  try {
    console.log('🎙️ Updating voice style to:', voiceStyle);

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/profile/voice-style`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        voice_style: voiceStyle,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update voice style');
    }

    const data = await response.json();
    console.log('✅ Voice style updated successfully');
    return data;
  } catch (error) {
    console.error('❌ Error updating voice style:', error);
    throw error;
  }
};
