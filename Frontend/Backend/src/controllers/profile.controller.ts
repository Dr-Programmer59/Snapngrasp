import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Configure multer for avatar uploads
const storage = multer.memoryStorage();
const avatarUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

export const uploadAvatarMiddleware = avatarUpload.single('avatar');

/**
 * GET /api/profile
 * Get current user's profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    console.log('👤 Getting profile for user:', req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        profile: req.user.profile,
      },
    });

  } catch (error: any) {
    console.error('❌ Error getting profile:', error);
    logger.error({ error: error.message }, 'Profile fetch error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to get profile',
      error: error.message,
    });
  }
};

/**
 * PUT /api/profile
 * Update current user's profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const {
      display_name,
      avatar_url,
      learning_style,
      study_goals,
      bio,
      phone_number,
      date_of_birth,
      education_level,
      institution,
      preferred_language,
    } = req.body;

    console.log('📝 Updating profile for user:', req.user.id);
    console.log('📊 Update data:', req.body);

    // Validate learning_style if provided
    if (learning_style && !['visual', 'auditory', 'interactive'].includes(learning_style)) {
      res.status(400).json({
        status: 'error',
        message: 'learning_style must be visual, auditory, or interactive',
      });
      return;
    }

    // Prepare update object (only include fields that were sent)
    const updateData: any = {};
    
    if (display_name !== undefined) updateData.display_name = display_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (learning_style !== undefined) updateData.learning_style = learning_style;
    if (study_goals !== undefined) updateData.study_goals = study_goals;
    if (bio !== undefined) updateData.bio = bio;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (education_level !== undefined) updateData.education_level = education_level;
    if (institution !== undefined) updateData.institution = institution;
    if (preferred_language !== undefined) updateData.preferred_language = preferred_language;

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    console.log('🔄 Fields to update:', Object.keys(updateData));

    const supabase = getSupabaseServer();
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log('✅ Profile updated successfully');

    res.status(200).json({
      status: 'success',
      data: {
        profile: updatedProfile,
      },
      message: 'Profile updated successfully',
    });

  } catch (error: any) {
    console.error('❌ Error updating profile:', error);
    logger.error({ error: error.message }, 'Profile update error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

/**
 * PUT /api/profile/password
 * Change user password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { current_password, new_password } = req.body;

    console.log('🔐 Changing password for user:', req.user.id);

    // Validate input
    if (!current_password || !new_password) {
      res.status(400).json({
        status: 'error',
        message: 'current_password and new_password are required',
      });
      return;
    }

    if (new_password.length < 8) {
      res.status(400).json({
        status: 'error',
        message: 'New password must be at least 8 characters',
      });
      return;
    }

    // Get Supabase admin client
    const supabase = getSupabaseServer();

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: current_password,
    });

    if (signInError) {
      console.error('❌ Current password verification failed');
      res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
      });
      return;
    }

    // Update password using Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (updateError) {
      console.error('❌ Password update error:', updateError);
      throw updateError;
    }

    console.log('✅ Password changed successfully');

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    });

  } catch (error: any) {
    console.error('❌ Error changing password:', error);
    logger.error({ error: error.message }, 'Password change error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to change password',
      error: error.message,
    });
  }
};

/**
 * PUT /api/profile/email
 * Change user email
 */
export const changeEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { new_email, password } = req.body;

    console.log('📧 Changing email for user:', req.user.id);
    console.log('📧 New email:', new_email);

    // Validate input
    if (!new_email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'new_email and password are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
      });
      return;
    }

    const supabase = getSupabaseServer();

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: password,
    });

    if (signInError) {
      console.error('❌ Password verification failed');
      res.status(401).json({
        status: 'error',
        message: 'Password is incorrect',
      });
      return;
    }

    // Update email using Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      email: new_email,
    });

    if (updateError) {
      console.error('❌ Email update error:', updateError);
      
      if (updateError.message.includes('already registered')) {
        res.status(409).json({
          status: 'error',
          message: 'This email is already registered',
        });
        return;
      }
      
      throw updateError;
    }

    console.log('✅ Email change initiated - confirmation email sent');

    res.status(200).json({
      status: 'success',
      message: 'Confirmation email sent to new address. Please verify to complete the change.',
    });

  } catch (error: any) {
    console.error('❌ Error changing email:', error);
    logger.error({ error: error.message }, 'Email change error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to change email',
      error: error.message,
    });
  }
};

/**
 * POST /api/profile/avatar
 * Upload user avatar/profile photo
 */
export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({
        status: 'error',
        message: 'No image file uploaded',
      });
      return;
    }

    console.log('📸 Uploading avatar for user:', req.user.id);
    console.log('📊 File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: `${(file.size / 1024).toFixed(2)} KB`,
    });

    // Process and compress image
    const timestamp = Date.now();
    const filename = `avatar_${req.user.id}_${timestamp}.jpg`;
    const avatarsDir = path.join(__dirname, '../../public/avatars');

    // Ensure avatars directory exists
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    const filePath = path.join(avatarsDir, filename);

    // Compress and resize image to 400x400
    await sharp(file.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toFile(filePath);

    const fileSize = fs.statSync(filePath).size;
    console.log(`📸 Avatar processed: ${(fileSize / 1024).toFixed(2)} KB`);

    // Generate URL (adjust based on your server URL)
    const avatarUrl = `/avatars/${filename}`;

    // Update profile with new avatar URL
    const supabase = getSupabaseServer();
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if database update fails
      fs.unlinkSync(filePath);
      throw error;
    }

    console.log('✅ Avatar uploaded successfully');

    res.status(200).json({
      status: 'success',
      data: {
        profile: updatedProfile,
        avatar_url: avatarUrl,
      },
      message: 'Avatar uploaded successfully',
    });

  } catch (error: any) {
    console.error('❌ Error uploading avatar:', error);
    logger.error({ error: error.message }, 'Avatar upload error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to upload avatar',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/profile/avatar
 * Remove user avatar
 */
export const removeAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    console.log('🗑️ Removing avatar for user:', req.user.id);

    const supabase = getSupabaseServer();
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Avatar removed successfully');

    res.status(200).json({
      status: 'success',
      data: {
        profile: updatedProfile,
      },
      message: 'Avatar removed successfully',
    });

  } catch (error: any) {
    console.error('❌ Error removing avatar:', error);
    logger.error({ error: error.message }, 'Avatar removal error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to remove avatar',
      error: error.message,
    });
  }
};

/**
 * PUT /api/profile/voice-style
 * Update user's preferred voice style for ElevenLabs AI tutor
 */
export const updateVoiceStyle = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { voice_style } = req.body;

    // Validate voice style
    const validStyles = ['Chill', 'Fast Cram', 'Teacher-Style'];
    if (!voice_style || !validStyles.includes(voice_style)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid voice style. Must be one of: Chill, Fast Cram, Teacher-Style',
      });
      return;
    }

    console.log('🎙️ Updating voice style for user:', req.user.id, 'to:', voice_style);

    const supabase = getSupabaseServer();

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ 
        voice_style,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Voice style updated successfully');

    res.status(200).json({
      status: 'success',
      data: {
        profile: updatedProfile,
      },
      message: 'Voice style updated successfully',
    });

  } catch (error: any) {
    console.error('❌ Error updating voice style:', error);
    logger.error({ error: error.message }, 'Voice style update error');

    res.status(500).json({
      status: 'error',
      message: 'Failed to update voice style',
      error: error.message,
    });
  }
};
