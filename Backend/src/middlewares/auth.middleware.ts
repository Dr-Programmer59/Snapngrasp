import { Request, Response, NextFunction } from 'express';
import { verifyToken, getProfile, markLogin } from '../services/supabase.service';
import { logger } from '../utils/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'user' | 'admin';
        profile: any;
      };
    }
  }
}

// Extract bearer token from Authorization header
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
};

// Main auth middleware - validates JWT and attaches user to request
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Missing authorization token',
      });
      return;
    }

    // Verify token with Supabase
    const user = await verifyToken(token);

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token',
      });
      return;
    }

    // Get profile
    const profile = await getProfile(user.id);

    if (!profile) {
      res.status(404).json({
        status: 'error',
        message: 'User profile not found',
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || profile.email,
      role: profile.role,
      profile,
    };

    // Update last login (fire and forget)
    markLogin(user.id).catch((err) => {
      logger.error({ err }, 'Failed to mark login');
    });

    next();
  } catch (error) {
    logger.error({ err: error }, 'Authentication error');
    res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
    });
  }
};

// Require admin role
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      status: 'error',
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      status: 'error',
      message: 'Admin access required',
    });
    return;
  }

  next();
};

// Optional auth - attaches user if token present, but doesn't fail if missing
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      next();
      return;
    }

    const user = await verifyToken(token);

    if (user) {
      const profile = await getProfile(user.id);
      
      if (profile) {
        req.user = {
          id: user.id,
          email: user.email || profile.email,
          role: profile.role,
          profile,
        };
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};
