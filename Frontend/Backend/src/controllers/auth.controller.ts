import { Request, Response } from 'express';
import {
  revokeUserTokens,
  getSupabaseServer,
} from '../services/supabase.service';
import { logger } from '../utils/logger';
import { env } from '../utils/env';

// GET /auth/validate - Verify token and return profile
export const validateToken = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        user_id: req.user.id,
        profile: {
          email: req.user.profile.email,
          display_name: req.user.profile.display_name,
          avatar_url: req.user.profile.avatar_url,
          role: req.user.profile.role,
          learning_style: req.user.profile.learning_style,
          onboarding_completed: req.user.profile.onboarding_completed,
          last_login_at: req.user.profile.last_login_at,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Token validation error');
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate token',
    });
  }
};

// POST /auth/logout - Device sign-out (client clears session)
export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Device-based logout - client should clear the session
    // This endpoint is mainly for confirmation
    res.status(200).json({
      status: 'success',
      data: { ok: true },
    });
  } catch (error) {
    logger.error({ err: error }, 'Logout error');
    res.status(500).json({
      status: 'error',
      message: 'Logout failed',
    });
  }
};

// POST /auth/logout-all - Admin: Revoke all refresh tokens for a user
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      res.status(400).json({
        status: 'error',
        message: 'user_id is required',
      });
      return;
    }

    // Only admins or self can revoke tokens
    if (req.user?.role !== 'admin' && req.user?.id !== user_id) {
      res.status(403).json({
        status: 'error',
        message: 'Forbidden',
      });
      return;
    }

    await revokeUserTokens(user_id);

    res.status(200).json({
      status: 'success',
      data: { ok: true, message: 'All sessions revoked' },
    });
  } catch (error) {
    logger.error({ err: error }, 'Logout all error');
    res.status(500).json({
      status: 'error',
      message: 'Failed to revoke sessions',
    });
  }
};

// POST /auth/email/signup - Email signup (proxied to Supabase)
export const emailSignup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, display_name } = req.body;

    console.log('=== EMAIL SIGNUP REQUEST ===');
    console.log('Email:', email);
    console.log('Display Name:', display_name);
    console.log('===========================');

    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
      return;
    }

    const supabase = getSupabaseServer();

    console.log('Attempting to create user in Supabase...');

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for development; change in production
      user_metadata: {
        display_name: display_name || null,
      },
    });

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      logger.error({ err: error }, 'Email signup error');
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }

    console.log('User created successfully:', data.user?.id);

    res.status(201).json({
      status: 'success',
      data: {
        user_id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Email signup error');
    res.status(500).json({
      status: 'error',
      message: 'Signup failed',
    });
  }
};

// POST /auth/email/login - Email login (proxied to Supabase)
export const emailLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
      return;
    }

    const supabase = getSupabaseServer();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error({ err: error }, 'Email login error');
      res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Email login error');
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
    });
  }
};

// GET /auth/oauth/url - Generate OAuth URL
export const getOAuthUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, redirect_to } = req.query;

    if (!provider || (provider !== 'google' && provider !== 'apple')) {
      res.status(400).json({
        status: 'error',
        message: 'Valid provider (google|apple) is required',
      });
      return;
    }

    const supabase = getSupabaseServer();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'google' | 'apple',
      options: {
        redirectTo: (redirect_to as string) || env.OAUTH_REDIRECT_URL,
      },
    });

    if (error) {
      logger.error({ err: error }, 'OAuth URL generation error');
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate OAuth URL',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        url: data.url,
        provider,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'OAuth URL error');
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate OAuth URL',
    });
  }
};

// POST /auth/refresh - Refresh access token using refresh token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        status: 'error',
        message: 'refresh_token is required',
      });
      return;
    }

    const supabase = getSupabaseServer();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      logger.error({ err: error }, 'Token refresh error');
      res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Token refresh error');
    res.status(500).json({
      status: 'error',
      message: 'Failed to refresh token',
    });
  }
};

// POST /auth/delete-account - Permanently delete user account and all data
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    const supabase = getSupabaseServer();

    // Delete all user data from database tables
    // This cascades through foreign key relationships
    const tablesToDelete = [
      'user_credits',
      'user_subscriptions',
      'user_onboarding',
      'user_profiles',
      'user_activity',
      'uploads',
      'mcq_quiz_attempts',
      'flashcard_practice_sessions',
      'labeled_visual_annotations',
      'chat_messages',
      'user_notes',
      'user_note_folders',
      'user_favorites',
      'user_feedback',
    ];

    // Delete in order of dependency (user_profiles last as it has FK references)
    for (const table of tablesToDelete) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error && !error.message.includes('violates foreign key')) {
        logger.warn(`Failed to delete from ${table}: ${error.message}`);
      }
    }

    // Delete the auth user (this removes them from Supabase auth)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      logger.error({ err: deleteError }, 'Failed to delete auth user');
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete account',
      });
      return;
    }

    logger.info(`User ${userId} account deleted successfully`);

    res.status(200).json({
      status: 'success',
      message: 'Account deleted permanently',
    });
  } catch (error) {
    logger.error({ err: error }, 'Account deletion error');
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete account',
    });
  }
};

