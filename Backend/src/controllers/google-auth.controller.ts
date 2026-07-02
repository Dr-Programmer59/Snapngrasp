import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Google Sign-In callback endpoint
 * POST /api/auth/google/callback
 * Receives ID token from Google and verifies it
 */
export const googleAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_token } = req.body;

    if (!id_token) {
      res.status(400).json({
        status: 'error',
        message: 'ID token is required',
      });
      return;
    }

    logger.info('[Google Auth] Processing Google Sign-In callback');

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid Google token',
      });
      return;
    }

    const googleUserId = payload.sub; // Google's unique user ID
    const email = payload.email;
    const fullName = payload.name;
    const avatarUrl = payload.picture;
    const emailVerified = payload.email_verified;

    logger.info({ googleUserId, email }, '[Google Auth] Google ID token verified');

    // Check if user exists in database
    const supabase = getSupabaseServer();
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', googleUserId)
      .single();

    let userId: string;
    let userData: any;

    if (existingUser) {
      // User exists - log them in
      logger.info({ userId: existingUser.id }, '[Google Auth] Existing user found');
      userId = existingUser.id;
      userData = existingUser;

      // Update last login and avatar if changed
      await supabase
        .from('users')
        .update({ 
          last_login_at: new Date().toISOString(),
          avatar_url: avatarUrl || existingUser.avatar_url,
        })
        .eq('id', userId);

    } else {
      // New user - create account
      logger.info('[Google Auth] Creating new user account');

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: email!,
          full_name: fullName || email?.split('@')[0] || 'Google User',
          google_id: googleUserId,
          avatar_url: avatarUrl,
          email_verified: emailVerified || true,
          auth_provider: 'google',
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !newUser) {
        logger.error({ error: createError }, '[Google Auth] Failed to create user');
        res.status(500).json({
          status: 'error',
          message: 'Failed to create user account',
        });
        return;
      }

      userId = newUser.id;
      userData = newUser;
      logger.info({ userId }, '[Google Auth] New user created successfully');
    }

    // Generate JWT tokens for the app
    const accessToken = jwt.sign(
      { userId, email: userData.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '30d' }
    );

    logger.info({ userId }, '[Google Auth] Sign-in successful');

    res.status(200).json({
      status: 'success',
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
        },
      },
    });

  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, '[Google Auth] Error processing Google Sign-In');
    
    res.status(500).json({
      status: 'error',
      message: 'Google Sign-In failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Revoke Google Sign-In (optional endpoint for account deletion)
 * POST /api/auth/google/revoke
 */
export const googleAuthRevoke = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        status: 'error',
        message: 'Token is required',
      });
      return;
    }

    // Revoke the Google token
    await client.revokeToken(token);

    logger.info('[Google Auth] Token revoked successfully');

    res.status(200).json({
      status: 'success',
      message: 'Google Sign-In token revoked',
    });

  } catch (error: any) {
    logger.error({ error: error.message }, '[Google Auth] Error revoking token');
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to revoke Google Sign-In',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
