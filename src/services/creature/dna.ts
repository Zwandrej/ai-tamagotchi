/**
 * DNA System — Creature genetic identity.
 *
 * Implements the Creature DNA Specification v1.0 (docs/creature-dna.md).
 * Handles DNA generation, export, import, validation, and the
 * expression of traits from alleles.
 */

import type {
  CreatureDNA,
  StatProfile,
  TraitAlleles,
  TraitProfile,
  AllelePair,
  AppearanceDNA,
  MemoryGene,
  CareSummary,
} from '../../types/creature';
import type { Species, EvolutionStage, EvolutionBranch } from '../../constants/creatures';
import { deepClone } from '../../utils/clone';

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const DNA_VERSION = '1.0' as const;
const MAX_MEMORIES = 5;
const MAX_DNA_SIZE_BYTES = 5 * 1024; // 5 KB

const TRAIT_NAMES = [
  'playfulness',
  'empathy',
  'bravery',
  'patience',
  'expressiveness',
  'independence',
] as const;

// Species-specific stat weights (affect random stat rolls)
const SPECIES_STAT_WEIGHTS: Record<Species, Partial<Record<keyof StatProfile, number>>> = {
  stardrop:  { charm: 1.3, curiosity: 1.1, gluttony: 0.8, mischief: 0.7 },
  voidling:  { curiosity: 1.4, mischief: 1.3, charm: 0.8, sociability: 0.9 },
};

// ──────────────────────────────────────────────────────────────
// Seeded RNG (deterministic, for reproducible DNA)
// ──────────────────────────────────────────────────────────────

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    // Mulberry32 — fast, good distribution, 32-bit state
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Gaussian-ish using Box-Muller */
  nextGaussian(mean: number, stdDev: number): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.min(1, mean + z * stdDev));
  }
}

// ──────────────────────────────────────────────────────────────
// DNA Factory — creates new DNA from scratch
// ──────────────────────────────────────────────────────────────

export function generateDNA(
  species: Species,
  name: string,
  seed?: number,
): CreatureDNA {
  const actualSeed = seed ?? randomSeed();
  const rng = new SeededRandom(actualSeed);

  const now = new Date().toISOString();

  const genotype = {
    species,
    seed: actualSeed,
    baseStats: rollStats(species, rng),
    traitAlleles: rollAlleles(rng),
  };

  const phenotype = {
    name,
    stage: 'egg' as EvolutionStage,
    branch: 'neutral' as EvolutionBranch,
    expressedTraits: expressTraits(genotype.traitAlleles),
    appearance: generateAppearance(species, 'neutral', rng),
  };

  const history = {
    totalInteractions: 0,
    totalDaysAlive: 0,
    keyMemories: [] as MemoryGene[],
    careSummary: freshCareSummary(),
  };

  const breeding = {
    generation: 0,
    parentIds: [] as string[],
    mutationRate: 0,
  };

  const dna: CreatureDNA = {
    version: DNA_VERSION,
    id: '', // computed after serialization
    createdAt: now,
    generator: `ai-tamagotchi v0.1.0`,
    genotype,
    phenotype,
    history,
    breeding,
  };

  // Compute ID from content
  dna.id = computeDNAId(dna);

  return dna;
}

// ──────────────────────────────────────────────────────────────
// Stat Rolling
// ──────────────────────────────────────────────────────────────

function rollStats(species: Species, rng: SeededRandom): StatProfile {
  const weights = SPECIES_STAT_WEIGHTS[species] ?? {};

  const roll = (trait: keyof StatProfile): number => {
    const base = rng.nextInt(80, 200);
    const weight = weights[trait] ?? 1.0;
    return Math.min(255, Math.max(0, Math.round(base * weight)));
  };

  return {
    vitality: roll('vitality'),
    charm: roll('charm'),
    curiosity: roll('curiosity'),
    gluttony: roll('gluttony'),
    sociability: roll('sociability'),
    mischief: roll('mischief'),
  };
}

// ──────────────────────────────────────────────────────────────
// Allele Rolling
// ──────────────────────────────────────────────────────────────

function rollAlleles(rng: SeededRandom): TraitAlleles {
  const rollAllelePair = (): AllelePair => {
    const a = rng.nextGaussian(0.5, 0.2);
    const b = rng.nextGaussian(0.5, 0.2);
    return {
      dominant: Math.max(a, b),
      recessive: Math.min(a, b),
    };
  };

  return {
    playfulness: rollAllelePair(),
    empathy: rollAllelePair(),
    bravery: rollAllelePair(),
    patience: rollAllelePair(),
    expressiveness: rollAllelePair(),
    independence: rollAllelePair(),
  };
}

// ──────────────────────────────────────────────────────────────
// Trait Expression (genotype → phenotype)
// ──────────────────────────────────────────────────────────────

/**
 * Express traits from alleles.
 * Simple dominance model: expressed = dominant * 0.7 + recessive * 0.3
 */
export function expressTraits(alleles: TraitAlleles): TraitProfile {
  const express = (pair: AllelePair): number => {
    return clamp(pair.dominant * 0.7 + pair.recessive * 0.3, 0, 1);
  };

  return {
    playfulness: express(alleles.playfulness),
    empathy: express(alleles.empathy),
    bravery: express(alleles.bravery),
    patience: express(alleles.patience),
    expressiveness: express(alleles.expressiveness),
    independence: express(alleles.independence),
  };
}

/**
 * Update expressed traits based on a life event.
 * An event with positive impact on a trait nudges it slightly upward.
 */
export function nudgeTraits(
  current: TraitProfile,
  traitAffected: keyof TraitProfile,
  impact: number, // -1.0 to 1.0
): TraitProfile {
  const updated = { ...current };
  const delta = impact * 0.02; // small nudge per event
  updated[traitAffected] = clamp(current[traitAffected] + delta, 0, 1);
  return updated;
}

// ──────────────────────────────────────────────────────────────
// Appearance Generation
// ──────────────────────────────────────────────────────────────

function generateAppearance(
  species: Species,
  _branch: EvolutionBranch, // reserved for branch-specific appearance changes
  rng: SeededRandom,
): AppearanceDNA {
  const palettes: Record<Species, string[][]> = {
    stardrop: [
      ['#FF6B9D', '#C44D8F', '#FFE5EC'],
      ['#FFB347', '#CC8A37', '#FFF0D4'],
      ['#87CEEB', '#5D9FBF', '#E8F4FD'],
    ],
    voidling: [
      ['#2D1B4E', '#1A0A2E', '#4A2D7A'],
      ['#1B1B2F', '#0F0F1F', '#2D2D5E'],
      ['#16213E', '#0F1629', '#1A3A5C'],
    ],
  };

  const eyeShapes: Record<Species, Array<AppearanceDNA['eyeShape']>> = {
    stardrop: ['round', 'star', 'almond'],
    voidling: ['round', 'slit', 'almond'],
  };

  const mouthShapes: Record<Species, Array<AppearanceDNA['mouthShape']>> = {
    stardrop: ['smile', 'cat', 'wobble'],
    voidling: ['smile', 'frown', 'cat'],
  };

  return {
    palette: palettes[species]![rng.nextInt(0, palettes[species]!.length - 1)]!,
    eyeShape: eyeShapes[species]![rng.nextInt(0, eyeShapes[species]!.length - 1)]!,
    mouthShape: mouthShapes[species]![rng.nextInt(0, mouthShapes[species]!.length - 1)]!,
    accessory: null, // MVP: no accessories
    size: 1.0,
    glowIntensity: species === 'voidling' ? rng.nextGaussian(0.5, 0.2) : rng.nextGaussian(0.2, 0.1),
    baseASCII: species,
  };
}

// ──────────────────────────────────────────────────────────────
// Memory Management
// ──────────────────────────────────────────────────────────────

export function addMemory(
  dna: CreatureDNA,
  tag: string,
  event: string,
  impact: number,
  traitAffected: keyof TraitProfile,
  mood: string,
  stats?: { hunger: number; happiness: number; energy: number; hygiene: number },
): CreatureDNA {
  const updated = deepClone(dna);

  const memory: MemoryGene = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    tag,
    event,
    impact: clamp(impact, -1, 1),
    traitAffected,
    mood,
    statsAtTime: stats,
    timestamp: new Date().toISOString(),
  };

  updated.history.keyMemories.push(memory);

  // Keep only the top N by impact magnitude
  updated.history.keyMemories.sort(
    (a, b) => Math.abs(b.impact) - Math.abs(a.impact),
  );
  updated.history.keyMemories = updated.history.keyMemories.slice(0, MAX_MEMORIES);

  // Recompute ID
  updated.id = computeDNAId(updated);

  return updated;
}

// ──────────────────────────────────────────────────────────────
// Care Summary Updates
// ──────────────────────────────────────────────────────────────

function freshCareSummary(): CareSummary {
  return {
    feedRatio: 1.0,
    playRatio: 1.0,
    cleanRatio: 1.0,
    avgResponseTime: 0,
    neglectStreakMax: 0,
  };
}

export function updateCareSummary(
  dna: CreatureDNA,
  action: 'feed' | 'play' | 'clean',
  responseTimeMinutes: number,
): CreatureDNA {
  const updated = deepClone(dna);
  const cs = updated.history.careSummary;

  // Simple ratio update — production would use a proper rolling average
  if (action === 'feed') cs.feedRatio = clamp(cs.feedRatio + 0.01, 0, 1);
  if (action === 'play') cs.playRatio = clamp(cs.playRatio + 0.01, 0, 1);
  if (action === 'clean') cs.cleanRatio = clamp(cs.cleanRatio + 0.01, 0, 1);

  cs.avgResponseTime = Math.round((cs.avgResponseTime + responseTimeMinutes) / 2);
  cs.neglectStreakMax = Math.max(cs.neglectStreakMax, responseTimeMinutes);

  updated.id = computeDNAId(updated);
  return updated;
}

// ──────────────────────────────────────────────────────────────
// DNA Export / Import
// ──────────────────────────────────────────────────────────────

export function exportDNA(dna: CreatureDNA): string {
  const copy = deepClone(dna);
  copy.id = computeDNAId(copy);
  return JSON.stringify(copy, null, 2);
}

export function importDNA(json: string): CreatureDNA {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new DNAValidationError('Invalid JSON');
  }

  const errors = validateDNA(parsed);
  if (errors.length > 0) {
    throw new DNAValidationError(`Validation failed: ${errors.join('; ')}`, errors);
  }

  const dna = parsed as CreatureDNA;

  // Verify checksum
  const expectedId = computeDNAId(dna);
  if (dna.id !== expectedId) {
    throw new DNAValidationError(
      `DNA integrity check failed. Expected ID ${expectedId}, got ${dna.id}`,
    );
  }

  return dna;
}

// ──────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────

export function validateDNA(obj: unknown): string[] {
  const errors: string[] = [];
  const dna = obj as Record<string, unknown>;

  if (!dna || typeof dna !== 'object') {
    return ['DNA must be an object'];
  }

  // Version
  if (dna.version !== DNA_VERSION) {
    errors.push(`Unsupported version: ${dna.version}. Expected ${DNA_VERSION}`);
  }

  // ID
  if (typeof dna.id !== 'string' || dna.id.length === 0) {
    errors.push('Missing or invalid id');
  }

  // Genotype
  const genotype = dna.genotype as Record<string, unknown> | undefined;
  if (!genotype) {
    errors.push('Missing genotype');
  } else {
    if (typeof genotype.seed !== 'number') errors.push('genotype.seed must be a number');
    if (typeof genotype.species !== 'string') errors.push('genotype.species must be a string');

    // Validate stat profile
    const stats = genotype.baseStats as Record<string, unknown> | undefined;
    if (stats) {
      const statKeys = ['vitality', 'charm', 'curiosity', 'gluttony', 'sociability', 'mischief'];
      for (const key of statKeys) {
        const val = stats[key];
        if (typeof val !== 'number' || val < 0 || val > 255) {
          errors.push(`genotype.baseStats.${key} must be 0-255`);
        }
      }
    } else {
      errors.push('Missing genotype.baseStats');
    }

    // Validate trait alleles
    const alleles = genotype.traitAlleles as Record<string, unknown> | undefined;
    if (alleles) {
      for (const trait of TRAIT_NAMES) {
        const pair = alleles[trait] as Record<string, unknown> | undefined;
        if (!pair) {
          errors.push(`Missing genotype.traitAlleles.${trait}`);
        } else {
          if (typeof pair.dominant !== 'number' || pair.dominant < 0 || pair.dominant > 1) {
            errors.push(`genotype.traitAlleles.${trait}.dominant must be 0-1`);
          }
          if (typeof pair.recessive !== 'number' || pair.recessive < 0 || pair.recessive > 1) {
            errors.push(`genotype.traitAlleles.${trait}.recessive must be 0-1`);
          }
        }
      }
    } else {
      errors.push('Missing genotype.traitAlleles');
    }
  }

  // Breeding
  const breeding = dna.breeding as Record<string, unknown> | undefined;
  if (breeding) {
    if (typeof breeding.generation !== 'number' || breeding.generation < 0) {
      errors.push('breeding.generation must be >= 0');
    }
    const parentIds = breeding.parentIds;
    if (!Array.isArray(parentIds) || (parentIds.length !== 0 && parentIds.length !== 2)) {
      errors.push('breeding.parentIds must have 0 or 2 entries');
    }
  }

  // History
  const history = dna.history as Record<string, unknown> | undefined;
  if (history) {
    const memories = history.keyMemories;
    if (Array.isArray(memories) && memories.length > MAX_MEMORIES) {
      errors.push(`history.keyMemories must have <= ${MAX_MEMORIES} entries`);
    }
  }

  return errors;
}

// ──────────────────────────────────────────────────────────────
// ID Computation (SHA256 via simple hash for MVP)
// ──────────────────────────────────────────────────────────────

/**
 * Compute a deterministic ID from DNA content.
 * MVP uses a simple djb2 hash. Production would use SHA256.
 * The 'id' field is excluded so we can verify integrity.
 */
function computeDNAId(dna: CreatureDNA): string {
  const { id: _, ...rest } = dna;
  const json = JSON.stringify(rest);
  return djb2Hash(json);
}

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ──────────────────────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────────────────────

function randomSeed(): number {
  return (Math.random() * 0xFFFFFFFF) >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ──────────────────────────────────────────────────────────────
// Errors
// ──────────────────────────────────────────────────────────────

export class DNAValidationError extends Error {
  public readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = 'DNAValidationError';
    this.errors = errors;
  }
}
