import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

// Server-side client using SERVICE_ROLE_KEY (bypasses RLS)
let serverClient: SupabaseClient | null = null;

export const getSupabaseServer = (): SupabaseClient => {
  if (!serverClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    console.log('=== SUPABASE CONFIGURATION ===');
    console.log('SUPABASE_URL:', env.SUPABASE_URL);
    console.log('SERVICE_ROLE_KEY (first 20 chars):', env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...');
    console.log('==============================');

    serverClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    logger.info('[Supabase] Server client initialized');
  }

  return serverClient;
};

// Anon client for RLS-aware operations (uses user's JWT)
export const getSupabaseClient = (accessToken?: string): SupabaseClient => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase configuration');
  }

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });

  return client;
};

// Verify JWT token and get user
export const verifyToken = async (token: string): Promise<User> => {
  const client = getSupabaseServer();
  
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    throw new Error('Invalid or expired token');
  }

  return data.user;
};

// Profile types
export interface UserProfile {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  learning_style: 'visual' | 'auditory' | 'interactive' | 'reading' | null;
  study_goals: string | null;
  bio: string | null;
  phone_number: string | null;
  education_level: string | null;
  institution: string | null;
  onboarding_completed: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserIntegration {
  id: number;
  user_id: string;
  provider: string;
  external_user_id: string | null;
  access_token: string | null;
  created_at: string;
  updated_at: string;
}

// Get user profile by user_id
export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  const client = getSupabaseServer();
  
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    logger.error({ err: error }, 'Error fetching profile');
    return null;
  }

  return data as UserProfile;
};

// Mark login timestamp
export const markLogin = async (_userId: string): Promise<void> => {
  // Optional: Track login timestamp
  // Requires creating mark_login function in Supabase
  // const client = getSupabaseServer();
  // const { error } = await client.rpc('mark_login', {});
  // if (error) {
  //   logger.error({ err: error }, 'Error marking login');
  // }
};

// Complete onboarding
export const completeOnboarding = async (
  _userId: string,
  style: 'visual' | 'auditory' | 'interactive' | 'reading',
  displayName?: string,
  studyGoals?: string
): Promise<UserProfile> => {
  const client = getSupabaseServer();
  
  const { data, error } = await client.rpc('complete_onboarding', {
    p_style: style,
    p_display_name: displayName || null,
    p_study_goals: studyGoals || null,
  });

  if (error || !data) {
    logger.error({ err: error }, 'Error completing onboarding');
    throw new Error('Failed to complete onboarding');
  }

  return data as UserProfile;
};

// Set learning style
export const setLearningStyle = async (
  _userId: string,
  style: 'visual' | 'auditory' | 'interactive'
): Promise<UserProfile> => {
  const client = getSupabaseServer();
  
  const { data, error } = await client.rpc('set_learning_style', {
    p_style: style,
  });

  if (error || !data) {
    logger.error({ err: error }, 'Error setting learning style');
    throw new Error('Failed to set learning style');
  }

  return data as UserProfile;
};

// Admin: Set user role
export const adminSetRole = async (
  targetUserId: string,
  role: 'user' | 'admin'
): Promise<UserProfile> => {
  const client = getSupabaseServer();
  
  const { data, error } = await client.rpc('admin_set_role', {
    p_user_id: targetUserId,
    p_role: role,
  });

  if (error || !data) {
    logger.error({ err: error }, 'Error setting user role');
    throw new Error('Failed to set user role');
  }

  return data as UserProfile;
};

// Admin: List all users
export const adminListUsers = async (): Promise<UserProfile[]> => {
  const client = getSupabaseServer();
  
  const { data, error } = await client.rpc('admin_list_users');

  if (error) {
    logger.error({ err: error }, 'Error listing users');
    throw new Error('Failed to list users');
  }

  return (data || []) as UserProfile[];
};

// Upsert integration (Canvas)
export const upsertIntegration = async (
  _userId: string,
  provider: string,
  externalUserId: string,
  accessToken: string
): Promise<UserIntegration> => {
  const client = getSupabaseServer();
  
  const { data, error } = await client.rpc('upsert_integration', {
    p_provider: provider,
    p_external_user_id: externalUserId,
    p_access_token: accessToken,
  });

  if (error || !data) {
    logger.error({ err: error }, 'Error upserting integration');
    throw new Error('Failed to save integration');
  }

  return data as UserIntegration;
};

// Delete integration
export const deleteIntegration = async (
  _userId: string,
  provider: string
): Promise<void> => {
  const client = getSupabaseServer();
  
  const { error } = await client.rpc('delete_integration', {
    p_provider: provider,
  });

  if (error) {
    logger.error({ err: error }, 'Error deleting integration');
    throw new Error('Failed to delete integration');
  }
};

// Revoke all refresh tokens (logout all devices)
export const revokeUserTokens = async (userId: string): Promise<void> => {
  const client = getSupabaseServer();
  
  const { error } = await client.auth.admin.signOut(userId);

  if (error) {
    logger.error({ err: error }, 'Error revoking tokens');
    throw new Error('Failed to revoke tokens');
  }
};

export default {
  getSupabaseServer,
  getSupabaseClient,
  verifyToken,
  getProfile,
  markLogin,
  completeOnboarding,
  setLearningStyle,
  adminSetRole,
  adminListUsers,
  upsertIntegration,
  deleteIntegration,
  revokeUserTokens,
};
