import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API_URL } from '../config/api';

/**
 * Platform-specific storage wrapper for auth tokens
 */
const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
};

/**
 * Upload image to backend for OCR processing with Claude Vision
 * @param {string} imageUri - Local file URI from camera or file picker
 * @param {function} onProgress - Optional callback for upload progress (0-100)
 * @returns {Promise<Object>} Upload result with extracted text
 */
export const uploadImage = async (imageUri, onProgress = null) => {
  console.log('📤 [Upload API] Starting image upload...');
  console.log('📍 Platform:', Platform.OS);
  console.log('🖼️ Image URI:', imageUri);
  console.log('🌐 Backend URL:', BACKEND_API_URL);

  try {
    // Get auth token
    console.log('🔍 [Upload API] Attempting to retrieve token from storage...');
    const token = await storage.getItem('access_token');
    
    console.log('🔍 [Upload API] Token retrieved:', token ? `${token.substring(0, 20)}...` : 'null');
    
    if (!token) {
      console.log('❌ [Upload API] No auth token found in storage');
      console.log('💡 [Upload API] Storage key: access_token');
      console.log('💡 [Upload API] Platform:', Platform.OS);
      throw new Error('Please login first');
    }

    console.log('✅ [Upload API] Auth token retrieved successfully');

    // Create FormData
    const formData = new FormData();
    
    // Extract filename from URI or generate one
    const filename = imageUri.split('/').pop() || `photo_${Date.now()}.jpg`;
    
    // Determine file type
    let fileType = 'image/jpeg';
    if (filename.toLowerCase().endsWith('.png')) {
      fileType = 'image/png';
    } else if (filename.toLowerCase().endsWith('.webp')) {
      fileType = 'image/webp';
    } else if (filename.toLowerCase().endsWith('.gif')) {
      fileType = 'image/gif';
    }

    console.log('📝 [Upload API] Filename:', filename);
    console.log('📝 [Upload API] File type:', fileType);

    // Append image to form data
    formData.append('image', {
      uri: imageUri,
      type: fileType,
      name: filename,
    });

    console.log('📦 [Upload API] FormData prepared');
    console.log('🚀 [Upload API] Sending request to:', `${BACKEND_API_URL}/api/uploads/image`);

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          console.log(`📊 [Upload API] Progress: ${percentComplete}%`);
          onProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        console.log('✅ [Upload API] Request completed');
        console.log('📡 [Upload API] Status:', xhr.status);
        console.log('📄 [Upload API] Response:', xhr.responseText);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('✅ [Upload API] Upload successful!');
            console.log('📝 [Upload API] Extracted text length:', response.data?.extracted_text?.length || 0);
            console.log('🎯 [Upload API] Confidence:', response.data?.confidence);
            resolve(response);
          } catch (error) {
            console.log('❌ [Upload API] Failed to parse response:', error);
            reject(new Error('Invalid response format'));
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            console.log('❌ [Upload API] Server error:', errorResponse.message);
            const err = new Error(errorResponse.message || 'Upload failed');
            err.code = errorResponse.code || null;
            err.creditType = errorResponse.creditType || null;
            err.used = errorResponse.used ?? null;
            err.limit = errorResponse.limit ?? null;
            err.statusCode = xhr.status;
            reject(err);
          } catch (error) {
            console.log('❌ [Upload API] Upload failed with status:', xhr.status);
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        console.log('❌ [Upload API] Network error occurred');
        console.log('💡 Hint: Check if backend is running and accessible');
        console.log('💡 Android physical device? Use LAN IP in config/api.js');
        reject(new Error('Network error - cannot reach server'));
      });

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        console.log('❌ [Upload API] Request timeout');
        console.log('💡 [Upload API] The server is taking too long. This usually means:');
        console.log('   1. Large image being processed by Claude Vision');
        console.log('   2. Slow network connection');
        console.log('   3. Backend server is overloaded');
        reject(new Error('Processing timeout - this image is taking too long. Try a smaller image or check your connection.'));
      });

      // Configure and send request
      xhr.open('POST', `${BACKEND_API_URL}/api/uploads/image`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 120000; // 2 minute timeout for Claude Vision processing
      
      console.log('📡 [Upload API] Sending FormData...');
      console.log('⏱️ [Upload API] Timeout set to 120 seconds');
      xhr.send(formData);
    });

  } catch (error) {
    console.log('❌ [Upload API] Error:', error.message);
    throw error;
  }
};

/**
 * Get upload history for current user
 * @returns {Promise<Array>} List of previous uploads
 */
export const getUploadHistory = async () => {
  console.log('📜 [Upload API] Fetching upload history...');

  try {
    const token = await storage.getItem('access_token');
    if (!token) {
      throw new Error('Please login first');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/uploads/history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 [Upload API] History response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch history');
    }

    const data = await response.json();
    console.log('✅ [Upload API] History fetched:', data.data?.length || 0, 'uploads');
    return data;

  } catch (error) {
    console.log('❌ [Upload API] History error:', error.message);
    throw error;
  }
};

/**
 * Get specific upload by ID
 * @param {string} uploadId - Upload ID
 * @returns {Promise<Object>} Upload details
 */
export const getUploadById = async (uploadId) => {
  console.log('🔍 [Upload API] Fetching upload:', uploadId);

  try {
    const token = await storage.getItem('access_token');
    if (!token) {
      throw new Error('Please login first');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/uploads/${uploadId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 [Upload API] Get upload response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch upload');
    }

    const data = await response.json();
    console.log('✅ [Upload API] Upload fetched successfully');
    return data;

  } catch (error) {
    console.log('❌ [Upload API] Get upload error:', error.message);
    throw error;
  }
};

/**
 * Delete upload by ID
 * @param {string} uploadId - Upload ID to delete
 * @returns {Promise<Object>} Deletion result
 */
export const deleteUpload = async (uploadId) => {
  console.log('🗑️ [Upload API] Deleting upload:', uploadId);

  try {
    const token = await storage.getItem('access_token');
    if (!token) {
      throw new Error('Please login first');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/uploads/${uploadId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 [Upload API] Delete response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete upload');
    }

    const data = await response.json();
    console.log('✅ [Upload API] Upload deleted successfully');
    return data;

  } catch (error) {
    console.log('❌ [Upload API] Delete error:', error.message);
    throw error;
  }
};

/**
 * Upload manually typed/pasted text (no OCR needed)
 * @param {string} text - The text content
 * @param {string} title - Title of the notes
 * @param {string} subject - Subject/topic
 * @returns {Promise<Object>} Upload result with upload_id
 */
export const uploadText = async (text, title, subject) => {
  console.log('📝 [Upload API] Uploading text...');
  console.log('📍 Title:', title);
  console.log('📍 Subject:', subject);
  console.log('📍 Text length:', text.length);

  try {
    const token = await storage.getItem('access_token');
    if (!token) {
      throw new Error('Please login first');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/uploads/text`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        title,
        subject,
      }),
    });

    console.log('📡 [Upload API] Text upload response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload text');
    }

    const data = await response.json();
    console.log('✅ [Upload API] Text uploaded successfully');
    console.log('🆔 Upload ID:', data.data?.upload_id);
    console.log('📊 Word count:', data.data?.word_count);
    return data;

  } catch (error) {
    console.log('❌ [Upload API] Text upload error:', error.message);
    throw error;
  }
};

/**
 * Create upload from existing note
 * @param {string} noteId - The ID of the note to convert to upload
 * @returns {Promise<Object>} Upload result with upload data
 */
export const createUploadFromNote = async (noteId) => {
  console.log('📝 [Upload API] Creating upload from note:', noteId);

  try {
    const token = await storage.getItem('access_token');
    if (!token) {
      throw new Error('Please login first');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/uploads/from-note/${noteId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 [Upload API] Create from note response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create upload from note');
    }

    const data = await response.json();
    console.log('✅ [Upload API] Upload created from note successfully');
    console.log('🆔 Upload ID:', data.data?.upload?.id);
    return data;

  } catch (error) {
    console.log('❌ [Upload API] Create from note error:', error.message);
    throw error;
  }
};
