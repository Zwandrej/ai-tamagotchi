/**
 * Notification Engine — Decides when to nudge the user.
 *
 * Unlike classic Tamagotchi timers, this engine uses creature state
 * to decide WHEN and WHY to notify. The goal is to feel like a
 * companion reaching out, not an alarm going off.
 *
 * Pure TypeScript. Works with whatever notification system
 * (iOS push, Android notifications, widget updates) wraps it.
 */

import type { CreatureState, Mood } from '../../types/creature';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type NotificationUrgency = 'low' | 'medium' | 'high';

export interface NotificationRule {
  id: string;
  condition: (state: CreatureState, hoursSinceLastInteraction: number) => boolean;
  title: string;
  body: string;
  urgency: NotificationUrgency;
}

export interface NotificationCandidate {
  rule: NotificationRule;
  urgency: NotificationUrgency;
  title: string;
  body: string;
}

// ──────────────────────────────────────────────────────────────
// Cooldown (prevent notification spam)
// ──────────────────────────────────────────────────────────────

/** Minimum hours between notifications of the same urgency */
const COOLDOWNS: Record<NotificationUrgency, number> = {
  low: 4,
  medium: 2,
  high: 1,
};

/** Track when each urgency was last sent */
let lastSent: Record<NotificationUrgency, number> = {
  low: 0,
  medium: 0,
  high: 0,
};

function isOnCooldown(urgency: NotificationUrgency, now: number): boolean {
  const cooldownMs = COOLDOWNS[urgency] * 3600 * 1000;
  return (now - lastSent[urgency]) < cooldownMs;
}

function markSent(urgency: NotificationUrgency): void {
  lastSent[urgency] = Date.now();
}

/** Reset cooldowns (for testing) */
export function resetCooldowns(): void {
  lastSent = { low: 0, medium: 0, high: 0 };
}

// ──────────────────────────────────────────────────────────────
// Notification Rules
// ──────────────────────────────────────────────────────────────

const RULES: NotificationRule[] = [
  // ── High Urgency ──────────────────────────────
  {
    id: 'critical_hunger',
    condition: (s, h) => s.stats.hunger > 85,
    title: '🍽️ Starving!',
    body: 'Feed me please! I\'m so hungry... ★ hungy noises ★',
    urgency: 'high',
  },
  {
    id: 'critical_sadness',
    condition: (s, h) => s.stats.happiness < 15 && h > 6,
    title: '😢 Feeling lonely...',
    body: 'It\'s been a while... I miss you. Come talk to me?',
    urgency: 'high',
  },
  {
    id: 'sick',
    condition: (s, _h) => s.personality.mood === 'sick',
    title: '🤒 Not feeling well',
    body: 'I think I need some care... Everything feels wobbly.',
    urgency: 'high',
  },

  // ── Medium Urgency ────────────────────────────
  {
    id: 'hungry',
    condition: (s, _h) => s.stats.hunger > 60 && s.stats.hunger <= 85,
    title: '🍪 Getting peckish',
    body: 'Hey! A snack would be amazing right now. Just saying.',
    urgency: 'medium',
  },
  {
    id: 'bored',
    condition: (s, h) => (s.personality.mood === 'bored' || s.stats.happiness < 40) && h > 3,
    title: '🎮 Bored...',
    body: 'I\'ve been staring at the wall for a while. Want to play?',
    urgency: 'medium',
  },
  {
    id: 'neglected',
    condition: (s, h) => h > 8 && s.stats.happiness < 50,
    title: '👋 Hey stranger',
    body: 'Long time no see! I was starting to think you forgot about me.',
    urgency: 'medium',
  },
  {
    id: 'dirty',
    condition: (s, _h) => s.stats.hygiene < 30,
    title: '🫧 Um, a little help?',
    body: 'I\'m feeling a bit... fragrant. In a bad way. Bath time?',
    urgency: 'medium',
  },

  // ── Low Urgency ───────────────────────────────
  {
    id: 'evolved',
    condition: (s, _h) => s.stage !== 'egg' && s.branch !== 'neutral',
    title: '🦋 I\'ve changed!',
    body: 'Something feels different about me today... Come see!',
    urgency: 'low',
  },
  {
    id: 'idle_thought',
    condition: (_s, h) => h > 4 && h < 8,
    title: '💭 Just thinking...',
    body: 'I had the strangest thought. Want to hear it?',
    urgency: 'low',
  },
  {
    id: 'mischief_idea',
    condition: (s, _h) =>
      s.personality.mood === 'mischief' ||
      s.personality.expressedTraits.playfulness > 0.8,
    title: '😏 I have an idea...',
    body: 'What if we... Actually, you\'ll have to come find out. Hehe.',
    urgency: 'low',
  },
  {
    id: 'good_morning',
    condition: (_s, h) => {
      const hour = new Date().getHours();
      return hour >= 6 && hour <= 10 && h > 6;
    },
    title: '🌅 Good morning!',
    body: 'Rise and shine! Did you dream about me? I dreamed about snacks.',
    urgency: 'low',
  },
  {
    id: 'good_night',
    condition: (_s, h) => {
      const hour = new Date().getHours();
      return (hour >= 21 || hour <= 2) && h > 3;
    },
    title: '🌙 Sleepy time',
    body: '★ yawn ★ It\'s getting late. Tuck me in?',
    urgency: 'low',
  },
];

// ──────────────────────────────────────────────────────────────
// Engine
// ──────────────────────────────────────────────────────────────

/**
 * Check if any notification should fire.
 * Returns the highest-urgency match, or null if nothing fires.
 *
 * Rules are checked in priority order; the first non-cooldown match wins.
 * High urgency > medium > low. Within same urgency, rules order matters.
 */
export function checkNotifications(
  state: CreatureState,
): NotificationCandidate | null {
  const hoursSince = hoursSinceLastInteraction(state);

  // Sort rules by urgency priority
  const urgencyOrder: NotificationUrgency[] = ['high', 'medium', 'low'];

  for (const urgency of urgencyOrder) {
    if (isOnCooldown(urgency, Date.now())) continue;

    const rules = RULES.filter((r) => r.urgency === urgency);
    for (const rule of rules) {
      if (rule.condition(state, hoursSince)) {
        markSent(urgency);
        return { rule, urgency, title: rule.title, body: rule.body };
      }
    }
  }

  return null;
}

/**
 * Get ALL notifications that currently apply (for a "notifications inbox" view).
 * Does NOT respect cooldowns — use checkNotifications for the actual push.
 */
export function getAllActiveNotifications(
  state: CreatureState,
): NotificationCandidate[] {
  const hoursSince = hoursSinceLastInteraction(state);
  return RULES
    .filter((rule) => rule.condition(state, hoursSince))
    .map((rule) => ({ rule, urgency: rule.urgency, title: rule.title, body: rule.body }));
}

/**
 * Get a suggestion for a next interaction.
 * Used for the widget's "what should I do?" hint.
 */
export function getInteractionHint(state: CreatureState): string | null {
  const hoursSince = hoursSinceLastInteraction(state);

  // Prioritize: critical needs > moderate needs > social
  if (state.stats.hunger > 80) return 'Feed me! 🍪';
  if (state.personality.mood === 'sick') return 'I need healing... 🤒';
  if (state.stats.hygiene < 30) return 'Bath time? 🫧';
  if (state.stats.happiness < 30 && hoursSince > 4) return 'I miss you... 💬';
  if (state.stats.energy > 70 && hoursSince > 2) return 'Let\'s play! 🎮';
  if (state.personality.mood === 'bored') return 'Entertain me! ✨';
  if (hoursSince > 12) return 'You\'re back! ❤️';

  return null;
}

// ──────────────────────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────────────────────

function hoursSinceLastInteraction(state: CreatureState): number {
  const then = new Date(state.lastInteraction).getTime();
  const now = Date.now();
  return Math.max(0, (now - then) / (1000 * 60 * 60));
}
