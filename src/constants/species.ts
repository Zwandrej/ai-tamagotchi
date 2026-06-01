/**
 * Species Configuration — Constants and growth data per species.
 *
 * Each species has unique stat weights, stage descriptions,
 * and personality voice templates. These are used by the
 * creature engine and prompt builder.
 */

import type { Species, EvolutionStage } from './creatures';
import type { StatProfile } from '../types/creature';

// ──────────────────────────────────────────────────────────────
// Species Metadata
// ──────────────────────────────────────────────────────────────

export interface SpeciesConfig {
  id: Species;
  name: string;
  description: string;
  emoji: string;
  /** Species flavor text for the prompt builder */
  voice: string;
  /** Stat weights (multiplied during DNA generation) */
  statWeights: Partial<Record<keyof StatProfile, number>>;
  /** Starting stat ranges */
  startingStats: Partial<Record<keyof StatProfile, [number, number]>>;
}

export const SPECIES: Record<Species, SpeciesConfig> = {
  stardrop: {
    id: 'stardrop',
    name: 'Stardrop',
    description: 'A soft, starry companion. Gentle, optimistic, and wears its heart on its sleeve.',
    emoji: '⭐',
    voice: 'warm, gentle, and optimistic. You sparkle when happy and dim when sad.',
    statWeights: {
      charm: 1.3,
      curiosity: 1.1,
      gluttony: 0.8,
      mischief: 0.7,
    },
    startingStats: {
      vitality: [130, 200],
      charm: [150, 230],
      curiosity: [120, 190],
    },
  },
  voidling: {
    id: 'voidling',
    name: 'Voidling',
    description: 'A shadowy mischief-maker. Curious, cheeky, and occasionally cryptic.',
    emoji: '🌑',
    voice: 'mischievous, curious, and slightly cryptic. You giggle at odd moments and ask unsettling questions in a playful way.',
    statWeights: {
      curiosity: 1.4,
      mischief: 1.3,
      charm: 0.8,
      sociability: 0.9,
    },
    startingStats: {
      curiosity: [140, 220],
      mischief: [130, 210],
      charm: [80, 150],
    },
  },
};

// ──────────────────────────────────────────────────────────────
// Stage Descriptions
// ──────────────────────────────────────────────────────────────

export interface StageInfo {
  stage: EvolutionStage;
  name: string;
  description: string;
  durationHours: number;
  /** Whether this stage can evolve to next */
  canEvolve: boolean;
}

export const STAGES: StageInfo[] = [
  {
    stage: 'egg',
    name: 'Egg',
    description: 'A tiny egg, warm to the touch. Something stirs within.',
    durationHours: 12,
    canEvolve: true,
  },
  {
    stage: 'baby',
    name: 'Baby',
    description: 'Freshly hatched. Big eyes, wobbly movements, discovering the world.',
    durationHours: 48,
    canEvolve: true,
  },
  {
    stage: 'child',
    name: 'Child',
    description: 'Growing fast. More energy, more personality. Starting to show traits.',
    durationHours: 120,
    canEvolve: true,
  },
  {
    stage: 'teen',
    name: 'Teen',
    description: 'Almost grown. Personality solidifying. Branch cues appearing.',
    durationHours: 240,
    canEvolve: true,
  },
  {
    stage: 'adult',
    name: 'Adult',
    description: 'Fully grown. Personality set. Evolution branch visible. This is who they are.',
    durationHours: Infinity,
    canEvolve: false,
  },
];

// ──────────────────────────────────────────────────────────────
// Branch Descriptions
// ──────────────────────────────────────────────────────────────

export interface BranchInfo {
  id: string;
  name: string;
  description: string;
  cue: string; // visual cue description
  trigger: string; // what causes this branch
}

export const BRANCHES: Record<string, BranchInfo> = {
  neutral: {
    id: 'neutral',
    name: 'Neutral',
    description: 'No strong branch influence. Balanced personality.',
    cue: 'Default appearance',
    trigger: 'Default — no branch conditions met.',
  },
  angel: {
    id: 'angel',
    name: 'Angel',
    description: 'Kind and caring. A gentle soul who wants the best for everyone.',
    cue: 'Tiny halo above head',
    trigger: 'High empathy + attentive care (low neglect streak).',
  },
  trickster: {
    id: 'trickster',
    name: 'Trickster',
    description: 'Playful prankster. Mischievous but never mean. Keeps you on your toes.',
    cue: 'Asymmetric/winking eye',
    trigger: 'High mischief + high playfulness.',
  },
  gremlin: {
    id: 'gremlin',
    name: 'Gremlin',
    description: 'Chaotic energy. Independent and unpredictable. Lovable troublemaker.',
    cue: 'Small horn nubs',
    trigger: 'Long neglect streaks + high independence.',
  },
  sage: {
    id: 'sage',
    name: 'Sage',
    description: 'Wise beyond their years. Thoughtful, patient, occasionally profound.',
    cue: 'Small wisdom dot/crystal',
    trigger: 'Many interactions + high patience.',
  },
};

// ──────────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────────

export function getSpeciesConfig(species: Species): SpeciesConfig {
  return SPECIES[species];
}

export function getStageInfo(stage: EvolutionStage): StageInfo {
  const info = STAGES.find((s) => s.stage === stage);
  if (!info) throw new Error(`Unknown stage: ${stage}`);
  return info;
}

export function getStageDuration(stage: EvolutionStage): number {
  return getStageInfo(stage).durationHours;
}

export function getNextStage(stage: EvolutionStage): EvolutionStage | null {
  const stages: EvolutionStage[] = ['egg', 'baby', 'child', 'teen', 'adult'];
  const idx = stages.indexOf(stage);
  if (idx === -1 || idx === stages.length - 1) return null;
  return stages[idx + 1]!;
}

export function getBranchInfo(branchId: string): BranchInfo {
  return BRANCHES[branchId] ?? BRANCHES.neutral!;
}
