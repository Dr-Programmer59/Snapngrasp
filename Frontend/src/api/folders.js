import { BACKEND_API_URL } from '../config/api';
import { getAccessToken } from './auth';

/**
 * Helper for authenticated fetch with proper headers
 */
const authenticatedFetch = async (url, options = {}) => {
  const token = await getAccessToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
};

/**
 * Get all folders
 * @returns {Promise<Object>} Folders list with note counts
 */
export const getFolders = async () => {
  try {
    console.log('📁 [Folder API] Fetching folders');
    
    const response = await authenticatedFetch(`${BACKEND_API_URL}/api/folders`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch folders');
    }

    console.log('✅ [Folder API] Folders fetched:', data.data.folders.length);
    return data;
  } catch (error) {
    console.error('❌ [Folder API] Fetch error:', error);
    throw error;
  }
};

/**
 * Create a new folder
 * @param {string} name - Folder name
 * @param {string} color - Folder color (hex)
 * @param {string} icon - Icon name
 * @returns {Promise<Object>} Created folder
 */
export const createFolder = async (name, color = '#6C63FF', icon = 'folder-outline') => {
  try {
    console.log('📁 [Folder API] Creating folder:', name);
    
    const response = await authenticatedFetch(`${BACKEND_API_URL}/api/folders`, {
      method: 'POST',
      body: JSON.stringify({ name, color, icon }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create folder');
    }

    console.log('✅ [Folder API] Folder created:', data.data.folder.id);
    return data;
  } catch (error) {
    console.error('❌ [Folder API] Create error:', error);
    throw error;
  }
};

/**
 * Update a folder
 * @param {string} folderId - Folder ID
 * @param {string} name - New folder name
 * @param {string} color - New folder color
 * @param {string} icon - New icon name
 * @returns {Promise<Object>} Updated folder
 */
export const updateFolder = async (folderId, name, color, icon) => {
  try {
    console.log('📁 [Folder API] Updating folder:', folderId);
    
    const response = await authenticatedFetch(`${BACKEND_API_URL}/api/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, color, icon }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update folder');
    }

    console.log('✅ [Folder API] Folder updated:', data.data.folder.id);
    return data;
  } catch (error) {
    console.error('❌ [Folder API] Update error:', error);
    throw error;
  }
};

/**
 * Delete a folder
 * @param {string} folderId - Folder ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteFolder = async (folderId) => {
  try {
    console.log('📁 [Folder API] Deleting folder:', folderId);
    
    const response = await authenticatedFetch(`${BACKEND_API_URL}/api/folders/${folderId}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete folder');
    }

    console.log('✅ [Folder API] Folder deleted');
    return data;
  } catch (error) {
    console.error('❌ [Folder API] Delete error:', error);
    throw error;
  }
};

/**
 * Move note to folder
 * @param {string} folderId - Folder ID (or 'null' to remove from folder)
 * @param {string} noteId - Note ID
 * @returns {Promise<Object>} Updated note
 */
export const moveNoteToFolder = async (folderId, noteId) => {
  try {
    console.log('📁 [Folder API] Moving note to folder:', { folderId, noteId });
    
    const response = await authenticatedFetch(`${BACKEND_API_URL}/api/folders/${folderId}/notes/${noteId}`, {
      method: 'PUT',
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to move note');
    }

    console.log('✅ [Folder API] Note moved');
    return data;
  } catch (error) {
    console.error('❌ [Folder API] Move note error:', error);
    throw error;
  }
};
