import { BACKEND_API_URL } from '../config/api';
import { getAccessToken } from './auth';

/**
 * Get current user's profile
 */
export const getProfile = async () => {
  try {
    console.log('👤 Fetching user profile...');

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('📡 Profile response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch profile');
    }

    const result = await response.json();
    console.log('✅ Profile fetched successfully');

    return result;
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (profileData) => {
  try {
    console.log('📝 Updating profile...');
    console.log('📊 Profile data:', profileData);

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    console.log('📡 Update response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }

    const result = await response.json();
    console.log('✅ Profile updated successfully');

    return result;
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    throw error;
  }
};

/**
 * Change user password
 */
export const changePassword = async (currentPassword, newPassword) => {
  try {
    console.log('🔐 Changing password...');

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/profile/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    console.log('📡 Password change response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to change password');
    }

    const result = await response.json();
    console.log('✅ Password changed successfully');

    return result;
  } catch (error) {
    console.error('❌ Error changing password:', error);
    throw error;
  }
};

/**
 * Change user email
 */
export const changeEmail = async (newEmail, password) => {
  try {
    console.log('📧 Changing email...');

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/profile/email`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        new_email: newEmail,
        password: password,
      }),
    });

    console.log('📡 Email change response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to change email');
    }

    const result = await response.json();
    console.log('✅ Email change initiated');

    return result;
  } catch (error) {
    console.error('❌ Error changing email:', error);
    throw error;
  }
};

/**
 * Upload user avatar/profile photo
 */
export const uploadAvatar = async (imageUri) => {
  try {
    console.log('📸 Uploading avatar...');

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    // Create form data
    const formData = new FormData();
    
    // Extract filename from URI
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('avatar', {
      uri: imageUri,
      name: filename || 'avatar.jpg',
      type: type,
    });

    const response = await fetch(`${BACKEND_API_URL}/api/profile/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    console.log('📡 Avatar upload response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload avatar');
    }

    const result = await response.json();
    console.log('✅ Avatar uploaded successfully');

    return result;
  } catch (error) {
    console.error('❌ Error uploading avatar:', error);
    throw error;
  }
};

/**
 * Remove user avatar
 */
export const removeAvatar = async () => {
  try {
    console.log('🗑️ Removing avatar...');

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/profile/avatar`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('📡 Avatar removal response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to remove avatar');
    }

    const result = await response.json();
    console.log('✅ Avatar removed successfully');

    return result;
  } catch (error) {
    console.error('❌ Error removing avatar:', error);
    throw error;
  }
};
