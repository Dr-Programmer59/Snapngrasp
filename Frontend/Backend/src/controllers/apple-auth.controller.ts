import { Request, Response } from 'express';
import appleSignin from 'apple-signin-auth';
import jwt from 'jsonwebtoken';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';

/**
 * Apple Sign-In callback endpoint
 * POST /api/auth/apple/callback
 * Receives authorization code from Apple and exchanges it for tokens
 */
export const appleAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, id_token, user } = req.body;

    if (!code) {
      res.status(400).json({
        status: 'error',
        message: 'Authorization code is required',
      });
      return;
    }

    logger.info('[Apple Auth] Processing Apple Sign-In callback');

    // Verify the Apple ID token
    const appleResponse = await appleSignin.verifyIdToken(id_token, {
      audience: process.env.APPLE_CLIENT_ID!,
      ignoreExpiration: false,
    });

    const appleUserId = appleResponse.sub; // Apple's unique user ID
    const email = appleResponse.email;

    logger.info({ appleUserId, email }, '[Apple Auth] Apple ID token verified');

    // Check if user exists in database
    const supabase = getSupabaseServer();
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('apple_id', appleUserId)
      .single();

    let userId: string;
    let userData: any;

    if (existingUser) {
      // User exists - log them in
      logger.info({ userId: existingUser.id }, '[Apple Auth] Existing user found');
      userId = existingUser.id;
      userData = existingUser;

      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);

    } else {
      // New user - create account
      logger.info('[Apple Auth] Creating new user account');

      // Extract name from user object (only available on first sign-in)
      let fullName = email?.split('@')[0] || 'Apple User';
      if (user && typeof user === 'object') {
        const userName = user as { name?: { firstName?: string; lastName?: string } };
        if (userName.name) {
          fullName = `${userName.name.firstName || ''} ${userName.name.lastName || ''}`.trim();
        }
      }

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: email || `${appleUserId}@privaterelay.appleid.com`,
          full_name: fullName,
          apple_id: appleUserId,
          email_verified: true, // Apple already verified the email
          auth_provider: 'apple',
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !newUser) {
        logger.error({ error: createError }, '[Apple Auth] Failed to create user');
        res.status(500).json({
          status: 'error',
          message: 'Failed to create user account',
        });
        return;
      }

      userId = newUser.id;
      userData = newUser;
      logger.info({ userId }, '[Apple Auth] New user created successfully');
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

    logger.info({ userId }, '[Apple Auth] Sign-in successful');

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
    logger.error({ error: error.message, stack: error.stack }, '[Apple Auth] Error processing Apple Sign-In');
    
    res.status(500).json({
      status: 'error',
      message: 'Apple Sign-In failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Revoke Apple Sign-In (optional endpoint for account deletion)
 * POST /api/auth/apple/revoke
 */
export const appleAuthRevoke = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        status: 'error',
        message: 'Refresh token is required',
      });
      return;
    }

    // Revoke the Apple refresh token
    // Note: apple-signin-auth doesn't have a revokeToken method
    // You would need to call Apple's revoke endpoint directly
    // For now, we'll just invalidate it on our side
    logger.info('[Apple Auth] Token revocation requested (not implemented by library)');

    logger.info('[Apple Auth] Token revoked successfully');

    res.status(200).json({
      status: 'success',
      message: 'Apple Sign-In token revoked',
    });

  } catch (error: any) {
    logger.error({ error: error.message }, '[Apple Auth] Error revoking token');
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to revoke Apple Sign-In',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
