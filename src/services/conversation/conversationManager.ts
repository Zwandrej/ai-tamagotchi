/**
 * Conversation Manager — History storage, trimming, and summarization.
 *
 * Manages the conversation between the user and the creature.
 * For tiny LLMs with limited context windows (512-2048 tokens),
 * we need to:
 *   1. Keep recent messages verbatim
 *   2. Summarize older messages into a compressed context
 *   3. Maintain a running summary that fits in the remaining context budget
 *
 * Pure TypeScript. No native dependencies.
 */

import type { ConversationMessage, ConversationSummary } from '../../types/conversation';
import type { CreatureState } from '../../types/creature';
import { deepClone } from '../../utils/clone';

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

/** Maximum recent messages to keep verbatim */
const MAX_RECENT_MESSAGES = 10;

/** Maximum characters for the running summary */
const MAX_SUMMARY_CHARS = 500;

/** How many messages trigger a summarization pass */
const SUMMARIZE_EVERY_N_MESSAGES = 5;

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ConversationState {
  /** All messages (trimmed on save) */
  messages: ConversationMessage[];

  /** Running summary of older messages */
  summary: ConversationSummary | null;

  /** Total messages ever exchanged (for stats) */
  totalMessages: number;
}

// ──────────────────────────────────────────────────────────────
// Factory
// ──────────────────────────────────────────────────────────────

export function createConversation(): ConversationState {
  return {
    messages: [],
    summary: null,
    totalMessages: 0,
  };
}

// ──────────────────────────────────────────────────────────────
// Message Management
// ──────────────────────────────────────────────────────────────

/**
 * Add a message to the conversation.
 * Automatically triggers summarization if needed.
 */
export function addMessage(
  state: ConversationState,
  role: ConversationMessage['role'],
  content: string,
  creatureState?: CreatureState,
): ConversationState {
  const updated = deepClone(state);

  const message: ConversationMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
    moodAtTime: creatureState?.personality.mood,
  };

  updated.messages.push(message);
  updated.totalMessages += 1;

  // Trim if over max
  if (updated.messages.length > MAX_RECENT_MESSAGES) {
    updated.messages = trimMessages(updated.messages, MAX_RECENT_MESSAGES);
  }

  // Trigger summarization checkpoint
  if (updated.totalMessages % SUMMARIZE_EVERY_N_MESSAGES === 0) {
    updated.summary = generateSummary(updated, creatureState);
  }

  return updated;
}

/**
 * Get the context that should be inserted into the LLM prompt.
 * Returns recent messages + condensed summary of older ones.
 */
export function getPromptContext(state: ConversationState): string {
  const parts: string[] = [];

  // Add summary of older messages
  if (state.summary) {
    parts.push(formatSummary(state.summary));
  }

  // Add recent messages
  const recent = state.messages.slice(-MAX_RECENT_MESSAGES);
  for (const msg of recent) {
    const label = msg.role === 'user' ? 'Owner' : msg.role === 'creature' ? 'You' : 'System';
    parts.push(`${label}: ${msg.content}`);
  }

  return parts.join('\n');
}

/**
 * Get the recent messages array for direct injection into prompt builders.
 */
export function getRecentMessages(state: ConversationState, count: number = MAX_RECENT_MESSAGES): ConversationMessage[] {
  return state.messages.slice(-count);
}

// ──────────────────────────────────────────────────────────────
// Summarization
// ──────────────────────────────────────────────────────────────

/**
 * Generate a running summary of older messages.
 *
 * In production, this would call the LLM itself to summarize.
 * For MVP, we use a simple keyword extraction approach that
 * captures the gist of what was discussed.
 */
function generateSummary(
  state: ConversationState,
  creatureState?: CreatureState,
): ConversationSummary {
  const allMessages = state.messages;
  const summarized = allMessages.slice(0, -MAX_RECENT_MESSAGES);

  if (summarized.length === 0) {
    return {
      text: 'The conversation is just beginning.',
      keyTopics: [],
      messageCount: 0,
      dateRange: { start: '', end: '' },
    };
  }

  const keyTopics = extractTopics(summarized);
  const text = buildSummaryText(summarized, keyTopics, creatureState);

  return {
    text,
    keyTopics,
    messageCount: summarized.length,
    dateRange: {
      start: summarized[0]?.timestamp ?? '',
      end: summarized[summarized.length - 1]?.timestamp ?? '',
    },
  };
}

/**
 * Extract key topics from messages using simple keyword detection.
 * Not ML-based — keyword matching for MVP.
 */
function extractTopics(messages: ConversationMessage[]): string[] {
  const text = messages.map((m) => m.content.toLowerCase()).join(' ');

  const topicPatterns: Array<{ topic: string; keywords: string[] }> = [
    { topic: 'food', keywords: ['hungry', 'food', 'eat', 'snack', 'feed', 'meal', 'cookie', '🍪'] },
    { topic: 'play', keywords: ['play', 'game', 'fun', 'toy', 'run', 'jump', 'whee', 'ball'] },
    { topic: 'sleep', keywords: ['sleep', 'tired', 'nap', 'dream', 'bed', 'night', 'zzz'] },
    { topic: 'feelings', keywords: ['sad', 'happy', 'lonely', 'love', 'miss', 'scared', 'excited', 'worry'] },
    { topic: 'owner', keywords: ['you', 'owner', 'friend', 'together', 'us', 'we'] },
    { topic: 'curiosity', keywords: ['why', 'what', 'how', 'wonder', 'think', 'maybe'] },
    { topic: 'mischief', keywords: ['secret', 'hide', 'sneak', 'trick', 'prank', 'hehe', 'shh'] },
    { topic: 'health', keywords: ['sick', 'hurt', 'ouch', 'heal', 'better', 'clean'] },
  ];

  const matches: string[] = [];
  for (const { topic, keywords } of topicPatterns) {
    if (keywords.some((kw) => text.includes(kw))) {
      matches.push(topic);
    }
  }

  return matches.slice(0, 5); // max 5 topics
}

/**
 * Build a concise summary text from the summarized messages.
 */
function buildSummaryText(
  messages: ConversationMessage[],
  topics: string[],
  creatureState?: CreatureState,
): string {
  const userMessages = messages.filter((m) => m.role === 'user').length;
  const creatureMessages = messages.filter((m) => m.role === 'creature').length;

  let text = `Earlier: ${userMessages} messages from owner, ${creatureMessages} from creature.`;

  if (topics.length > 0) {
    text += ` Topics: ${topics.join(', ')}.`;
  }

  if (creatureState) {
    const mood = creatureState.personality.mood;
    text += ` Creature is currently ${mood}.`;
  }

  // Truncate to max
  if (text.length > MAX_SUMMARY_CHARS) {
    text = text.substring(0, MAX_SUMMARY_CHARS - 3) + '...';
  }

  return text;
}

/**
 * Format a summary for inclusion in the prompt.
 */
function formatSummary(summary: ConversationSummary): string {
  return `[Summary of earlier conversation: ${summary.text}]`;
}

// ──────────────────────────────────────────────────────────────
// Trimming
// ──────────────────────────────────────────────────────────────

/**
 * Trim messages to a maximum count, keeping the most recent.
 */
function trimMessages(messages: ConversationMessage[], max: number): ConversationMessage[] {
  return messages.slice(-max);
}

/**
 * Clear all messages and reset the conversation.
 */
export function resetConversation(): ConversationState {
  return createConversation();
}

/**
 * Estimate the token count of conversation history.
 * Rough estimate: 1 token ≈ 4 characters for English text.
 */
export function estimateTokenCount(state: ConversationState): number {
  let chars = 0;

  if (state.summary) {
    chars += state.summary.text.length;
  }

  for (const msg of state.messages) {
    chars += msg.content.length;
  }

  return Math.ceil(chars / 4);
}

/**
 * Check if the conversation fits within a given token budget.
 */
export function fitsInBudget(state: ConversationState, maxTokens: number): boolean {
  return estimateTokenCount(state) <= maxTokens * 0.8; // 80% budget for safety
}
