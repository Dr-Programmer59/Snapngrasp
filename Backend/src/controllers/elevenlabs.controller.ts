import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { getSupabaseServer } from '../services/supabase.service';

/**
 * ElevenLabs Conversation Token Controller
 * 
 * Provides secure access to ElevenLabs conversation tokens.
 * The API key stays on the server and never reaches the mobile app.
 */

/**
 * Map voice style to ElevenLabs agent ID
 */
const getAgentIdForVoiceStyle = (voiceStyle: string): string => {
  const agentMap: Record<string, string> = {
    'Chill': process.env.ELEVENLABS_AGENT_ID_CHILL_STYLE || process.env.ELEVENLABS_AGENT_ID || '',
    'Fast Cram': process.env.ELEVENLABS_AGENT_ID_FAST_CRAM || process.env.ELEVENLABS_AGENT_ID || '',
    'Teacher-Style': process.env.ELEVENLABS_AGENT_ID_TEACHER_STYLE || process.env.ELEVENLABS_AGENT_ID || '',
  };
  
  return agentMap[voiceStyle] || process.env.ELEVENLABS_AGENT_ID || '';
};

/**
 * GET /conversation-token
 * 
 * Fetches a conversation token from ElevenLabs for the configured agent.
 * This token allows the mobile app to start a real-time WebRTC session
 * with the ElevenLabs voice agent via LiveKit.
 * Uses the user's preferred voice style to select the appropriate agent.
 */
export const getConversationToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      logger.error('Missing ELEVENLABS_API_KEY in environment');
      res.status(500).json({
        error: 'ElevenLabs configuration missing on server',
      });
      return;
    }

    // Get user's voice style preference
    let voiceStyle = 'Chill'; // Default
    if (req.user) {
      try {
        const supabase = getSupabaseServer();
        const { data: profile } = await supabase
          .from('profiles')
          .select('voice_style')
          .eq('user_id', req.user.id)
          .single();
        
        if (profile?.voice_style) {
          voiceStyle = profile.voice_style;
        }
      } catch (error) {
        logger.warn({ error }, 'Could not fetch user voice style, using default');
      }
    }

    const agentId = getAgentIdForVoiceStyle(voiceStyle);

    if (!agentId) {
      logger.error({ voiceStyle }, 'No agent ID found for voice style');
      res.status(500).json({
        error: 'ElevenLabs agent configuration missing',
      });
      return;
    }

    // Build the ElevenLabs API URL
    const url = new URL('https://api.elevenlabs.io/v1/convai/conversation/token');
    url.searchParams.set('agent_id', agentId);

    logger.info({ agentId, voiceStyle }, 'Requesting conversation token from ElevenLabs');

    // Call ElevenLabs API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, error: errorText },
        'ElevenLabs API returned error'
      );
      res.status(502).json({
        error: 'Failed to get conversation token from ElevenLabs',
        status: response.status,
      });
      return;
    }

    const data = await response.json() as { token?: string };

    if (!data.token) {
      logger.error({ data }, 'ElevenLabs response missing token field');
      res.status(502).json({
        error: 'No token in ElevenLabs response',
      });
      return;
    }

    logger.info('Successfully obtained conversation token');

    // Return the token as plain text (matches ElevenLabs documentation)
    res.send(data.token);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error in getConversationToken');
    res.status(500).json({
      error: 'Internal server error while fetching conversation token',
    });
  }
};

/**
 * GET /health
 * 
 * Health check endpoint to verify ElevenLabs integration is configured
 */
export const healthCheck = (_req: Request, res: Response): void => {
  const configured = !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID);
  
  res.json({
    ok: true,
    service: 'elevenlabs',
    configured,
  });
};
