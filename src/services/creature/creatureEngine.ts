/**
 * Creature Engine — Core state machine.
 *
 * This is the heart of AI Tamagotchi. Every interaction with the creature
 * flows through this engine. Pure TypeScript — no native dependencies,
 * no React, no side effects. Fully testable.
 *
 * Responsibilities:
 *   - Stat decay over time (hunger, happiness, energy, hygiene)
 *   - Care action handling (feed, play, clean, heal)
 *   - Mood calculation from stats + personality + recent events
 *   - Evolution stage and branch progression
 *   - DNA updates (memories, trait nudges, care summary)
 *   - State serialization for widget bridge
 */

import type {
  CreatureState,
  CreatureStats,
  CreaturePersonality,
  AnimationState,
  CareAction,
  CareActionResult,
  TraitProfile,
  CareSummary,
} from '../../types/creature';
import type { Species, EvolutionStage, EvolutionBranch, Mood } from '../../constants/creatures';
import {
  generateDNA,
  expressTraits,
  nudgeTraits,
  addMemory,
  updateCareSummary,
} from './dna';
import { deepClone } from '../../utils/clone';

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

/** How fast stats decay per hour of real time (approximate) */
const DECAY_RATES: Record<keyof CreatureStats, number> = {
  hunger: 5,       // +5 per hour (gets hungrier)
  happiness: 3,    // -3 per hour
  energy: 4,       // -4 per hour
  hygiene: 2,      // -2 per hour
};

/** Minimum and maximum stat values */
const STAT_MIN = 0;
const STAT_MAX = 100;

/** Thresholds for mood calculation */
const MOOD_THRESHOLDS = {
  critical: 15,    // stat below this = emergency mood
  low: 30,         // stat below this = negative mood
  high: 70,        // stat above this = positive mood
};

/** Duration of each stage in days */
const STAGE_DURATIONS: Record<EvolutionStage, number> = {
  egg: 0.5,      // 12 hours
  baby: 2,       // 2 days
  child: 5,      // 5 days
  teen: 10,      // 10 days
  adult: Infinity,
};

/** Evolution branch conditions */
interface BranchCondition {
  branch: EvolutionBranch;
  condition: (state: CreatureState) => boolean;
}

const BRANCH_CONDITIONS: BranchCondition[] = [
  {
    branch: 'angel',
    condition: (s) =>
      s.personality.expressedTraits.empathy > 0.7 &&
      s.dna.history.careSummary.neglectStreakMax < 8,
  },
  {
    branch: 'gremlin',
    condition: (s) =>
      s.dna.history.careSummary.neglectStreakMax > 24 ||
      s.personality.expressedTraits.independence > 0.8,
  },
  {
    branch: 'trickster',
    condition: (s) =>
      s.dna.genotype.baseStats.mischief > 120 &&
      s.personality.expressedTraits.playfulness > 0.65,
  },
  {
    branch: 'sage',
    condition: (s) =>
      s.totalInteractions > 100 &&
      s.personality.expressedTraits.patience > 0.7,
  },
];

// ──────────────────────────────────────────────────────────────
// Factory — create a new creature
// ──────────────────────────────────────────────────────────────

export function createCreature(
  species: Species,
  name: string,
  seed?: number,
): CreatureState {
  const dna = generateDNA(species, name, seed);
  const now = new Date().toISOString();

  return {
    id: dna.id,
    name,
    dna: addMemory(
      dna,
      'first_hatch',
      `I came into existence as ${name}`,
      0.9,
      'expressiveness',
      'content',
      { hunger: 20, happiness: 80, energy: 90, hygiene: 100 },
    ),
    stats: {
      hunger: 20,
      happiness: 80,
      energy: 90,
      hygiene: 100,
    },
    personality: {
      mood: 'content',
      moodIntensity: 0.5,
      expressedTraits: dna.phenotype.expressedTraits,
      memoryKeys: [],
    },
    stage: 'egg',
    branch: 'neutral',
    age: 0,
    birthday: now,
    animation: {
      current: 'idle',
      frame: 0,
      lastUpdated: now,
    },
    isSleeping: false,
    lastInteraction: now,
    totalInteractions: 0,
    isActive: true,
  };
}

// ──────────────────────────────────────────────────────────────
// Restore from saved state
// ──────────────────────────────────────────────────────────────

export function restoreCreature(saved: CreatureState): CreatureState {
  // Apply time-based decay since last save
  const elapsed = hoursSince(new Date(saved.lastInteraction));
  return applyDecay(saved, elapsed);
}

// ──────────────────────────────────────────────────────────────
// Stat Decay
// ──────────────────────────────────────────────────────────────

/**
 * Apply stat decay for elapsed time.
 * Hunger increases (gets hungrier). Happiness, energy, hygiene decrease.
 * Decay is non-linear: the worse a stat is, the faster it decays (neglect compounds).
 */
function applyDecay(state: CreatureState, hours: number): CreatureState {
  if (hours <= 0) return state;

  const updated = deepClone(state);

  // Apply base decay with compounding effect
  for (const stat of ['hunger', 'happiness', 'energy', 'hygiene'] as const) {
    const rate = DECAY_RATES[stat];
    const current = updated.stats[stat];

    // Compounding factor: worse stats decay faster
    const compoundingFactor = stat === 'hunger'
      ? 1 + (STAT_MAX - current) / STAT_MAX  // hunger: faster when already full? No — faster when hungry is weird. Let's reverse.
      : 1 + (STAT_MAX - current) / STAT_MAX;

    // Actually: hunger goes UP (gets hungrier) so compounding should be stronger when ALREADY hungry
    const actualFactor = stat === 'hunger'
      ? 1 + current / STAT_MAX  // hungrier → gets hungrier faster
      : 1 + (STAT_MAX - current) / STAT_MAX; // lower stat → decays faster

    const delta = rate * hours * actualFactor;

    if (stat === 'hunger') {
      updated.stats[stat] = clamp(current + delta, STAT_MIN, STAT_MAX);
    } else {
      updated.stats[stat] = clamp(current - delta, STAT_MIN, STAT_MAX);
    }
  }

  // Sleeping creatures restore energy, decay slower on other stats
  if (state.isSleeping) {
    updated.stats.energy = clamp(updated.stats.energy + 10 * hours, STAT_MIN, STAT_MAX);
    return updated;
  }

  // Recalculate mood after decay
  updated.personality.mood = calculateMood(updated);
  updated.lastInteraction = new Date().toISOString();

  return updated;
}

// ──────────────────────────────────────────────────────────────
// Care Actions
// ──────────────────────────────────────────────────────────────

/**
 * Apply a care action to the creature.
 * Returns the updated state and a creature response message.
 */
export function performCare(
  state: CreatureState,
  action: CareAction,
): { state: CreatureState; result: CareActionResult } {
  const updated = deepClone(state);
  const now = new Date().toISOString();

  const statChanges: Partial<CreatureStats> = {};
  let creatureResponse = '';
  let moodChange: Mood | undefined;

  switch (action) {
    case 'feed': {
      const fed = clamp(updated.stats.hunger - 30, STAT_MIN, STAT_MAX);
      const before = updated.stats.hunger;
      statChanges.hunger = fed - before;
      updated.stats.hunger = fed;

      if (before > 80) {
        creatureResponse = '★ munch munch ★ Thank you, I was starving!';
        moodChange = 'happy';
      } else if (before > 50) {
        creatureResponse = 'Yum! That hit the spot.';
      } else {
        creatureResponse = 'Thanks! ...but I was not that hungry. *pat pat*';
        updated.stats.happiness = clamp(updated.stats.happiness - 5, STAT_MIN, STAT_MAX);
      }

      updated.stats.happiness = clamp(updated.stats.happiness + 5, STAT_MIN, STAT_MAX);
      updated.dna = updateCareSummary(updated.dna, 'feed', 0);
      updated.dna = addMemory(updated.dna, 'fed', `You fed me when I was at ${before}% hunger`, 0.3, 'patience', moodChange || updated.personality.mood, updated.stats);
      break;
    }

    case 'play': {
      updated.stats.happiness = clamp(updated.stats.happiness + 20, STAT_MIN, STAT_MAX);
      updated.stats.energy = clamp(updated.stats.energy - 15, STAT_MIN, STAT_MAX);
      updated.stats.hunger = clamp(updated.stats.hunger + 5, STAT_MIN, STAT_MAX);

      creatureResponse = '★ ☆ ★ Whee! That was fun! Again?';
      moodChange = 'ecstatic';
      updated.personality.expressedTraits = nudgeTraits(
        updated.personality.expressedTraits,
        'playfulness',
        0.3,
      );
      updated.dna = updateCareSummary(updated.dna, 'play', 0);
      updated.dna = addMemory(updated.dna, 'played', 'We played together!', 0.4, 'playfulness', moodChange || updated.personality.mood, updated.stats);
      break;
    }

    case 'clean': {
      updated.stats.hygiene = clamp(updated.stats.hygiene + 40, STAT_MIN, STAT_MAX);
      updated.stats.happiness = clamp(updated.stats.happiness + 5, STAT_MIN, STAT_MAX);

      creatureResponse = 'Ahh, squeaky clean! ✨';
      updated.dna = updateCareSummary(updated.dna, 'clean', 0);
      break;
    }

    case 'heal': {
      if (updated.personality.mood === 'sick') {
        updated.stats.happiness = clamp(updated.stats.happiness + 30, STAT_MIN, STAT_MAX);
        updated.stats.energy = clamp(updated.stats.energy + 20, STAT_MIN, STAT_MAX);
        creatureResponse = 'I feel... better. Thank you for taking care of me. ❤️';
        moodChange = 'content';
        updated.dna = addMemory(updated.dna, 'healed_from_sickness', 'You nursed me back to health', 0.8, 'empathy', moodChange || updated.personality.mood, updated.stats);
      } else {
        creatureResponse = 'I\'m not sick! But I appreciate the check-up.';
      }
      break;
    }

    case 'tuck_in': {
      updated.isSleeping = true;
      creatureResponse = '★ zZz... Goodnight... zZz ★';
      moodChange = 'sleeping';
      break;
    }

    case 'wake_up': {
      updated.isSleeping = false;
      updated.stats.energy = clamp(updated.stats.energy + 30, STAT_MIN, STAT_MAX);
      creatureResponse = '★ yawn ★ Good morning! Did you dream about me?';
      moodChange = 'content';
      break;
    }
  }

  // Recalculate mood
  updated.personality.mood = moodChange ?? calculateMood(updated);

  // Update metadata
  updated.lastInteraction = now;
  updated.totalInteractions += 1;
  updated.isActive = true;

  // Check evolution
  updated.stage = calculateStage(updated);
  if (updated.stage !== state.stage) {
    updated.branch = determineBranch(updated);
    updated.dna.phenotype.stage = updated.stage;
    updated.dna.phenotype.branch = updated.branch;
  }

  const result: CareActionResult = {
    action,
    success: true,
    statChanges,
    moodChange,
    creatureResponse,
  };

  return { state: updated, result };
}

// ──────────────────────────────────────────────────────────────
// Mood Calculation
// ──────────────────────────────────────────────────────────────

/**
 * Calculate the creature's mood from stats, personality, and recent events.
 * Priority order: critical stats → low stats → high stats → default content.
 */
function calculateMood(state: CreatureState): Mood {
  const { hunger, happiness, energy, hygiene } = state.stats;

  // Critical states (any stat in emergency zone)
  if (hunger > 100 - MOOD_THRESHOLDS.critical) return 'hungry';
  if (happiness < MOOD_THRESHOLDS.critical) return 'sad';
  if (energy < MOOD_THRESHOLDS.critical) return 'sick';
  if (hygiene < MOOD_THRESHOLDS.critical) return 'sick';

  // Low states
  if (hunger > 100 - MOOD_THRESHOLDS.low) return 'hungry';
  if (happiness > MOOD_THRESHOLDS.high) return 'ecstatic';

  // Personality-weighted mood
  const traits = state.personality.expressedTraits;
  if (traits.playfulness > 0.8 && energy > MOOD_THRESHOLDS.high) return 'ecstatic';
  if (traits.independence < 0.2 && happiness < MOOD_THRESHOLDS.low) return 'sad';

  // Negative states
  if (happiness < MOOD_THRESHOLDS.low) return 'sad';
  if (energy < MOOD_THRESHOLDS.low) return 'bored';
  if (hygiene < MOOD_THRESHOLDS.low) return 'sad';

  // Sleep override
  if (state.isSleeping) return 'sleeping';

  // Positive states
  if (happiness > MOOD_THRESHOLDS.high) return 'happy';

  // Default
  return 'content';
}

// ──────────────────────────────────────────────────────────────
// Death Check
// ──────────────────────────────────────────────────────────────

/**
 * Determine if the creature has passed away from neglect.
 * Death occurs when two or more stats hit zero AND energy is at 0
 * for an extended period without care.
 */
export function isCreatureDead(state: CreatureState): boolean {
  // Guard against corrupted/missing stats
  if (!state?.stats) return false;
  
  // Energy at 0 is the primary death condition
  if (state.stats.energy > 0) return false;

  // Count critical stats
  const critical = [
    state.stats.energy <= 0,
    state.stats.hunger >= 100,
    state.stats.hygiene <= 0,
    state.stats.happiness <= 0,
  ].filter(Boolean).length;

  // Dead if 3+ stats are critical
  return critical >= 3;
}

// ──────────────────────────────────────────────────────────────
// Evolution
// ──────────────────────────────────────────────────────────────

/**
 * Determine the creature's evolution stage based on age.
 */
function calculateStage(state: CreatureState): EvolutionStage {
  const { age } = state;
  if (age < STAGE_DURATIONS.egg) return 'egg';
  if (age < STAGE_DURATIONS.egg + STAGE_DURATIONS.baby) return 'baby';
  if (age < STAGE_DURATIONS.egg + STAGE_DURATIONS.baby + STAGE_DURATIONS.child) return 'child';
  if (age < STAGE_DURATIONS.egg + STAGE_DURATIONS.baby + STAGE_DURATIONS.child + STAGE_DURATIONS.teen) return 'teen';
  return 'adult';
}

/**
 * Determine evolution branch based on care history and personality.
 * Checked in priority order; first match wins.
 */
function determineBranch(state: CreatureState): EvolutionBranch {
  for (const { branch, condition } of BRANCH_CONDITIONS) {
    if (condition(state)) return branch;
  }
  return 'neutral';
}

// ──────────────────────────────────────────────────────────────
// Aging (called periodically — e.g., once per hour)
// ──────────────────────────────────────────────────────────────

export function ageCreature(state: CreatureState, hours: number): CreatureState {
  const updated = deepClone(state);

  // Age in fractional days
  updated.age += hours / 24;

  // Apply stat decay for elapsed time
  const decayed = applyDecay(updated, hours);

  // Check stage progression
  const newStage = calculateStage(decayed);
  if (newStage !== state.stage) {
    decayed.stage = newStage;
    decayed.branch = determineBranch(decayed);
    decayed.dna.phenotype.stage = newStage;
    decayed.dna.phenotype.branch = decayed.branch;
    decayed.dna = addMemory(
      decayed.dna,
      `evolved_to_${newStage}`,
      `I evolved into ${newStage} stage`,
      0.6,
      'independence',
      decayed.personality.mood,
      decayed.stats,
    );
  }

  // Update DNA history
  decayed.dna.history.totalDaysAlive = Math.round(decayed.age);
  decayed.dna.history.totalInteractions = decayed.totalInteractions;

  return decayed;
}

// ──────────────────────────────────────────────────────────────
// Conversation Integration
// ──────────────────────────────────────────────────────────────

/**
 * Process the creature's response after an LLM interaction.
 * Updates personality, memory, and mood based on the conversation.
 */
export function processConversationTurn(
  state: CreatureState,
  userMessage: string,
  creatureResponse: string,
): CreatureState {
  const updated = deepClone(state);
  const now = new Date().toISOString();

  // Analyze sentiment from BOTH user message and creature response
  const userSentiment = analyzeUserSentiment(userMessage);
  const creatureSentiment = analyzeResponseSentiment(creatureResponse);

  // User sentiment has stronger effect — be kind to your creature!
  // Positive messages boost happiness, negative ones hurt
  const impact = userSentiment * 10 + creatureSentiment * 5;
  updated.stats.happiness = clamp(updated.stats.happiness + impact, STAT_MIN, STAT_MAX);

  // Track sentiment extremes as memories
  const absImpact = Math.abs(userSentiment);
  if (absImpact > 0.5) {
    const tag = userSentiment > 0 ? 'kind_words' : 'harsh_words';
    const event = userSentiment > 0
      ? `You said something really kind to me`
      : `You said something that hurt my feelings`;
    updated.dna = addMemory(
      updated.dna, tag, event,
      userSentiment * 0.8,
      userSentiment > 0 ? 'empathy' : 'bravery',
      updated.personality.mood,
      updated.stats,
    );
  }

  // Slight stat drift from conversation
  updated.stats.hunger = clamp(updated.stats.hunger + 1, STAT_MIN, STAT_MAX);
  updated.stats.energy = clamp(updated.stats.energy - 1, STAT_MIN, STAT_MAX);

  // Track as interaction
  updated.totalInteractions += 1;
  updated.lastInteraction = now;
  updated.isActive = true;

  // Recalculate mood
  updated.personality.mood = calculateMood(updated);

  return updated;
}

/**
 * Simple sentiment analysis on the USER's message.
 * Negative words hurt the creature, positive words make it happy.
 */
function analyzeUserSentiment(text: string): number {
  const lower = text.toLowerCase();

  const positiveWords = [
    'love', 'happy', 'good', 'great', 'wonderful', 'amazing', 'beautiful',
    'cute', 'sweet', 'kind', 'friend', 'best', 'thanks', 'thank',
    'awesome', 'fantastic', 'lovely', 'adorable', 'perfect',
    '❤', '😊', ':)', ':D', '★', '☆',
  ];
  const negativeWords = [
    'hate', 'bad', 'ugly', 'stupid', 'dumb', 'worst', 'terrible',
    'awful', 'die', 'worthless', 'annoying', 'useless', 'pathetic',
    'leave', 'go away', 'shut up', 'idiot', 'gross',
    ':(', '>:(', '😡', '😢',
  ];

  let score = 0;
  for (const word of positiveWords) {
    if (lower.includes(word)) score += 0.2;
  }
  for (const word of negativeWords) {
    if (lower.includes(word)) score -= 0.25; // negative words hit harder
  }

  return clamp(score, -1, 1);
}

/**
 * Simple sentiment analysis on the creature's response.
 * Not ML-based — keyword matching for MVP.
 * Returns -1.0 (very negative) to 1.0 (very positive).
 */
function analyzeResponseSentiment(text: string): number {
  const lower = text.toLowerCase();

  const positiveWords = [
    'happy', 'love', 'yay', 'fun', 'great', 'wonderful', 'amazing',
    '★', '☆', '❤', '✨', '😊', 'excited', 'whee', 'thank',
  ];
  const negativeWords = [
    'sad', 'sorry', 'miss', 'lonely', 'hungry', 'tired', 'sick',
    '⌒', '😢', 'worried', 'scared', 'please',
  ];

  let score = 0;
  for (const word of positiveWords) {
    if (lower.includes(word)) score += 0.15;
  }
  for (const word of negativeWords) {
    if (lower.includes(word)) score -= 0.15;
  }

  return clamp(score, -1, 1);
}

// ──────────────────────────────────────────────────────────────
// Widget State Export
// ──────────────────────────────────────────────────────────────

/**
 * Export a minimal state snapshot for the widget.
 * The widget doesn't need full creature state — just what it displays.
 */
export interface WidgetState {
  name: string;
  species: Species;
  stage: EvolutionStage;
  branch: EvolutionBranch;
  mood: Mood;
  moodEmoji: string;
  stats: CreatureStats;
  asciiFace: string;
  lastThought: string;
  isSleeping: boolean;
}

export function exportWidgetState(
  state: CreatureState,
  lastThought: string,
): WidgetState {
  return {
    name: state.name,
    species: state.dna.genotype.species,
    stage: state.stage,
    branch: state.branch,
    mood: state.personality.mood,
    moodEmoji: getMoodEmoji(state.personality.mood),
    stats: state.stats,
    asciiFace: '', // rendered by the ASCII renderer at display time
    lastThought,
    isSleeping: state.isSleeping,
  };
}

function getMoodEmoji(mood: Mood): string {
  const map: Record<Mood, string> = {
    ecstatic: '🤩',
    happy: '😊',
    content: '😌',
    bored: '😐',
    hungry: '🍽️',
    sad: '😢',
    angry: '😤',
    sick: '🤒',
    sleeping: '😴',
    mischief: '😏',
  };
  return map[mood] ?? '😶';
}

// ──────────────────────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hoursSince(date: Date | string): number {
  const then = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - then.getTime();
  return Math.max(0, diff / (1000 * 60 * 60));
}

// ──────────────────────────────────────────────────────────────
// Re-exports for convenience
// ──────────────────────────────────────────────────────────────

export { generateDNA, expressTraits, nudgeTraits, addMemory } from './dna';
