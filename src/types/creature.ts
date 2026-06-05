/**
 * Core type definitions for AI Tamagotchi.
 *
 * These types are the source of truth for the entire application.
 * Every service, component, and store references these.
 */

import type { Species, EvolutionStage, EvolutionBranch, Mood } from '../constants/creatures';

// Re-export from creatures for convenience
export type { Species, EvolutionStage, EvolutionBranch, Mood };

// ──────────────────────────────────────────────────────────────
// DNA Types (per docs/creature-dna.md spec v1.0)
// ──────────────────────────────────────────────────────────────

export interface StatProfile {
  vitality: number;      // 0-255, affects max energy, resilience
  charm: number;         // 0-255, affects happiness gain from interactions
  curiosity: number;     // 0-255, affects topic variety
  gluttony: number;      // 0-255, affects hunger rate
  sociability: number;   // 0-255, affects initiation frequency
  mischief: number;      // 0-255, affects trickster behavior
}

export interface AllelePair {
  dominant: number;   // 0.0-1.0
  recessive: number;  // 0.0-1.0
}

export interface TraitAlleles {
  playfulness: AllelePair;
  empathy: AllelePair;
  bravery: AllelePair;
  patience: AllelePair;
  expressiveness: AllelePair;
  independence: AllelePair;
}

export interface TraitProfile {
  playfulness: number;      // 0.0-1.0 expressed
  empathy: number;
  bravery: number;
  patience: number;
  expressiveness: number;
  independence: number;
}

export interface AppearanceDNA {
  palette: string[];
  eyeShape: 'round' | 'almond' | 'star' | 'slit' | 'button';
  mouthShape: 'smile' | 'cat' | 'beak' | 'frown' | 'wobble';
  accessory: string | null;
  size: number;
  glowIntensity: number;
  baseASCII: string;
}

export interface MemoryGene {
  id: string;
  tag: string;              // short label: "first_hatch", "fed", "played"
  event: string;            // human-readable: "You fed Pixel for the first time"
  impact: number;           // -1.0 to 1.0
  traitAffected: string;
  mood: string;             // creature's mood at the time
  statsAtTime?: { hunger: number; happiness: number; energy: number; hygiene: number };
  timestamp: string;        // ISO datetime
}

export interface CareSummary {
  feedRatio: number;
  playRatio: number;
  cleanRatio: number;
  avgResponseTime: number;
  neglectStreakMax: number;
}

export interface CreatureDNA {
  version: '1.0';
  id: string;
  createdAt: string;
  generator: string;

  genotype: {
    species: Species;
    seed: number;
    baseStats: StatProfile;
    traitAlleles: TraitAlleles;
  };

  phenotype: {
    name: string;
    stage: EvolutionStage;
    branch: EvolutionBranch;
    expressedTraits: TraitProfile;
    appearance: AppearanceDNA;
  };

  history: {
    totalInteractions: number;
    totalDaysAlive: number;
    keyMemories: MemoryGene[];
    careSummary: CareSummary;
  };

  breeding: {
    generation: number;
    parentIds: string[];
    mutationRate: number;
  };
}

// ──────────────────────────────────────────────────────────────
// Creature State (runtime state)
// ──────────────────────────────────────────────────────────────

export interface CreaturePersonality {
  mood: Mood;
  moodIntensity: number;     // 0.0-1.0 how strongly the mood is felt
  expressedTraits: TraitProfile;
  memoryKeys: string[];       // tags of significant past events
}

export interface CreatureStats {
  hunger: number;      // 0-100, higher = hungrier
  happiness: number;   // 0-100, higher = happier
  energy: number;      // 0-100, higher = more energetic
  hygiene: number;     // 0-100, higher = cleaner
}

export interface AnimationState {
  current: 'idle' | 'bouncing' | 'spinning' | 'floating' | 'shivering';
  frame: number;       // for multi-frame animations
  lastUpdated: string; // ISO timestamp
}

export interface CreatureState {
  // Identity
  id: string;
  name: string;

  // DNA
  dna: CreatureDNA;

  // Live stats
  stats: CreatureStats;

  // Personality
  personality: CreaturePersonality;

  // Lifecycle
  stage: EvolutionStage;
  branch: EvolutionBranch;
  age: number;               // days since birth
  birthday: string;          // ISO timestamp

  // Rendering
  animation: AnimationState;

  // Metadata
  lastInteraction: string;   // ISO timestamp
  totalInteractions: number;
  isSleeping: boolean;
  isActive: boolean;
}

// ──────────────────────────────────────────────────────────────
// Conversation Types
// ──────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'creature' | 'system';
  content: string;
  timestamp: string;
  moodAtTime?: Mood;
}

export interface PromptContext {
  systemPrompt: string;
  history: ConversationMessage[];
  currentMessage: string;
  creatureState: CreatureState;
}

// ──────────────────────────────────────────────────────────────
// LLM Types
// ──────────────────────────────────────────────────────────────

export interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  url: string;
  sizeMb: number;
  minRamMb: number;
  checksumSha256: string;
  architecture: string;
  recommendedConfig: ModelConfig;
}

export interface ModelConfig {
  contextSize: number;
  threads: number;
  gpuLayers: number;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
}

export interface GenerationOptions {
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  stopSequences: string[];
}

export interface ModelInfo {
  loaded: boolean;
  modelPath: string;
  contextSize: number;
  modelSize: number;
}

// ──────────────────────────────────────────────────────────────
// Care Action Types
// ──────────────────────────────────────────────────────────────

export type CareAction = 'feed' | 'play' | 'clean' | 'heal' | 'tuck_in' | 'wake_up' | 'scold';

export interface CareActionResult {
  action: CareAction;
  success: boolean;
  statChanges: Partial<CreatureStats>;
  moodChange?: Mood;
  creatureResponse: string;
}
