/**
 * Conversation Types
 */

import type { Mood } from '../constants/creatures';

export interface ConversationMessage {
  role: 'user' | 'creature' | 'system';
  content: string;
  timestamp: string;
  moodAtTime?: Mood;
}

export interface ConversationSummary {
  text: string;
  keyTopics: string[];
  messageCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}
