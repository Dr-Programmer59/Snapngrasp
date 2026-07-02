import { BACKEND_API_URL } from '../config/api';
import { getAccessToken } from './auth';

/**
 * Get all notes for current user
 */
export const getNotes = async (search = '', tag = '', sort = 'updated_at', order = 'desc', folderId = undefined) => {
  try {
    console.log('📚 Fetching notes...');

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tag) params.append('tag', tag);
    if (sort) params.append('sort', sort);
    if (order) params.append('order', order);
    if (folderId !== undefined) params.append('folder', folderId || 'null');

    const url = `${BACKEND_API_URL}/api/notes${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('📡 Notes response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch notes');
    }

    const result = await response.json();
    console.log('✅ Notes fetched:', result.data.notes.length);

    return result;
  } catch (error) {
    console.error('❌ Error fetching notes:', error);
    throw error;
  }
};

/**
 * Get a specific note by ID
 */
export const getNoteById = async (noteId) => {
  try {
    console.log('📖 Fetching note:', noteId);

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/notes/${noteId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('📡 Note response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch note');
    }

    const result = await response.json();
    console.log('✅ Note fetched:', result.data.note.title);

    return result;
  } catch (error) {
    console.error('❌ Error fetching note:', error);
    throw error;
  }
};

/**
 * Create a new note
 */
export const createNote = async (noteData) => {
  try {
    console.log('✍️ Creating note...');
    console.log('📝 Note data:', noteData);

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(noteData),
    });

    console.log('📡 Create response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create note');
    }

    const result = await response.json();
    console.log('✅ Note created:', result.data.note.id);

    return result;
  } catch (error) {
    console.error('❌ Error creating note:', error);
    throw error;
  }
};

/**
 * Update an existing note
 */
export const updateNote = async (noteId, noteData) => {
  try {
    console.log('📝 Updating note:', noteId);
    console.log('📊 Update data:', noteData);

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(noteData),
    });

    console.log('📡 Update response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update note');
    }

    const result = await response.json();
    console.log('✅ Note updated successfully');

    return result;
  } catch (error) {
    console.error('❌ Error updating note:', error);
    throw error;
  }
};

/**
 * Delete a note
 */
export const deleteNote = async (noteId) => {
  try {
    console.log('🗑️ Deleting note:', noteId);

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('📡 Delete response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete note');
    }

    const result = await response.json();
    console.log('✅ Note deleted successfully');

    return result;
  } catch (error) {
    console.error('❌ Error deleting note:', error);
    throw error;
  }
};

/**
 * Toggle favorite status of a note
 */
export const toggleFavorite = async (noteId) => {
  try {
    console.log('⭐ Toggling favorite for note:', noteId);

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/notes/${noteId}/favorite`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('📡 Favorite toggle response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to toggle favorite');
    }

    const result = await response.json();
    console.log('✅ Favorite toggled:', result.data.note.is_favorite);

    return result;
  } catch (error) {
    console.error('❌ Error toggling favorite:', error);
    throw error;
  }
};

/**
 * Get all unique tags
 */
export const getTags = async () => {
  try {
    console.log('🏷️ Fetching tags...');

    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${BACKEND_API_URL}/api/notes/tags`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('📡 Tags response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch tags');
    }

    const result = await response.json();
    console.log('✅ Tags fetched:', result.data.tags.length);

    return result;
  } catch (error) {
    console.error('❌ Error fetching tags:', error);
    throw error;
  }
};

/**
 * Helper to convert rich text formatting
 */
export const convertToHTML = (text) => {
  // Convert markdown-style formatting to HTML
  let html = text;
  
  // Bold: **text** or __text__ -> <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_ -> <em>text</em>
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
};

/**
 * Helper to convert HTML back to plain text with markers
 */
export const convertFromHTML = (html) => {
  let text = html;
  
  // Convert HTML tags back to markdown-style
  text = text.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
  text = text.replace(/<em>(.*?)<\/em>/g, '*$1*');
  text = text.replace(/<br\s*\/?>/g, '\n');
  
  return text;
};
