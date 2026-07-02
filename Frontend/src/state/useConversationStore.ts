/**
 * Conversation state management for voice agent
 */

import { useState, useCallback } from 'react';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TranscriptEntry {
  id: string;
  type: 'user' | 'agent';
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface ConversationState {
  status: ConnectionStatus;
  transcripts: TranscriptEntry[];
  currentUserTranscript: string;
  currentAgentResponse: string;
  vadScore: number;
  tentativeResponse: string;
  error: string | null;
}

export const useConversationStore = () => {
  const [state, setState] = useState<ConversationState>({
    status: 'disconnected',
    transcripts: [],
    currentUserTranscript: '',
    currentAgentResponse: '',
    vadScore: 0,
    tentativeResponse: '',
    error: null,
  });

  const setStatus = useCallback((status: ConnectionStatus) => {
    setState((prev) => ({ ...prev, status, error: null }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, status: 'error', error }));
  }, []);

  const addTranscript = useCallback((entry: Omit<TranscriptEntry, 'id' | 'timestamp'>) => {
    const newEntry: TranscriptEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      transcripts: [...prev.transcripts, newEntry],
    }));
  }, []);

  const updateUserTranscript = useCallback((text: string, isFinal: boolean) => {
    setState((prev) => {
      if (isFinal) {
        // Add to transcript history
        const entry: TranscriptEntry = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'user',
          text,
          isFinal: true,
          timestamp: Date.now(),
        };
        return {
          ...prev,
          transcripts: [...prev.transcripts, entry],
          currentUserTranscript: '',
        };
      } else {
        // Update tentative transcript
        return {
          ...prev,
          currentUserTranscript: text,
        };
      }
    });
  }, []);

  const updateAgentResponse = useCallback((text: string) => {
    setState((prev) => {
      // Add to transcript history
      const entry: TranscriptEntry = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'agent',
        text,
        isFinal: true,
        timestamp: Date.now(),
      };
      return {
        ...prev,
        transcripts: [...prev.transcripts, entry],
        currentAgentResponse: '',
      };
    });
  }, []);

  const setVadScore = useCallback((score: number) => {
    setState((prev) => ({ ...prev, vadScore: score }));
  }, []);

  const setTentativeResponse = useCallback((text: string) => {
    setState((prev) => ({ ...prev, tentativeResponse: text }));
  }, []);

  const clearConversation = useCallback(() => {
    setState({
      status: 'disconnected',
      transcripts: [],
      currentUserTranscript: '',
      currentAgentResponse: '',
      vadScore: 0,
      tentativeResponse: '',
      error: null,
    });
  }, []);

  return {
    state,
    setStatus,
    setError,
    addTranscript,
    updateUserTranscript,
    updateAgentResponse,
    setVadScore,
    setTentativeResponse,
    clearConversation,
  };
};
